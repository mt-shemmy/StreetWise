import { Host } from './Host';
import { Switch } from './Switch';
import { connectInterfaces } from './Cable';
import { Router } from './Router';
import type { Node as EngineNode, NetworkInterface } from './types';

class NetworkManager {
  public devices: Map<string, EngineNode> = new Map();

  constructor() {
    const hostA = new Host('192.168.1.10', 'AA:AA:AA:AA:AA:AA', '255.255.255.0', '192.168.1.1');
    const switch1 = new Switch(4);
    const hostB = new Host('192.168.2.20', 'BB:BB:BB:BB:BB:BB', '255.255.255.0', '192.168.2.1');
    const router = new Router([
      { ip: '192.168.1.1', mac: 'R1:R1:R1:R1:R1:R1', mask: '255.255.255.0' },
      { ip: '192.168.2.1', mac: 'R2:R2:R2:R2:R2:R2', mask: '255.255.255.0' }
    ]);

    this.devices.set('1', hostA);
    this.devices.set('2', switch1);
    this.devices.set('4', router);
    this.devices.set('3', hostB);
    for (const [id, device] of this.devices.entries()) {
      device.id = id;
    }
  }

  public connectNodes(sourceId: string, targetId: string) {
    const sourceDevice = this.devices.get(sourceId);
    const targetDevice = this.devices.get(targetId);

    if (!sourceDevice || !targetDevice) {
      console.error(`Cannot connect: Missing devices in engine.`);
      return;
    }

    const getEmptyPort = (device: EngineNode): NetworkInterface | undefined => {
      if (device instanceof Host) {
        return device.netInterface.connectedTo ? undefined : device.netInterface;
      } else if (device instanceof Switch) {
        return device.ports.find(port => !port.connectedTo);
      } else if (device instanceof Router) { 
        return device.interfaces.find(intf => !intf.connectedTo);
      }
      return undefined;
    };

    const sourcePort = getEmptyPort(sourceDevice);
    const targetPort = getEmptyPort(targetDevice);

    if (!sourcePort || !targetPort) {
      console.error(`Connection failed: No empty ports available.`);
      return;
    }

    connectInterfaces(sourcePort, targetPort);
    console.log(`Engine wired Node ${sourceId} to Node ${targetId}`);
  }
  public addDevice(id: string, type: 'pc' | 'switch' | 'router') {
    let newDevice: EngineNode | undefined;


    if (type === 'pc') {
      newDevice = new Host('0.0.0.0', `AA:AA:AA:AA:${id.substring(0, 5)}`, '255.255.255.0', '0.0.0.0');
    } else if (type === 'switch') {
      newDevice = new Switch(4); 
    } else if (type === 'router') {
      newDevice = new Router([
        { ip: '0.0.0.0', mac: `R1:R1:R1:R1:${id.substring(0, 5)}`, mask: '0.0.0.0' },
        { ip: '0.0.0.0', mac: `R2:R2:R2:R2:${id.substring(0, 5)}`, mask: '0.0.0.0' }
      ]);
    }

    if (newDevice) {
      newDevice.id = id;
      this.devices.set(id, newDevice);
      console.log(`Engine spawned new ${type} with ID: ${id}`);
    }
  }
}

export const networkManager = new NetworkManager();