import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { networkManager } from '../../src/NetworkManager';
import type { AppTheme } from '../../src/theme';

type TabId = 'cli' | 'tracker' | 'commands';
type TaskId = 'ip' | 'ping' | 'acl' | 'arp' | 'route';
type Mode = 'boot' | 'idle' | 'busy';
type Dict = Record<string, unknown>;

interface AclRule { id: number; action: 'permit' | 'deny'; protocol: 'ICMP' | 'ANY'; sourceIp: string; destIp: string; }
interface EngineDeviceLike { onTerminalOutput?: ((msg: string) => void) | undefined; netInterface?: Dict | undefined; interfaces?: unknown; aclRules?: AclRule[] | undefined; sendPing?: ((targetIp: string) => void) | undefined; }
interface Geo { x: number; y: number; w: number; h: number; }
interface IfaceInfo { name: string; ip: string; mask: string; gateway: string | undefined; mac: string; up: boolean; }
interface DeviceTerminalProps { nodeId: string; nodeName: string; onClose: () => void; onIpChange?: (newIp: string) => void; theme: AppTheme; }

const HEADER_H = 46;
const MIN_W = 560;
const MIN_H = 340;

const COMMAND_PHRASES: readonly string[] = ['access-list', 'arp -a', 'clear', 'cls', 'exit', 'help', 'history', 'hostname', 'ip address', 'ipconfig', 'ping', 'show access-list', 'show ip interface brief', 'show ip route'];
const TASK_DEFS: ReadonlyArray<{ id: TaskId; title: string; hint: string; example: string }> = [
  { id: 'ip', title: 'Assign an IP Address', hint: 'Write a static configuration to the interface.', example: 'ip address 192.168.1.10 255.255.255.0 192.168.1.1' },
  { id: 'ping', title: 'Execute a successful network Ping', hint: 'Send ICMP echo requests through the engine.', example: 'ping 192.168.1.1' },
  { id: 'acl', title: 'Configure a Firewall ACL (Routers)', hint: 'Inject a stateless filter rule into the router.', example: 'access-list 10 deny ICMP 192.168.1.10 192.168.2.20' },
  { id: 'arp', title: 'Inspect the ARP cache', hint: 'See which IP-to-MAC bindings were learned.', example: 'arp -a' },
  { id: 'route', title: 'Inspect the routing table', hint: 'Review connected and static routes.', example: 'show ip route' },
];

const MANUAL: ReadonlyArray<{ cmd: string; desc: string; example: string; tag: string }> = [
  { cmd: 'ip address <ip> <mask> [gateway]', desc: 'Writes a static IP configuration to the network interface.', example: 'ip address 192.168.1.10 255.255.255.0', tag: 'CONFIG' },
  { cmd: 'ping <target_ip> [-t]', desc: 'Sends ICMP echo requests.', example: 'ping 192.168.1.1', tag: 'DIAG' },
  { cmd: 'access-list <id> permit|deny <ICMP|ANY> <src> <dest>', desc: "Injects a stateless packet-filter rule.", example: 'access-list 10 deny ICMP 192.168.1.10 192.168.2.20', tag: 'SECURITY' },
  { cmd: 'ipconfig', desc: 'Dumps adapter metrics as color-coded JSON.', example: 'ipconfig', tag: 'DIAG' },
  { cmd: 'arp -a', desc: 'Displays the ARP cache.', example: 'arp -a', tag: 'DIAG' },
  { cmd: 'show ip route', desc: 'Displays the routing table.', example: 'show ip route', tag: 'ROUTING' },
  { cmd: 'show ip interface brief', desc: 'Status summary for every interface.', example: 'show ip interface brief', tag: 'DIAG' },
  { cmd: 'show access-list', desc: 'Lists configured firewall rules.', example: 'show access-list', tag: 'SECURITY' },
];

const SHORTCUTS: ReadonlyArray<[string, string]> = [['Tab', 'Autocomplete command'], ['↑ / ↓', 'Command history'], ['Ctrl + C', 'Cancel running command'], ['Ctrl + L', 'Clear screen'], ['Ctrl + W', 'Delete previous word']];

const EMPTY_TASKS: Record<TaskId, boolean> = { ip: false, ping: false, acl: false, arp: false, route: false };
const taskStore = new Map<string, Record<TaskId, boolean>>();
const historyStore = new Map<string, string[]>();

function getHistory(id: string): string[] { let h = historyStore.get(id); if (!h) { h = []; historyStore.set(id, h); } return h; }
const paint = (code: string, s: string): string => `\x1b[${code}m${s}\x1b[0m`;
const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);

function readStr(source: unknown, keys: readonly string[]): string | undefined {
  if (!isDict(source)) return undefined;
  for (const k of keys) { const v = source[k]; if (typeof v === 'string' && v !== '') return v; if (typeof v === 'number') return String(v); }
  return undefined;
}
function findField(sources: readonly unknown[], keys: readonly string[]): unknown {
  for (const s of sources) { if (!isDict(s)) continue; for (const k of keys) { const v = s[k]; if (v !== undefined && v !== null && typeof v !== 'function') return v; } }
  return undefined;
}
function toRecords(v: unknown): Array<{ key: string | undefined; value: unknown }> {
  if (v instanceof Map) return Array.from(v.entries()).map(([k, val]) => ({ key: String(k), value: val }));
  if (Array.isArray(v)) return v.map((val) => ({ key: undefined, value: val }));
  if (isDict(v)) return Object.entries(v).map(([k, val]) => ({ key: k, value: val }));
  return [];
}
const isIpv4 = (s: string): boolean => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s);
function ipToInt(ip: string): number | null {
  if (!isIpv4(ip)) return null; const [a = 0, b = 0, c = 0, d = 0] = ip.split('.').map(Number); return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}
