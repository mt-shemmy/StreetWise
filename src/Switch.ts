import type { Packet, NetworkInterface, Node } from './types.ts';

export class Switch implements Node {
  public macTable: Map<string, NetworkInterface> = new Map();
  public ports: NetworkInterface[] = [];
  public id?: string;

  constructor(portCount: number) {
    for (let i = 0; i < portCount; i++) {
      this.ports.push({ 
        macAddress: `SWITCH_PORT_${i}`,
        device: this 
      });
    }
  }

  public receivePacket(packet: Packet, incomingPort: NetworkInterface) {
    this.macTable.set(packet.sourceMac, incomingPort);
    const destinationPort = this.macTable.get(packet.destMac);

    if (destinationPort && destinationPort.connectedTo) {
      destinationPort.connectedTo.device.receivePacket(packet, destinationPort.connectedTo);
    } else {
      for (const port of this.ports) {
        if (port !== incomingPort && port.connectedTo) {
          port.connectedTo.device.receivePacket(packet, port.connectedTo);
        }
      }
    }
  }
}