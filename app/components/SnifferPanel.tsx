import React, { useEffect, useState } from 'react';
import { packetSniffer, type CaptureEvent } from '../../src/PacketSniffer';
import type { AppTheme } from '../../src/theme';

export default function SnifferPanel({ theme }: { theme: AppTheme }) {
  const [packets, setPackets] = useState<CaptureEvent[]>([]);

  useEffect(() => {
    setPackets([...packetSniffer.logs]);
    packetSniffer.subscribe((newPacket) => setPackets((prev) => [...prev, newPacket]));
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: theme.panel, borderTop: `1px solid ${theme.border}`, color: theme.text, fontFamily: '"Consolas", monospace' }}>
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.panel2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.danger, animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', color: theme.accent }}>LIVE PACKET CAPTURE</span>
        </div>
        <span style={{ fontSize: '12px', color: theme.muted }}>CAPTURED: {packets.length} FRAMES</span>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: theme.bg, borderBottom: `1px solid ${theme.border}`, color: theme.muted }}>
            <tr>
              <th style={{ padding: '12px 20px', fontWeight: 600 }}>PROTOCOL</th>
              <th style={{ padding: '12px 20px', fontWeight: 600 }}>SOURCE IP</th>
              <th style={{ padding: '12px 20px', fontWeight: 600 }}>DESTINATION IP</th>
              <th style={{ padding: '12px 20px', fontWeight: 600 }}>SRC MAC</th>
              <th style={{ padding: '12px 20px', fontWeight: 600 }}>DST MAC</th>
              <th style={{ padding: '12px 20px', fontWeight: 600 }}>PAYLOAD / TARGET</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((event, index) => {
              const p = event.packet;
              const isDrop = event.status === 'dropped';
              const isArp = p.payload.type.includes('ARP');
              return (
                <tr key={index} style={{ backgroundColor: isDrop ? `${theme.danger}20` : index % 2 === 0 ? theme.panel : theme.panel2, borderBottom: `1px solid ${theme.border}`, transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '10px 20px', color: isDrop ? theme.danger : isArp ? '#e0a530' : theme.accent, fontWeight: 'bold' }}>
                    {isDrop ? '🛑 DROP' : p.payload.type}
                  </td>
                  <td style={{ padding: '10px 20px' }}>{p.sourceIp}</td><td style={{ padding: '10px 20px' }}>{p.destIp}</td>
                  <td style={{ padding: '10px 20px', color: theme.muted }}>{p.sourceMac}</td><td style={{ padding: '10px 20px', color: theme.muted }}>{p.destMac}</td>
                  <td style={{ padding: '10px 20px' }}>{p.payload.targetIp || p.payload.data || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}