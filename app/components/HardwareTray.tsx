import React from 'react';
import type { AppTheme } from '../../src/theme';
import styles from './HardwareTray.module.css';

interface HardwareTrayProps {
  theme: AppTheme;
}

export default function HardwareTray({ theme }: HardwareTrayProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const trayVars = {
    '--tray-border': theme.border,
    '--tray-panel2': theme.panel2,
    '--tray-accent': theme.accent,
    '--tray-glow': `${theme.accent}20`,
  } as React.CSSProperties;

  return (
    <aside
      style={{
        width: '100%',
        height: '100%',
        background: theme.panel,
        display: 'flex',
        flexDirection: 'row',
        zIndex: 10,
        ...trayVars,
      }}
    >
      {/* Header & Instructions Section */}
      <div
        style={{
          padding: '24px',
          borderRight: `1px solid ${theme.border}`,
          background: `linear-gradient(90deg, ${theme.panel2} 0%, ${theme.panel} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: '260px',
          flexShrink: 0,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            color: theme.text,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            fontWeight: 'bold',
          }}
        >
          Hardware Toolbox
        </h3>
        <p style={{ margin: '6px 0 12px 0', fontSize: '13px', color: theme.muted, lineHeight: '1.5' }}>
          Drag and drop devices onto the canvas.
        </p>
        <div
          style={{
            fontSize: '11px',
            color: theme.muted,
            padding: '8px 12px',
            background: theme.bg,
            borderRadius: '6px',
            border: `1px solid ${theme.border}`,
          }}
        >
          💡 Click a device to open terminal.<br />
          🗑️ Press <b>Backspace</b> to delete.
        </div>
      </div>

      {/* Draggable Hardware List */}
      <div
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          overflowX: 'auto',
          alignItems: 'center',
        }}
      >
        {/* End Device (PC) */}
        <div
          className={styles.toolboxCard}
          onDragStart={(e) => onDragStart(e, 'pc', 'Host PC')}
          draggable
          style={{
            padding: '16px',
            borderRadius: '12px',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div
            className={styles.toolboxIconBox}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: theme.panel,
              borderRadius: '10px',
              border: `1px solid ${theme.borderStrong}`,
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.text}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '28px', height: '28px' }}
            >
              <rect x="3" y="4" width="18" height="12" rx="2" ry="2" fill={theme.bg} />
              <path d="M2 20h20M12 16v4" stroke={theme.accent} strokeWidth="2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: theme.text, letterSpacing: '0.5px' }}>
              End Device
            </div>
            <div style={{ fontSize: '12px', color: theme.muted, marginTop: '4px', lineHeight: '1.4' }}>
              PC / Workstation
            </div>
          </div>
        </div>

        {/* Switch */}
        <div
          className={styles.toolboxCard}
          onDragStart={(e) => onDragStart(e, 'switch', 'Switch')}
          draggable
          style={{
            padding: '16px',
            borderRadius: '12px',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div
            className={styles.toolboxIconBox}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: theme.panel,
              borderRadius: '10px',
              border: `1px solid ${theme.borderStrong}`,
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.text}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '28px', height: '28px' }}
            >
              <rect x="2" y="6" width="20" height="12" rx="2" ry="2" fill={theme.panel} />
              <path d="M6 12h12M15 9l3 3-3 3M9 15l-3-3 3-3" stroke={theme.muted} strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: theme.success, letterSpacing: '0.5px' }}>
              Layer 2 Switch
            </div>
            <div style={{ fontSize: '12px', color: theme.muted, marginTop: '4px', lineHeight: '1.4' }}>
              Local Frame Forwarding
            </div>
          </div>
        </div>

        {/* Router */}
        <div
          className={styles.toolboxCard}
          onDragStart={(e) => onDragStart(e, 'router', 'Router')}
          draggable
          style={{
            padding: '16px',
            borderRadius: '12px',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div
            className={styles.toolboxIconBox}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: theme.panel,
              borderRadius: '10px',
              border: `1px solid ${theme.borderStrong}`,
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.text}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '28px', height: '28px' }}
            >
              <circle cx="12" cy="12" r="9" fill={theme.bg} />
              <path d="M12 7v10M8 12l4-4 4 4" stroke={theme.accent} strokeWidth="1.5" />
              <path d="M8 12l4 4 4-4" stroke={theme.accent} strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: theme.accent, letterSpacing: '0.5px' }}>
              Layer 3 Router
            </div>
            <div style={{ fontSize: '12px', color: theme.muted, marginTop: '4px', lineHeight: '1.4' }}>
              Cross-subnet Routing
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

