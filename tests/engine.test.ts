import { describe, it, expect, vi } from 'vitest';
import { Switch } from '../src/Switch.ts';
import { Host } from '../src/Host.ts';
import { Router } from '../src/Router.ts';
import { connectInterfaces } from '../src/Cable.ts';

describe('Layer 3 Routing and End-to-End Simulation', () => {
  it('should successfully route a ping between two different subnets', () => {
    const switch1 = new Switch(4);
    const switch2 = new Switch(4);
    
    const hostA = new Host('192.168.1.10', 'AA:AA:AA:AA:AA:AA', '255.255.255.0', '192.168.1.1');
    const hostB = new Host('192.168.2.20', 'BB:BB:BB:BB:BB:BB', '255.255.255.0', '192.168.2.1');

    const router = new Router([
      { ip: '192.168.1.1', mac: 'R1:R1:R1:R1:R1:R1', mask: '255.255.255.0' }, 
      { ip: '192.168.2.1', mac: 'R2:R2:R2:R2:R2:R2', mask: '255.255.255.0' }  
    ]);

    connectInterfaces(hostA.netInterface, switch1.ports[0]!);
    connectInterfaces(router.interfaces[0]!, switch1.ports[1]!);

    connectInterfaces(router.interfaces[1]!, switch2.ports[0]!);
    connectInterfaces(hostB.netInterface, switch2.ports[1]!);

    const spy = vi.spyOn(console, 'log');

    hostA.sendPing('192.168.2.20');

    expect(hostA.arpCache.get('192.168.1.1')).toBe('R1:R1:R1:R1:R1:R1');
    
    expect(router.arpCache.get('192.168.2.20')).toBe('BB:BB:BB:BB:BB:BB');

    expect(spy).toHaveBeenCalledWith('Host 192.168.2.20 received ICMP_ECHO_REQUEST from 192.168.1.10');
  });
});