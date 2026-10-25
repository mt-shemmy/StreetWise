import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { THEMES, type AppTheme } from '../../src/theme';

export default function DeviceNode({ data, selected }: { data: { label: string, type: string, ip?: string, theme?: AppTheme }, selected?: boolean }) {
  const theme = data.theme || THEMES.dark;
  const isRouter = data.type === 'router';

  const Icons = {
    pc: (
      <svg viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px', height: '40px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
        <rect x="3" y="4" width="18" height="12" rx="2" ry="2" fill={theme.bg} />
        <path d="M2 20h20M12 16v4" stroke={theme.accent} strokeWidth="2" />
        <circle cx="12" cy="20" r="1" fill={theme.accent} />
      </svg>
    ),
    switch: (
      <svg viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px', height: '40px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
        <rect x="2" y="6" width="20" height="12" rx="2" ry="2" fill={theme.panel} />
        <path d="M6 12h12M15 9l3 3-3 3M9 15l-3-3 3-3" stroke={theme.muted} strokeWidth="1.5" />
        <circle cx="6" cy="9" r="0.5" fill={theme.success} stroke="none" />
        <circle cx="8" cy="9" r="0.5" fill={theme.success} stroke="none" />
        <circle cx="10" cy="9" r="0.5" fill={theme.success} stroke="none" />
        <circle cx="12" cy="9" r="0.5" fill={theme.success} stroke="none" />
      </svg>
    ),
    router: (
      <svg viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px', height: '40px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
        <circle cx="12" cy="12" r="9" fill={theme.bg} />
        <path d="M12 7v10M8 12l4-4 4 4" stroke={theme.accent} strokeWidth="1.5" />
        <path d="M8 12l4 4 4-4" stroke={theme.accent} strokeWidth="1.5" />
      </svg>
    )
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', transition: 'all 0.2s ease', transform: selected ? 'scale(1.05)' : 'scale(1)' }}>
      <Handle type="target" position={Position.Left} style={{ background: theme.accent, width: '12px', height: '12px', border: `2px solid ${theme.bg}`, borderRadius: '4px', left: '-6px' }} />
      
      <div style={{ 
        padding: '12px', background: `linear-gradient(145deg, ${theme.panel2} 0%, ${theme.panel} 100%)`, 
        borderRadius: isRouter ? '50%' : '12px', border: selected ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, 
        boxShadow: selected ? `0 0 20px ${theme.accent}40` : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative'
      }}>
        {Icons[data.type as keyof typeof Icons] || Icons.pc}
        <div style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: theme.success, boxShadow: `0 0 8px ${theme.success}`, animation: 'pulse 2s infinite' }} />
      </div>
      
      <div style={{ marginTop: '12px', textAlign: 'center', backgroundColor: theme.bg, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '6px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', color: theme.text, letterSpacing: '0.5px' }}>{data.label}</div>
        {data.ip && <div style={{ fontSize: '11px', color: theme.accent, marginTop: '4px', fontFamily: '"Consolas", monospace' }}>{data.ip}</div>}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: theme.accent, width: '12px', height: '12px', border: `2px solid ${theme.bg}`, borderRadius: '4px', right: '-6px' }} />
    </div>
  );
}