function intToIp(n: number): string { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
function maskPrefix(mask: string): number | null {
  const m = ipToInt(mask); if (m === null) return null; let prefix = 0; let seenZero = false;
  for (let i = 31; i >= 0; i--) { const bit = (m >>> i) & 1; if (bit === 1) { if (seenZero) return null; prefix++; } else { seenZero = true; } }
  return prefix;
}
function prefixToMask(p: number): string { return p <= 0 ? '0.0.0.0' : intToIp((0xffffffff << (32 - p)) >>> 0); }
function networkOf(ip: string, mask: string): string | null {
  const i = ipToInt(ip); const m = ipToInt(mask); if (i === null || m === null) return null; return intToIp((i & m) >>> 0);
}
function commonPrefix(items: readonly string[]): string {
  const first = items[0]; if (first === undefined) return ''; let end = first.length;
  for (const it of items) { let i = 0; while (i < end && i < it.length && it[i] === first[i]) i++; end = i; }
  return first.slice(0, end);
}
function table(headers: string[], rows: string[][]): string[] {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const fmt = (cells: string[]): string => cells.map((c, i) => c.padEnd((widths[i] ?? 0) + 2)).join('');
  return [paint('1;36', fmt(headers)), paint('90', widths.map((w) => '─'.repeat(w + 2)).join('')), ...rows.map((r) => fmt(r))];
}
function colorJson(value: unknown, depth = 0): string {
  const pad = '  '.repeat(depth + 1); const end = '  '.repeat(depth);
  if (value === null || value === undefined) return paint('35', 'null');
  if (typeof value === 'string') return paint('32', JSON.stringify(value));
  if (typeof value === 'number') return paint('33', String(value));
  if (typeof value === 'boolean') return paint('34', String(value));
  if (Array.isArray(value)) {
    if (value.length === 0) return paint('90', '[]');
    return `${paint('90', '[')}\n${value.map((v) => `${pad}${colorJson(v, depth + 1)}`).join(paint('90', ',') + '\n')}\n${end}${paint('90', ']')}`;
  }
  if (isDict(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return paint('90', '{}');
    return `${paint('90', '{')}\n${entries.map(([k, v]) => `${pad}${paint('36', JSON.stringify(k))}${paint('90', ':')} ${colorJson(v, depth + 1)}`).join(paint('90', ',') + '\n')}\n${end}${paint('90', '}')}`;
  }
  return paint('90', String(value));
}
function toIface(raw: unknown, name: string): IfaceInfo | undefined {
  if (!isDict(raw)) return undefined;
  return { name, ip: readStr(raw, ['ipAddress', 'ip']) ?? '0.0.0.0', mask: readStr(raw, ['subnetMask', 'mask']) ?? '0.0.0.0', gateway: readStr(raw, ['defaultGateway', 'gateway']), mac: readStr(raw, ['macAddress', 'mac']) ?? '--', up: Boolean(raw['connectedTo']) };
}
function collectInterfaces(engine: EngineDeviceLike | undefined): IfaceInfo[] {
  const out: IfaceInfo[] = [];
  const primary = toIface(engine?.netInterface, 'eth0'); if (primary) out.push(primary);
  const list: unknown = engine?.interfaces;
  if (Array.isArray(list)) list.forEach((raw, i) => { const info = toIface(raw, `eth${i}`); if (info) out.push(info); });
  return out;
}
interface RouteRow { code: string; network: string; prefix: number | null; via: string; iface: string; metric: string; }
function collectRoutes(engine: EngineDeviceLike | undefined): { rows: RouteRow[]; derived: boolean } {
  const raw = findField([engine], ['routingTable', 'routeTable', 'routes']);
  const rows: RouteRow[] = [];
  for (const { key, value } of toRecords(raw)) {
    const network = readStr(value, ['network', 'destination', 'dest', 'networkAddress', 'prefix']) ?? key;
    if (!network) continue;
    const mask = readStr(value, ['mask', 'subnetMask', 'netmask']);
    const via = readStr(value, ['nextHop', 'gateway', 'via', 'next_hop']);
    rows.push({ code: via && via !== '0.0.0.0' ? 'S' : 'C', network, prefix: mask ? maskPrefix(mask) : null, via: via && via !== '0.0.0.0' ? via : 'directly connected', iface: readStr(value, ['interface', 'iface', 'outInterface', 'port']) ?? '-', metric: readStr(value, ['metric', 'cost']) ?? '0' });
  }
  if (rows.length > 0) return { rows, derived: false };
  const derivedRows: RouteRow[] = [];
  for (const itf of collectInterfaces(engine)) {
    if (itf.ip === '0.0.0.0') continue;
    const net = networkOf(itf.ip, itf.mask);
    if (net) derivedRows.push({ code: 'C', network: net, prefix: maskPrefix(itf.mask), via: 'directly connected', iface: itf.name, metric: '0' });
    if (itf.gateway && itf.gateway !== '0.0.0.0') derivedRows.push({ code: 'S*', network: '0.0.0.0', prefix: 0, via: itf.gateway, iface: itf.name, metric: '1' });
  }
  return { rows: derivedRows, derived: true };
}
function buildBootLines(name: string, id: string): string[] {
  const ts = (n: number): string => paint('90', `[${n.toFixed(6).padStart(12, ' ')}]`);
  const k = (t: number, m: string): string => `${ts(t)} ${m}`;
  const ok = (m: string): string => `${paint('1;32', '[  OK  ]')} ${m}`;
  return [k(0, 'Linux version 5.15.0-streetwise (gcc 11.2.0) #1 SMP PREEMPT'), k(0.004211, 'Command line: BOOT_IMAGE=/vmlinuz root=/dev/vda1 ro quiet'), k(0.21145, 'Memory: 2048M available (14336K kernel code)'), k(0.488231, `e1000: eth0 NIC link detected (node ${id})`), ok('Reached target Local File Systems.'), ok(`Set hostname to <${name}>.`), ok('Loaded netfilter / stateless ACL module.'), ok('Started IPv4 forwarding and routing service.'), ok('Bound to simulation engine (NetworkManager).'), ok('Started Secure Shell session daemon.'), ok('Reached target Multi-User System.')];
}

function useDrag(onStart: () => void, onDrag: (dx: number, dy: number) => void) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const startRef = useRef(onStart); const dragRef = useRef(onDrag);
  startRef.current = onStart; dragRef.current = onDrag;
  const [dragging, setDragging] = useState(false);

  const bind = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>): void => {
      if (e.button !== 0) return;
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
      origin.current = { x: e.clientX, y: e.clientY }; startRef.current(); setDragging(true);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>): void => {
      const o = origin.current; if (!o) return; dragRef.current(e.clientX - o.x, e.clientY - o.y);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>): void => {
      origin.current = null; setDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onPointerCancel: (): void => { origin.current = null; setDragging(false); },
  };
  return { bind, dragging };
}

