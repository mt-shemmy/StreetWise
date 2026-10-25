export interface Payload {
  type: 'ICMP_ECHO_REQUEST' | 'ICMP_ECHO_REPLY' | 'ARP_REQUEST' | 'ARP_REPLY';
  data?: string;
  targetIp?: string; 
}

export interface Packet {
  sourceMac: string;
  destMac: string;
  sourceIp: string;
  destIp: string;
  payload: Payload;
}

export interface Node {
  id?: string;
  receivePacket(packet: Packet, incomingPort: NetworkInterface): void;
}

export interface NetworkInterface {
  macAddress: string;
  ipAddress?: string;
  subnetMask?: string;     
  defaultGateway?: string; 
  connectedTo?: NetworkInterface;
  device: Node;
}

export function isSameSubnet(ip1: string, ip2: string, mask: string): boolean {
  const ip1Parts = ip1.split('.').map(Number);
  const ip2Parts = ip2.split('.').map(Number);
  const maskParts = mask.split('.').map(Number);

  for (let i = 0; i < 4; i++) {
    if ((ip1Parts[i]! & maskParts[i]!) !== (ip2Parts[i]! & maskParts[i]!)) {
      return false; 
    }
  }
  return true;
}
export interface AclRule {
  id: number;
  action: 'permit' | 'deny';
  protocol: 'ICMP' | 'ANY';
  sourceIp: string;
  destIp: string;
}