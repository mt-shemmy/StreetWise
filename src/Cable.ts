import type { NetworkInterface } from "./types.ts";

export function connectInterfaces(port1: NetworkInterface, port2: NetworkInterface) {
    port1.connectedTo = port2;
    port2.connectedTo = port1;
}