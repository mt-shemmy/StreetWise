import type { Packet } from './types';

export type CaptureEvent = {
  packet: Packet;
  sourceId?: string | undefined;
  targetId?: string | undefined;
  status: 'success' | 'dropped';
};

class Sniffer {
  public logs: CaptureEvent[] = [];
  public subscribers: ((event: CaptureEvent) => void)[] = [];

  public capture(packet: Packet, sourceId?: string, targetId?: string, status: 'success' | 'dropped' = 'success') {
    const snapshot = JSON.parse(JSON.stringify(packet));
    const event: CaptureEvent = { packet: snapshot, sourceId, targetId, status };
    
    this.logs.push(event);
    for (const callback of this.subscribers) {
      callback(event);
    }
  }

  public subscribe(callback: (event: CaptureEvent) => void) {
    this.subscribers.push(callback);
  }
}

export const packetSniffer = new Sniffer();