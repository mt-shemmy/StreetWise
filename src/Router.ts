import { packetSniffer } from './PacketSniffer.ts';
import type { Packet, NetworkInterface, Node, AclRule, } from './types.ts';
import { isSameSubnet } from './types.ts';
export class Router implements Node {
  public interfaces: NetworkInterface[] = [];
  public arpCache: Map<string, string> = new Map();
  public pendingPackets: Packet[] = [];
  public id?: string;

  public aclRules: AclRule[] = [];
  public onTerminalOutput?: (msg: string) => void;

  constructor(portConfigs: { ip: string; mac: string; mask: string }[]) {
    for (const config of portConfigs) {
      this.interfaces.push({
        macAddress: config.mac,
        ipAddress: config.ip,
        subnetMask: config.mask,
        device: this
      });
    }
  }

  private sendOutWire(packet: Packet, outInterface: NetworkInterface) {
    if (outInterface.connectedTo) {
      const targetDevice = outInterface.connectedTo.device;
      packetSniffer.capture(packet, this.id, targetDevice.id, 'success');
      targetDevice.receivePacket(packet, outInterface.connectedTo);
    }
  }

  private checkFirewall(packet: Packet): boolean {
    if (this.aclRules.length === 0) return true;

    const isIcmp = packet.payload.type.includes('ICMP');
    const packetProtocol = isIcmp ? 'ICMP' : 'ANY';

    for (const rule of this.aclRules) {
      const matchProtocol = rule.protocol === 'ANY' || rule.protocol === packetProtocol;
      const matchSource = rule.sourceIp === 'ANY' || rule.sourceIp === packet.sourceIp;
      const matchDest = rule.destIp === 'ANY' || rule.destIp === packet.destIp;

      if (matchProtocol && matchSource && matchDest) {
        if (rule.action === 'deny') {
          this.onTerminalOutput?.(`%SEC-6-IPACCESSLOGP: list ${rule.id} denied ${packetProtocol} ${packet.sourceIp} -> ${packet.destIp}`);
          return false; // DROP
        }
        return true; 
      }
    }

    this.onTerminalOutput?.(`%SEC-6-IPACCESSLOGP: implicit deny ${packet.sourceIp} -> ${packet.destIp}`);
    return false;
  }

  public receivePacket(packet: Packet, incomingPort: NetworkInterface) {
    if (packet.payload.type === 'ARP_REQUEST') {
      if (packet.payload.targetIp === incomingPort.ipAddress) {
        console.log(`Router answering ARP on ${incomingPort.ipAddress}`);
        const arpReply: Packet = {
          sourceMac: incomingPort.macAddress,
          destMac: packet.sourceMac,
          sourceIp: incomingPort.ipAddress!,
          destIp: packet.sourceIp,
          payload: { type: 'ARP_REPLY' }
        };
        this.sendOutWire(arpReply, incomingPort);
      }
      return;
    }

    if (packet.payload.type === 'ARP_REPLY') {
      this.arpCache.set(packet.sourceIp, packet.sourceMac);
      
      this.pendingPackets = this.pendingPackets.filter(pending => {
        if (pending.destIp === packet.sourceIp) {
          pending.destMac = packet.sourceMac;
          
          const outPort = this.getInterfaceForIp(pending.destIp);
          if (outPort) {
            pending.sourceMac = outPort.macAddress;
            this.sendOutWire(pending, outPort);
          }
          return false; 
        }
        return true;
      });
      return;
    }

    if (packet.payload.type === 'ICMP_ECHO_REQUEST' || packet.payload.type === 'ICMP_ECHO_REPLY') {
      if (!this.checkFirewall(packet)) {
        return;
      }
      this.routePacket(packet);
    }

    if (!this.checkFirewall(packet)) {
      const sourceId = incomingPort.connectedTo?.device.id;
      packetSniffer.capture(packet, sourceId, this.id, 'dropped');
      return;
    }
  }

  private getInterfaceForIp(targetIp: string): NetworkInterface | undefined {
    return this.interfaces.find(intf => 
      isSameSubnet(intf.ipAddress!, targetIp, intf.subnetMask!)
    );
  }

  private routePacket(packet: Packet) {
    const outInterface = this.getInterfaceForIp(packet.destIp);

    if (!outInterface) {
      console.log(`Router drops packet to ${packet.destIp}: No route to host.`);
      return;
    }

    const knownMac = this.arpCache.get(packet.destIp);

    if (knownMac) {
      packet.sourceMac = outInterface.macAddress;
      packet.destMac = knownMac;
      this.sendOutWire(packet, outInterface);
    } else {
      this.pendingPackets.push(packet);
      
      const arpRequest: Packet = {
        sourceMac: outInterface.macAddress,
        destMac: 'FF:FF:FF:FF:FF:FF',
        sourceIp: outInterface.ipAddress!,
        destIp: '255.255.255.255',
        payload: { type: 'ARP_REQUEST', targetIp: packet.destIp }
      };
      
      console.log(`Router broadcasting ARP out of ${outInterface.ipAddress} for ${packet.destIp}`);
      this.sendOutWire(arpRequest, outInterface);
    }
  }
}