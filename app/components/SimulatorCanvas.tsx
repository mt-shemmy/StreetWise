"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  ReactFlow, Controls, applyNodeChanges, applyEdgeChanges, addEdge, ReactFlowProvider, useReactFlow, Background,
  type Node, type Edge, type NodeChange, type EdgeChange, type Connection, ConnectionLineType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; 

import DeviceNode from './DeviceNode';
import PacketEdge from './PacketEdge';
import dynamic from 'next/dynamic';
import { networkManager } from '../../src/NetworkManager';
import { packetSniffer } from '../../src/PacketSniffer';
import { type AppTheme } from '../../src/theme';

const DeviceTerminal = dynamic(() => import('./DeviceTerminal'), { ssr: false });

const initialNodes: Node[] = [
  { id: '1', type: 'device', position: { x: 100, y: 150 }, data: { label: 'Host A', type: 'pc', ip: '192.168.1.10' } },
  { id: '2', type: 'device', position: { x: 400, y: 150 }, data: { label: 'Switch 1', type: 'switch' } },
];

function FlowCanvas({ theme }: { theme: AppTheme }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [activeNode, setActiveNode] = useState<Node | null>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({ device: DeviceNode }), []);
  const edgeTypes = useMemo(() => ({ packetEdge: PacketEdge }), []);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, theme } })));
    setEdges((eds) => eds.map((e) => ({ ...e, data: { ...e.data, theme } })));
  }, [theme]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect = useCallback((params: Connection) => {
    networkManager.connectNodes(params.source, params.target);
    setEdges((eds) => addEdge({ ...params, type: 'packetEdge', data: { theme } }, eds));
  }, [theme]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow-type');
    const label = event.dataTransfer.getData('application/reactflow-label');
    if (!type) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNodeId = `device-${Date.now()}`;
    setNodes((nds) => nds.concat({ id: newNodeId, type: 'device', position, data: { label, type, ip: type === 'pc' ? '0.0.0.0' : undefined, theme } }));
    networkManager.addDevice(newNodeId, type as 'pc' | 'switch' | 'router');
  }, [screenToFlowPosition, theme]);

  useEffect(() => {
    packetSniffer.subscribe((event) => {
      if (!event.sourceId || !event.targetId) return;
      setEdges((eds) => eds.map(e => {
        if ((e.source === event.sourceId && e.target === event.targetId) || (e.source === event.targetId && e.target === event.sourceId)) {
          setTimeout(() => setEdges(currentEds => currentEds.map(ce => ce.id === e.id ? { ...ce, data: { ...ce.data, isAnimating: false } } : ce)), 1000);
          return { ...e, data: { ...e.data, isAnimating: true, status: event.status } };
        }
        return e;
      }));
    });
  }, []);

  return (
    <div className="lab-flow" style={{ height: '100%', width: '100%', position: 'relative', backgroundColor: theme.canvasBg, '--flow-panel': theme.panel, '--flow-border': theme.border, '--flow-text': theme.text, '--flow-hover': theme.panel2 } as React.CSSProperties} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect} 
        onNodeClick={(_e, node) => setActiveNode(node)}
        onDragOver={onDragOver}
        onDrop={onDrop} 
        colorMode={theme.mode}
        fitView
        connectionRadius={50}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: theme.accent, strokeWidth: 3, strokeDasharray: '6,6' }}
      >
        <Background color={theme.canvasGrid} gap={30} size={1.5} />
        <Controls style={{ zIndex: 5 }} />
      </ReactFlow>

      {activeNode && (
        <DeviceTerminal
          theme={theme}
          nodeId={activeNode.id}
          nodeName={activeNode.data.label as string}
          onClose={() => setActiveNode(null)}
          onIpChange={(newIp) => {
            setNodes((nds) => nds.map((n) => n.id === activeNode.id ? { ...n, data: { ...n.data, ip: newIp } } : n));
            setActiveNode((prev) => prev ? { ...prev, data: { ...prev.data, ip: newIp } } : prev);
          }}
        />
      )}
    </div>
  );
}

export interface SimulatorCanvasProps {
  theme: AppTheme;
}

export default function SimulatorCanvas({ theme }: SimulatorCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas theme={theme} />
    </ReactFlowProvider>
  );
}

