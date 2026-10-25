import type { Packet, NetworkInterface, Payload, Node, } from './types.ts';
import { isSameSubnet } from './types.ts';
import { packetSniffer } from './PacketSniffer.ts';

export class Host implements Node {
  public netInterface: NetworkInterface;
  public arpCache: Map<string, string> = new Map();
  public pendingPackets: Packet[] = [];
  public id?: string;
  public onTerminalOutput?: (msg: string) => void;

  constructor(ip: string, mac: string, mask: string, gateway: string) {
    this.netInterface = { macAddress: mac, ipAddress: ip, subnetMask: mask, defaultGateway: gateway, device: this };
  }

  private sendOutWire(packet: Packet, outInterface: NetworkInterface = this.netInterface) {
    if (outInterface.connectedTo) {
      const targetDevice = outInterface.connectedTo.device;
      
      packetSniffer.capture(packet, this.id, targetDevice.id, 'success');
      
      targetDevice.receivePacket(packet, outInterface.connectedTo);
    }
  }

  public sendPing(targetIp: string) {
    const isLocal = isSameSubnet(this.netInterface.ipAddress!, targetIp, this.netInterface.subnetMask!);
    let nextHopIp = targetIp;
    
    if (!isLocal) {
      if (!this.netInterface.defaultGateway) {
        this.onTerminalOutput?.(`Destination host unreachable.`);
        return;
      }
      nextHopIp = this.netInterface.defaultGateway;
    }

    const knownMac = this.arpCache.get(nextHopIp);
    const pingPacket: Packet = {
      sourceMac: this.netInterface.macAddress,
      destMac: knownMac || '', 
      sourceIp: this.netInterface.ipAddress!,
      destIp: targetIp,
      payload: { type: 'ICMP_ECHO_REQUEST', data: 'ping' }
    };

    if (knownMac) {
      this.sendOutWire(pingPacket);
    } else {
      this.pendingPackets.push(pingPacket);
      const arpRequest: Packet = {
        sourceMac: this.netInterface.macAddress,
        destMac: 'FF:FF:FF:FF:FF:FF', 
        sourceIp: this.netInterface.ipAddress!,
        destIp: '255.255.255.255',    
        payload: { type: 'ARP_REQUEST', targetIp: nextHopIp }
      };
      
      this.onTerminalOutput?.(`* Broadcasting ARP to find MAC for ${nextHopIp}...`);
      this.sendOutWire(arpRequest);
    }
  }

  public receivePacket(packet: Packet, incomingPort: NetworkInterface) {
    if (packet.payload.type === 'ARP_REQUEST' && packet.payload.targetIp === this.netInterface.ipAddress) {
      const arpReply: Packet = {
        sourceMac: this.netInterface.macAddress, destMac: packet.sourceMac,
        sourceIp: this.netInterface.ipAddress!, destIp: packet.sourceIp,
        payload: { type: 'ARP_REPLY' }
      };
      this.sendOutWire(arpReply);
    }
    
    else if (packet.payload.type === 'ARP_REPLY') {
      this.arpCache.set(packet.sourceIp, packet.sourceMac);
      this.onTerminalOutput?.(`* ARP Reply received! MAC is ${packet.sourceMac}`);
      
      this.pendingPackets = this.pendingPackets.filter(pendingPacket => {
        const isLocal = isSameSubnet(this.netInterface.ipAddress!, pendingPacket.destIp, this.netInterface.subnetMask!);
        const nextHopIp = isLocal ? pendingPacket.destIp : this.netInterface.defaultGateway;

        if (nextHopIp === packet.sourceIp) {
          pendingPacket.destMac = packet.sourceMac;
          this.sendOutWire(pendingPacket);          
          return false;                             
        }
        return true; 
      });
    }

    else if (packet.payload.type === 'ICMP_ECHO_REQUEST' && packet.destIp === this.netInterface.ipAddress) {
      const replyPacket: Packet = {
        sourceMac: this.netInterface.macAddress, destMac: packet.sourceMac,
        sourceIp: this.netInterface.ipAddress!, destIp: packet.sourceIp,
        payload: { type: 'ICMP_ECHO_REPLY', data: 'reply' }
      };
      this.sendOutWire(replyPacket);
    }

    else if (packet.payload.type === 'ICMP_ECHO_REPLY' && packet.destIp === this.netInterface.ipAddress) {
      this.onTerminalOutput?.(`Reply from ${packet.sourceIp}: bytes=32 time=1ms`);
    }
  }
}