export default function DeviceTerminal(props: DeviceTerminalProps) {
  return <DeviceTerminalInner key={props.nodeId} {...props} />;
}

function DeviceTerminalInner({ nodeId, nodeName, onClose, onIpChange, theme }: DeviceTerminalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const insertRef = useRef<((text: string) => void) | null>(null);

  const onIpChangeRef = useRef(onIpChange);
  const onCloseRef = useRef(onClose);
  onIpChangeRef.current = onIpChange;
  onCloseRef.current = onClose;

  const [activeTab, setActiveTab] = useState<TabId>('cli');
  const [dims, setDims] = useState('');
  const [ipLabel, setIpLabel] = useState('—');
  const [tick, setTick] = useState(0);

  const [done, setDone] = useState<Record<TaskId, boolean>>(() => ({ ...(taskStore.get(nodeId) ?? EMPTY_TASKS) }));
  const doneRef = useRef(done);
  const markTask = useCallback((id: TaskId): void => {
    if (doneRef.current[id]) return;
    const next = { ...doneRef.current, [id]: true };
    doneRef.current = next; taskStore.set(nodeId, next); setDone(next);
  }, [nodeId]);
  
  const doneCount = TASK_DEFS.filter((t) => done[t.id]).length;
  const pct = Math.round((doneCount / TASK_DEFS.length) * 100);

  const [geo, setGeo] = useState<Geo>({ x: 60, y: 40, w: 920, h: 600 });
  const [ready, setReady] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const geoRef = useRef(geo); const maxRef = useRef(maximized); const originRef = useRef<Geo>(geo);
  geoRef.current = geo; maxRef.current = maximized;

  const bounds = useCallback((): { cw: number; ch: number } => {
    const el = overlayRef.current; return { cw: el?.clientWidth || 1200, ch: el?.clientHeight || 800 };
  }, []);
  const clampGeo = useCallback((g: Geo, cw: number, ch: number): Geo => {
    const w = clamp(g.w, MIN_W, Math.max(MIN_W, cw)); const h = clamp(g.h, MIN_H, Math.max(MIN_H, ch));
    return { w, h, x: clamp(g.x, 140 - w, cw - 140), y: clamp(g.y, 0, Math.max(0, ch - HEADER_H)) };
  }, []);

  useLayoutEffect(() => {
    const { cw, ch } = bounds(); const w = Math.min(920, Math.max(MIN_W, cw - 48)); const h = Math.min(600, Math.max(MIN_H, ch - 48));
    setGeo({ w, h, x: Math.max(12, Math.round((cw - w) / 2)), y: Math.max(12, Math.round((ch - h) / 2)) });
    setReady(true);
  }, [bounds]);

  useEffect(() => {
    const onWinResize = (): void => { const { cw, ch } = bounds(); setGeo((g) => clampGeo(g, cw, ch)); };
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, [bounds, clampGeo]);

  const snapshot = (): void => { originRef.current = geoRef.current; };
  const move = useDrag(snapshot, (dx, dy) => { if (maxRef.current) return; const { cw, ch } = bounds(); const o = originRef.current; setGeo((g) => clampGeo({ ...g, x: o.x + dx, y: o.y + dy }, cw, ch)); });
  const resizeE = useDrag(snapshot, (dx) => { const { cw, ch } = bounds(); const o = originRef.current; setGeo((g) => clampGeo({ ...g, w: Math.min(o.w + dx, cw - o.x) }, cw, ch)); });
  const resizeS = useDrag(snapshot, (_dx, dy) => { const { cw, ch } = bounds(); const o = originRef.current; setGeo((g) => clampGeo({ ...g, h: Math.min(o.h + dy, ch - o.y) }, cw, ch)); });
  const resizeSE = useDrag(snapshot, (dx, dy) => { const { cw, ch } = bounds(); const o = originRef.current; setGeo((g) => clampGeo({ ...g, w: Math.min(o.w + dx, cw - o.x), h: Math.min(o.h + dy, ch - o.y) }, cw, ch)); });
  const anyDragging = move.dragging || resizeE.dragging || resizeS.dragging || resizeSE.dragging;
  const toggleMax = (): void => { setMinimized(false); setMaximized((m) => !m); };

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const upSecs = 14 * 60 + 22 + tick;
  const uptime = [Math.floor(upSecs / 3600), Math.floor((upSecs % 3600) / 60), upSecs % 60].map((n) => String(n).padStart(2, '0')).join(':');
  const mem = 38 + ((tick * 7) % 9); const cpu = 4 + ((tick * 13) % 11);

  useEffect(() => { if (activeTab === 'cli') termRef.current?.focus(); }, [activeTab]);
  const insertCommand = (text: string): void => { setActiveTab('cli'); requestAnimationFrame(() => insertRef.current?.(text)); };

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = {
        background: theme.termBg, foreground: theme.termText, cursor: theme.accent, selectionBackground: theme.mode === 'dark' ? '#1c4149' : '#e1eff6',
        black: theme.panel, red: theme.danger, green: theme.success, yellow: '#e0a530', blue: theme.accent, magenta: '#c792ea', cyan: theme.accentBright, white: theme.termText,
      };
    }
  }, [theme]);

  useEffect(() => {
    const host = terminalRef.current;
    if (!host) return;
    const engine = networkManager.devices.get(nodeId) as unknown as EngineDeviceLike | undefined;

    const term = new Terminal({
      cursorBlink: true, cursorStyle: 'bar', fontFamily: '"JetBrains Mono","Fira Code","Consolas","Courier New",monospace',
      fontSize: 14, lineHeight: 1.25, scrollback: 2000, 
      theme: { background: theme.termBg, foreground: theme.termText, cursor: theme.accent, selectionBackground: theme.mode === 'dark' ? '#1c4149' : '#e1eff6', black: theme.panel, red: theme.danger, green: theme.success, yellow: '#e0a530', blue: theme.accent, magenta: '#c792ea', cyan: theme.accentBright, white: theme.termText },
    });
    const fit = new FitAddon(); term.loadAddon(fit); term.open(host); termRef.current = term;

    let disposed = false; const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => { const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms); timers.add(id); return id; };
    const doFit = (): void => { if (disposed || host.clientWidth === 0 || host.clientHeight === 0) return; try { fit.fit(); } catch {} };
    doFit(); setDims(`${term.cols}×${term.rows}`); term.onResize(({ cols, rows }) => setDims(`${cols}×${rows}`));
    const ro = new ResizeObserver(() => requestAnimationFrame(doFit)); ro.observe(host);

    term.attachCustomKeyEventHandler((e: KeyboardEvent): boolean => {
      if (e.type === 'keydown' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && term.hasSelection()) {
        try { void navigator.clipboard.writeText(term.getSelection()).catch(() => undefined); } catch {}
        return false;
      }
      return true;
    });

    let mode: Mode = 'boot'; let buffer = ''; let cursor = 0; let draft = '';
    const history = getHistory(nodeId); let hIdx = history.length;
    let pingTimer: ReturnType<typeof setInterval> | undefined; let pingStop: (() => void) | undefined;
    const prompt = `${paint('1;32', `root@${nodeName}`)}:${paint('1;34', '~')}$ `;

    const writeLines = (text: string): void => { for (const line of text.split(/\r?\n/)) term.writeln(line); };
    const redraw = (): void => { term.write('\r\x1b[2K' + prompt + buffer); const back = buffer.length - cursor; if (back > 0) term.write(`\x1b[${back}D`); };
    const showPrompt = (): void => { mode = 'idle'; buffer = ''; cursor = 0; draft = ''; hIdx = history.length; term.write(prompt); };
    const err = (msg: string): void => term.writeln(`${paint('31', '[ERROR]')} ${msg}`);
    const good = (msg: string): void => term.writeln(`${paint('32', '[OK]')} ${msg}`);

    const evaluate = (): void => {
      const ifaces = collectInterfaces(engine); const first = ifaces[0];
      setIpLabel(first && first.ip !== '0.0.0.0' ? first.ip : 'unassigned');
      const ip = readStr(engine?.netInterface, ['ipAddress']);
      if (ip && ip !== '0.0.0.0') markTask('ip');
      if (engine?.aclRules && engine.aclRules.length > 0) markTask('acl');
    };
    const finishCommand = (): void => { mode = 'busy'; later(() => { evaluate(); showPrompt(); }, 40); };

    if (engine) {
      engine.onTerminalOutput = (msg: string): void => {
        if (disposed) return;
        if (mode === 'idle') { term.write('\r\x1b[2K'); writeLines(msg); redraw(); } else { writeLines(msg); }
      };
    }

    const cmdIpAddress = (parts: string[]): void => {
      const intf = engine?.netInterface; const usage = 'Usage: ip address <ip> <mask|/prefix> [gateway]'; const ipArg = parts[2];
      if (!intf) { err('This device has no configurable netInterface.'); return; }
      if (!ipArg) { err(usage); return; }
      let ip = ipArg; let maskArg: string | undefined = parts[3]; let gwArg: string | undefined = parts[4];
      const slash = ipArg.indexOf('/');
      if (slash > 0) {
        ip = ipArg.slice(0, slash); const p = Number(ipArg.slice(slash + 1));
        if (!Number.isInteger(p) || p < 0 || p > 32) { err('Invalid prefix length (0-32).'); return; }
        maskArg = prefixToMask(p); gwArg = parts[3];
      }
      if (!maskArg) { err(usage); return; }
      if (!isIpv4(ip)) { err(`Invalid IPv4 address: ${ip}`); return; }
      if (maskPrefix(maskArg) === null) { err(`Invalid subnet mask: ${maskArg}`); return; }
      if (gwArg !== undefined && !isIpv4(gwArg)) { err(`Invalid gateway: ${gwArg}`); return; }
      intf['ipAddress'] = ip; intf['subnetMask'] = maskArg; if (gwArg !== undefined) intf['defaultGateway'] = gwArg;
      good(`Interface UP: ${ip} / ${maskArg}`); onIpChangeRef.current?.(ip);
    };

    const cmdAccessList = (parts: string[]): void => {
      const usage = 'Routers only. Usage: access-list <id> permit|deny ICMP|ANY <src> <dest>'; const rules = engine?.aclRules;
      if (parts.length !== 6 || rules === undefined) { err(usage); return; }
      const [, idRaw, actionRaw, protoRaw, src, dst] = parts;
      const id = Number(idRaw); const action = actionRaw?.toLowerCase(); const proto = protoRaw?.toUpperCase();
      if (!Number.isInteger(id) || id < 0) { err('Rule id must be a non-negative integer.'); return; }
      if (action !== 'permit' && action !== 'deny') { err(`Action must be permit or deny. ${usage}`); return; }
      if (proto !== 'ICMP' && proto !== 'ANY') { err(`Protocol must be ICMP or ANY. ${usage}`); return; }
      if (!src || !dst) { err(usage); return; }
      const rule: AclRule = { id, action, protocol: proto, sourceIp: src, destIp: dst };
      const existing = rules.findIndex((r) => r.id === id);
      if (existing >= 0) { rules[existing] = rule; good(`Firewall rule ${id} replaced in memory.`); } else { rules.push(rule); good(`Firewall rule ${id} applied to memory.`); }
    };

    const cmdIpconfig = (): void => {
      const ifaces = collectInterfaces(engine);
      writeLines(colorJson({ hostname: nodeName, interfaces: ifaces.map((i) => ({ name: i.name, status: i.up ? 'UP' : 'DOWN', mac: i.mac, ipv4: { address: i.ip, netmask: i.mask, prefix: maskPrefix(i.mask), gateway: i.gateway ?? null } })) }));
    };

    const cmdArp = (): void => {
      markTask('arp'); const raw = findField([engine, engine?.netInterface], ['arpTable', 'arpCache', 'arp']);
      const rows = toRecords(raw).map(({ key, value }): string[] => {
        if (typeof value === 'string') return [key ?? '?', value, 'dynamic'];
        return [readStr(value, ['ip', 'ipAddress', 'address']) ?? key ?? '?', readStr(value, ['mac', 'macAddress', 'hwAddress']) ?? '?', readStr(value, ['type']) ?? 'dynamic'];
      });
      const own = collectInterfaces(engine)[0]; if (own) term.writeln(paint('90', `Interface: ${own.ip} --- ${own.mac}`));
      if (rows.length === 0) { term.writeln(paint('33', 'No ARP entries found. Send traffic (e.g. ping) to populate the cache.')); return; }
      writeLines(table(['Internet Address', 'Physical Address', 'Type'], rows).join('\n'));
    };

    const cmdRoute = (): void => {
      markTask('route'); const { rows, derived } = collectRoutes(engine);
      term.writeln(paint('90', 'Codes: C - connected, S - static, * - candidate default'));
      if (rows.length === 0) { term.writeln(paint('33', 'Routing table is empty. Assign an IP address first.')); return; }
      const dflt = rows.find((r) => r.code === 'S*');
      term.writeln(dflt ? `Gateway of last resort is ${paint('1;36', dflt.via)} to network 0.0.0.0` : 'Gateway of last resort is not set'); term.writeln('');
      writeLines(table(['Code', 'Network', 'Next Hop', 'Interface', 'Metric'], rows.map((r): string[] => [r.code, r.prefix === null ? r.network : `${r.network}/${r.prefix}`, r.via, r.iface, r.metric])).join('\n'));
      if (derived) term.writeln(paint('90', '\n(derived from interface configuration)'));
    };

    const cmdPing = (parts: string[]): boolean => {
      const target = parts[1]; const continuous = parts.slice(2).includes('-t');
      if (!target || !isIpv4(target)) { err('Invalid IP. Usage: ping <ip> [-t]'); return false; }
      if (!engine?.sendPing) { err('This device cannot originate ICMP traffic.'); return false; }
      const total = continuous ? Number.POSITIVE_INFINITY : 4; let sent = 0; let stopped = false;
      term.writeln(`Pinging ${target} with 32 bytes of data...${continuous ? paint('90', '  (Ctrl+C to stop)') : ''}`);
      mode = 'busy'; markTask('ping');
      const send = (): void => { sent++; try { engine.sendPing?.(target); } catch (e) { err(e instanceof Error ? e.message : 'sendPing failed.'); } };
      const stop = (interrupted: boolean): void => {
        if (stopped) return; stopped = true; if (pingTimer !== undefined) { clearInterval(pingTimer); pingTimer = undefined; } pingStop = undefined;
        if (interrupted) term.write('^C\r\n'); term.writeln(''); term.writeln(paint('1', `--- ${target} ping statistics ---`));
        term.writeln(`${sent} echo request${sent === 1 ? '' : 's'} sent${interrupted ? paint('33', ' (interrupted)') : ''}`); finishCommand();
      };
      pingStop = () => stop(true); send();
      pingTimer = setInterval(() => { if (sent >= total) { if (pingTimer !== undefined) clearInterval(pingTimer); pingTimer = undefined; later(() => stop(false), 1200); return; } send(); }, 1000);
      return true;
    };

    const runCommand = (raw: string): void => {
      const cmd = raw.trim();
      if (!cmd) { showPrompt(); return; }
      if (history[history.length - 1] !== cmd) { history.push(cmd); if (history.length > 200) history.shift(); }
      const parts = cmd.split(/\s+/); const base = (parts[0] ?? '').toLowerCase(); const sub = (parts[1] ?? '').toLowerCase(); const phrase = parts.map((p) => p.toLowerCase()).join(' ');

      if (base === 'ip' && sub === 'address') cmdIpAddress(parts); else if (base === 'access-list') cmdAccessList(parts); else if (base === 'ping') { if (cmdPing(parts)) return; } 
      else if (base === 'ipconfig') cmdIpconfig(); else if (base === 'arp') { if (sub === '-a') cmdArp(); else err('Usage: arp -a'); } else if (phrase === 'show ip route') cmdRoute();
      else if (phrase === 'show ip interface brief') {
        const ifaces = collectInterfaces(engine);
        if (ifaces.length === 0) { term.writeln(paint('33', 'No IP interfaces on this device.')); return; }
        writeLines(table(['Interface', 'IP-Address', 'Mask', 'Status'], ifaces.map((i): string[] => [i.name, i.ip, i.mask, i.up ? paint('32', 'up') : paint('31', 'down')])).join('\n'));
      }
      else if (phrase === 'show access-list') {
        const rules = engine?.aclRules;
        if (rules === undefined) { err('Routers only.'); return; }
        if (rules.length === 0) { term.writeln(paint('33', 'No access-list rules configured.')); return; }
        writeLines(table(['Seq', 'ID', 'Action', 'Proto', 'Source', 'Destination'], rules.map((r, i): string[] => [String(i + 1), String(r.id), r.action === 'permit' ? paint('32', 'permit') : paint('31', 'deny'), r.protocol, r.sourceIp, r.destIp])).join('\n'));
      }
      else if (base === 'help' || base === '?') {
        const rows = MANUAL.map((m): string[] => [m.cmd, m.desc.split('. ')[0] ?? m.desc]);
        rows.push(['history', 'Show command history'], ['hostname', 'Print device name'], ['clear | cls', 'Clear the screen (Ctrl+L)'], ['exit', 'Close this session']);
        for (const line of table(['Command', 'Description'], rows)) term.writeln(line);
      }
      else if (base === 'hostname') term.writeln(nodeName); else if (base === 'history') history.forEach((h, i) => term.writeln(`${paint('90', String(i + 1).padStart(4, ' '))}  ${h}`));
      else if (base === 'clear' || base === 'cls') term.write('\x1b[2J\x1b[3J\x1b[H'); else if (base === 'exit') { onCloseRef.current(); return; } 
      else {
        const guess = Array.from(new Set(COMMAND_PHRASES.map((p) => p.split(' ')[0] ?? ''))).find((b) => b !== '' && base.length >= 2 && b.startsWith(base.slice(0, 2)));
        term.writeln(`${paint('31', '% Unknown command:')} ${cmd}${guess ? paint('90', `  — did you mean "${guess}"? Type help.`) : paint('90', '  — type help.')}`);
      }
      finishCommand();
    };

    const histUp = (): void => { if (hIdx <= 0) return; if (hIdx === history.length) draft = buffer; hIdx--; buffer = history[hIdx] ?? ''; cursor = buffer.length; redraw(); };
    const histDown = (): void => { if (hIdx >= history.length) return; hIdx++; buffer = hIdx === history.length ? draft : history[hIdx] ?? ''; cursor = buffer.length; redraw(); };
    const complete = (): void => {
      const before = buffer.slice(0, cursor); const after = buffer.slice(cursor); const trailing = /\s$/.test(before); const trimmed = before.trim();
      const toks = trimmed.length > 0 ? trimmed.split(/\s+/) : []; const prior = trailing ? toks : toks.slice(0, -1); const current = (trailing ? '' : toks[toks.length - 1] ?? '').toLowerCase(); const n = prior.length;
      const next = new Set<string>();
      for (const p of COMMAND_PHRASES) {
        const pt = p.split(' '); if (pt.length <= n) continue; if (!prior.every((t, i) => pt[i] === t.toLowerCase())) continue;
        const cand = pt[n]; if (cand !== undefined && cand.startsWith(current)) next.add(cand);
      }
      const matches = Array.from(next).sort();
      if (matches.length === 0) { term.write('\x07'); return; }
      const head = prior.length > 0 ? prior.join(' ') + ' ' : '';
      if (matches.length === 1) { const completed = `${head}${matches[0] ?? ''} `; buffer = completed + after; cursor = completed.length; redraw(); return; }
      const common = commonPrefix(matches);
      if (common.length > current.length) { const completed = head + common; buffer = completed + after; cursor = completed.length; redraw(); return; }
      term.write('\r\n' + matches.map((m) => paint('36', m)).join('   ') + '\r\n'); redraw();
    };

    const insertText = (ch: string): void => { if (cursor === buffer.length) { buffer += ch; cursor += ch.length; term.write(ch); } else { buffer = buffer.slice(0, cursor) + ch + buffer.slice(cursor); cursor += ch.length; redraw(); } };
    const feed = (ch: string): void => {
      if (mode !== 'idle') return; const code = ch.charCodeAt(0);
      switch (ch) {
        case '\r': case '\n': { term.write('\r\n'); const line = buffer; buffer = ''; cursor = 0; mode = 'busy'; runCommand(line); return; }
        case '\x7f': case '\b': if (cursor > 0) { buffer = buffer.slice(0, cursor - 1) + buffer.slice(cursor); cursor--; redraw(); } return;
        case '\t': complete(); return;
        case '\x03': term.write('^C\r\n'); showPrompt(); return;
        case '\x0c': term.write('\x1b[2J\x1b[3J\x1b[H'); redraw(); return;
        case '\x15': buffer = buffer.slice(cursor); cursor = 0; redraw(); return;
        case '\x0b': buffer = buffer.slice(0, cursor); redraw(); return;
        case '\x17': { const head = buffer.slice(0, cursor).replace(/\s+$/, ''); const cut = head.lastIndexOf(' ') + 1; buffer = buffer.slice(0, cut) + buffer.slice(cursor); cursor = cut; redraw(); return; }
        case '\x01': cursor = 0; redraw(); return;
        case '\x05': cursor = buffer.length; redraw(); return;
        default: if (code >= 32 && code !== 127) insertText(ch);
      }
    };

    const bootLines = buildBootLines(nodeName, nodeId);
    const stepMs = Math.max(20, Math.floor(1500 / bootLines.length));
    let bootIdx = 0; let bootTimer: ReturnType<typeof setTimeout> | undefined;
    const finishBoot = (): void => {
      if (bootTimer !== undefined) clearTimeout(bootTimer);
      while (bootIdx < bootLines.length) term.writeln(bootLines[bootIdx++] ?? '');
      term.writeln(''); term.writeln(paint('1;32', 'Streetwise OS Kernel v2.0.4 — Secure Shell'));
      term.writeln(`Type ${paint('33', 'help')} for commands · ${paint('33', 'Tab')} autocompletes · ${paint('33', '↑/↓')} history · ${paint('33', 'Ctrl+C')} cancel · ${paint('33', 'Ctrl+L')} clear`);
      term.writeln(''); evaluate(); showPrompt();
    };
    const bootStep = (): void => { if (bootIdx < bootLines.length) { term.writeln(bootLines[bootIdx++] ?? ''); bootTimer = later(bootStep, stepMs); } else { finishBoot(); } };
    term.writeln(paint('90', 'Press Ctrl+C to skip boot.')); bootStep();

    term.onData((data: string): void => {
      if (mode === 'boot') { if (data === '\x03') finishBoot(); return; }
      if (mode === 'busy') { if (data === '\x03') pingStop?.(); return; }
      switch (data) {
        case '\x1b[A': histUp(); return; case '\x1b[B': histDown(); return;
        case '\x1b[C': if (cursor < buffer.length) { cursor++; term.write('\x1b[C'); } return;
        case '\x1b[D': if (cursor > 0) { cursor--; term.write('\x1b[D'); } return;
        case '\x1b[H': case '\x1bOH': case '\x1b[1~': cursor = 0; redraw(); return;
        case '\x1b[F': case '\x1bOF': case '\x1b[4~': cursor = buffer.length; redraw(); return;
        case '\x1b[3~': if (cursor < buffer.length) { buffer = buffer.slice(0, cursor) + buffer.slice(cursor + 1); redraw(); } return;
        default: if (data.startsWith('\x1b')) return; for (const ch of Array.from(data)) feed(ch);
      }
    });
    insertRef.current = (text: string): void => { if (mode !== 'idle') return; buffer = text; cursor = text.length; redraw(); term.focus(); };

    return () => {
      disposed = true; ro.disconnect(); timers.forEach((t) => clearTimeout(t)); if (pingTimer !== undefined) clearInterval(pingTimer);
      if (engine) engine.onTerminalOutput = undefined; insertRef.current = null; termRef.current = null; term.dispose();
    };
  }, [nodeId, nodeName, markTask]);

  const tabs: ReadonlyArray<{ id: TabId; icon: string; label: string; badge?: string }> = [
    { id: 'cli', icon: '>_', label: 'Terminal' },
    { id: 'tracker', icon: '◎', label: 'Lab Objectives', badge: `${doneCount}/${TASK_DEFS.length}` },
    { id: 'commands', icon: '≡', label: 'Command Manual' },
  ];

  const winStyle: CSSProperties = maximized ? { left: 0, top: 0, width: '100%', height: '100%', borderRadius: 0 } : { left: geo.x, top: geo.y, width: geo.w, height: minimized ? HEADER_H + 2 : geo.h };
  const stopProp = (e: React.SyntheticEvent): void => e.stopPropagation();
  const showChrome = !minimized;

  const DT_CSS = `
  .dt-tab { color: ${theme.muted}; }
  .dt-tab:hover { color: ${theme.text}; background: ${theme.mode === 'dark' ? 'rgba(148,163,184,.06)' : 'rgba(0,0,0,0.03)'}; }
  .dt-tab.active { color: ${theme.accent}; }
  .dt-tab.active::after { background: ${theme.accent}; box-shadow: 0 0 10px ${theme.accent}; }
  .dt-badge { color: ${theme.accent}; background: ${theme.mode === 'dark' ? 'rgba(87,201,191,.14)' : 'rgba(131,188,255,0.14)'}; }
  .dt-btn { background: ${theme.panel}; border: 1px solid ${theme.borderStrong}; color: ${theme.accent}; }
  .dt-btn:hover { background: ${theme.panel2}; border-color: ${theme.accent}; }
  .dt-card:hover { border-color: ${theme.borderStrong} !important; }
  .dt-scroll::-webkit-scrollbar-thumb { background: ${theme.borderStrong}; }
  .dt-scroll::-webkit-scrollbar-thumb:hover { background: ${theme.muted}; }
  .dt-kbd { background: ${theme.bg}; border: 1px solid ${theme.border}; color: ${theme.text}; }
  @keyframes dt-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${theme.accent}80; }
    50% { opacity: 0.6; box-shadow: 0 0 0 5px ${theme.accent}00; }
  }
  `;

  return (
    <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000, overflow: 'hidden' }}>
      <style>{DT_CSS}</style>

      <div className={`dt-window${anyDragging ? ' dt-busy' : ''}`} style={{ position: 'absolute', display: 'flex', flexDirection: 'column', backgroundColor: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden', pointerEvents: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(87,201,191,0.08), 0 0 40px rgba(87,201,191,0.06)', color: theme.text, ...winStyle, visibility: ready ? 'visible' : 'hidden' }}>
        <div {...move.bind} onDoubleClick={toggleMax} style={{ height: HEADER_H, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: `linear-gradient(180deg, ${theme.panel2} 0%, ${theme.panel} 100%)`, borderBottom: `1px solid ${theme.border}`, userSelect: 'none', touchAction: 'none', cursor: maximized ? 'default' : move.dragging ? 'grabbing' : 'grab' }}>
          <div className="dt-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', width: 120 }}>
            <button className="dt-dot" title="Close" style={{ width: 13, height: 13, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', fontSize: 10, fontWeight: 900, lineHeight: 1, background: theme.danger }} onPointerDown={stopProp} onDoubleClick={stopProp} onClick={onClose}><span>×</span></button>
            <button className="dt-dot" title="Minimize" style={{ width: 13, height: 13, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', fontSize: 10, fontWeight: 900, lineHeight: 1, background: '#e0a530' }} onPointerDown={stopProp} onDoubleClick={stopProp} onClick={() => setMinimized((m) => !m)}><span>–</span></button>
            <button className="dt-dot" title="Maximize" style={{ width: 13, height: 13, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', fontSize: 10, fontWeight: 900, lineHeight: 1, background: theme.success }} onPointerDown={stopProp} onDoubleClick={stopProp} onClick={toggleMax}><span>+</span></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 700, letterSpacing: 1, color: theme.muted, textTransform: 'uppercase' }}><span className="dt-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: theme.success }} /><span style={{ color: theme.text }}>{nodeName}</span><span style={{ color: theme.muted, fontWeight: 500 }}>• Admin Session</span></div>
          <div style={{ display: 'flex', gap: 8, width: 240, justifyContent: 'flex-end' }}><span style={{ fontSize: 10.5, fontFamily: '"Consolas","Courier New",monospace', color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`, padding: '3px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>UP {uptime}</span><span style={{ fontSize: 10.5, fontFamily: '"Consolas","Courier New",monospace', color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`, padding: '3px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>CPU {cpu}%</span><span style={{ fontSize: 10.5, fontFamily: '"Consolas","Courier New",monospace', color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`, padding: '3px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>MEM {mem}%</span></div>
        </div>

        <div style={{ flex: 'none', gap: 2, padding: '0 10px', background: theme.panel2, borderBottom: `1px solid ${theme.border}`, display: showChrome ? 'flex' : 'none' }} role="tablist">
          {tabs.map((tab) => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={`dt-tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span style={{ fontFamily: 'Consolas,monospace', fontSize: 12 }}>{tab.icon}</span>{tab.label}{tab.badge && <span className="dt-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1, minHeight: 0, background: theme.bg, display: showChrome ? 'block' : 'none' }}>
          <div style={{ position: 'absolute', inset: 0, padding: '10px 6px 6px 14px', visibility: activeTab === 'cli' ? 'visible' : 'hidden', pointerEvents: activeTab === 'cli' ? 'auto' : 'none' }} onClick={() => termRef.current?.focus()}>
            <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 1px, transparent 1px, transparent 3px)' }} />
          </div>

          {activeTab === 'tracker' && (
            <div className="dt-scroll" style={{ position: 'absolute', inset: 0, padding: '28px 32px', overflowY: 'auto', background: `radial-gradient(1200px 400px at 100% -10%, ${theme.accent}15, transparent), ${theme.bg}` }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 22, letterSpacing: -0.4, color: theme.text }}>System Diagnostics Tracker</h3>
              <p style={{ margin: '0 0 22px 0', color: theme.muted, fontSize: 13, lineHeight: 1.5 }}>The engine evaluates your hardware configuration in real time. Progress is saved per device.</p>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.muted, marginBottom: 8, fontFamily: 'Consolas,monospace' }}>
                  <span>OBJECTIVES {doneCount}/{TASK_DEFS.length}</span><span style={{ color: theme.success }}>{pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: theme.panel2, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${theme.accentBright}, ${theme.success})`, boxShadow: `0 0 12px ${theme.success}`, transition: 'width .5s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {TASK_DEFS.map((task, i) => {
                  const ok = done[task.id];
                  return (
                    <div key={task.id} className="dt-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', background: ok ? `linear-gradient(90deg, ${theme.accentBright}15, ${theme.accentBright}05)` : theme.panel2, border: `1px solid ${ok ? theme.success : theme.border}`, borderRadius: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${ok ? theme.success : theme.borderStrong}`, background: ok ? theme.success : 'transparent', color: ok ? theme.bg : theme.muted, fontWeight: 800, fontSize: 13, fontFamily: 'Consolas,monospace' }}>{ok ? '✓' : i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 700, color: ok ? theme.success : theme.text }}>{task.title}</div><div style={{ fontSize: 12, color: theme.muted, marginTop: 3 }}>{task.hint}</div></div>
                      {ok ? <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: theme.success, background: `${theme.success}20`, padding: '4px 9px', borderRadius: 5 }}>VERIFIED</span> : <button className="dt-btn" onClick={() => insertCommand(task.example)}>Try ▸</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="dt-scroll" style={{ position: 'absolute', inset: 0, padding: '28px 32px', overflowY: 'auto', background: `radial-gradient(1200px 400px at 100% -10%, ${theme.accent}15, transparent), ${theme.bg}` }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 22, letterSpacing: -0.4, color: theme.text }}>Engine Syntax Reference</h3>
              <p style={{ margin: '0 0 22px 0', color: theme.muted, fontSize: 13, lineHeight: 1.5 }}>Click “Insert” to drop an example into the terminal. Tab autocompletes every command below.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MANUAL.map((item) => (
                  <div key={item.cmd} className="dt-card" style={{ background: theme.panel2, border: `1px solid ${theme.border}`, borderLeft: `4px solid ${theme.accent}`, borderRadius: 8, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><code style={{ color: theme.accent, fontSize: 13.5, fontWeight: 700, fontFamily: 'Consolas,monospace' }}>{item.cmd}</code><span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1, color: theme.accentBright, background: `${theme.accentBright}20`, padding: '2px 7px', borderRadius: 4 }}>{item.tag}</span></div>
                      <p style={{ margin: '8px 0 0 0', color: theme.muted, fontSize: 12.5, lineHeight: 1.55 }}>{item.desc}</p>
                    </div>
                    <button className="dt-btn" onClick={() => insertCommand(item.example)}>Insert</button>
                  </div>
                ))}
              </div>
              <h4 style={{ margin: '30px 0 12px 0', fontSize: 14, color: theme.text, letterSpacing: 0.5 }}>KEYBOARD SHORTCUTS</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {SHORTCUTS.map(([k, d]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: theme.panel2, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12.5, color: theme.muted }}><span>{d}</span><span className="dt-kbd">{k}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: showChrome ? 'flex' : 'none', flex: 'none', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', height: 26, background: theme.bg, borderTop: `1px solid ${theme.border}`, fontSize: 11, fontFamily: '"Consolas","Courier New",monospace', color: theme.muted }}>
          <div style={{ display: 'flex', gap: 16 }}><span style={{ color: theme.success }}>● CONNECTED</span><span>{nodeName}</span><span>IP {ipLabel}</span></div>
          <div style={{ display: 'flex', gap: 16 }}><span>OBJ {doneCount}/{TASK_DEFS.length}</span><span>{dims}</span><span>UTF-8</span></div>
        </div>

        {!maximized && !minimized && (
          <>
            <div {...resizeE.bind} style={{ position: 'absolute', top: HEADER_H, right: 0, bottom: 14, width: 6, cursor: 'ew-resize', zIndex: 5, touchAction: 'none' }} />
            <div {...resizeS.bind} style={{ position: 'absolute', left: 0, right: 14, bottom: 0, height: 6, cursor: 'ns-resize', zIndex: 5, touchAction: 'none' }} />
            <div {...resizeSE.bind} title="Resize" style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize', zIndex: 6, touchAction: 'none', background: `linear-gradient(135deg, transparent 50%, ${theme.borderStrong} 50%, ${theme.borderStrong} 58%, transparent 58%, transparent 72%, ${theme.borderStrong} 72%, ${theme.borderStrong} 80%, transparent 80%)` }} />
          </>
        )}
      </div>
    </div>
  );
}