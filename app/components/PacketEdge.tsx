import React from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { THEMES, type AppTheme } from '../../src/theme';

export default function PacketEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data, selected }: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 20 });
  
  const theme = (data?.theme as AppTheme) || THEMES.dark;
  const isAnimating = data?.isAnimating;
  const isDropped = data?.status === 'dropped';
  
  const color = isDropped ? theme.danger : theme.success; 
  const baseColor = selected ? theme.accentBright : theme.borderStrong;

  return (
    <>
      <BaseEdge path={edgePath} style={{ strokeWidth: 20, stroke: 'transparent', cursor: 'pointer' }} />
      <BaseEdge path={edgePath} style={{ ...style, strokeWidth: isAnimating ? 3 : 2, stroke: baseColor, transition: 'all 0.3s ease', filter: selected ? `drop-shadow(0 0 6px ${theme.accentBright}80)` : 'none' }} {...(markerEnd ? { markerEnd } : {})} />
      
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, background: theme.panel, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${baseColor}`, fontSize: '10px', color: theme.muted, pointerEvents: 'none', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontFamily: '"Consolas", monospace' }}>
          LINK_UP
        </div>
      </EdgeLabelRenderer>

      {isAnimating && (
        <circle r="6" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
          <animateMotion dur="0.8s" repeatCount="1" path={edgePath} />
        </circle>
      )}
    </>
  );
}