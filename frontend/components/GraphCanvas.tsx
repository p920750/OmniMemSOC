'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Layers,
  Crosshair,
  ShieldAlert,
  Database,
  Activity,
  Network,
  Search,
  X,
  Info,
} from 'lucide-react';

export type CanvasHighlightMode = 'all' | 'attack_path' | 'blast_radius' | 'handoff_flow';

export interface GraphNode {
  id: string;
  label: string;
  type: 'Incident' | 'Agent' | 'Asset' | 'Workload' | 'MemoryChunk' | 'IOC';
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO' | 'SAFE';
  x: number;
  y: number;
  centrality: number;
  description: string;
  connectedCount: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  isAttackPath?: boolean;
  isHandoff?: boolean;
  isBlastRadius?: boolean;
}

export interface GraphCanvasProps {
  nodesCount?: number;
  edgesCount?: number;
  highlightedNode?: string;
  highlightMode?: CanvasHighlightMode;
  onNodeSelect?: (node: GraphNode) => void;
  onModeChange?: (mode: CanvasHighlightMode) => void;
}

const DEFAULT_NODES: GraphNode[] = [
  // Assets & Workloads
  {
    id: 'DC-01-AUTH',
    label: 'Domain Controller (AD)',
    type: 'Asset',
    risk: 'CRITICAL',
    x: 480,
    y: 190,
    centrality: 0.94,
    description: 'Tier-0 Identity Authority hosting Kerberos KDC and Active Directory database.',
    connectedCount: 5,
  },
  {
    id: 'Workstation-04',
    label: 'Executive Endpoint',
    type: 'Workload',
    risk: 'HIGH',
    x: 230,
    y: 280,
    centrality: 0.78,
    description: 'Patient zero host exhibiting outbound C2 beaconing and credential theft.',
    connectedCount: 4,
  },
  {
    id: 'FileServer-02',
    label: 'Enterprise Storage NAS',
    type: 'Asset',
    risk: 'HIGH',
    x: 680,
    y: 290,
    centrality: 0.62,
    description: 'Shared SMB storage volume targeted for ransomware staging and VSS deletion.',
    connectedCount: 3,
  },
  // Ingress & IOCs
  {
    id: '198.51.100.23',
    label: 'External C2 Listener',
    type: 'IOC',
    risk: 'CRITICAL',
    x: 90,
    y: 140,
    centrality: 0.85,
    description: 'Known threat actor command & control IP beaconing on TCP port 2222.',
    connectedCount: 2,
  },
  {
    id: 'svc_backup',
    label: 'Backup SPN Account',
    type: 'IOC',
    risk: 'HIGH',
    x: 350,
    y: 120,
    centrality: 0.88,
    description: 'High-privilege Active Directory service principal account targeted via RC4 TGS requests.',
    connectedCount: 3,
  },
  // Incident & Memory
  {
    id: 'inc-9481',
    label: 'Active Kerberoasting Incident',
    type: 'Incident',
    risk: 'CRITICAL',
    x: 340,
    y: 330,
    centrality: 0.91,
    description: 'Severity P1 active incident under autonomous containment and blast forensics.',
    connectedCount: 4,
  },
  {
    id: 'chunk-101',
    label: 'Vector Memory Chunk (1536-dim)',
    type: 'MemoryChunk',
    risk: 'SAFE',
    x: 580,
    y: 400,
    centrality: 0.55,
    description: 'FalkorDB dense vector embedding of synthesized attack signature and MITRE pattern.',
    connectedCount: 2,
  },
  // Autonomous Agents
  {
    id: 'TriageAgent',
    label: 'Alert Validation Agent',
    type: 'Agent',
    risk: 'INFO',
    x: 180,
    y: 410,
    centrality: 0.72,
    description: 'Agent responsible for alert correlation and confidence scoring.',
    connectedCount: 2,
  },
  {
    id: 'ContainmentAgent',
    label: 'Mitigation Enforcer',
    type: 'Agent',
    risk: 'INFO',
    x: 380,
    y: 440,
    centrality: 0.82,
    description: 'Automated agent enforcing zero-trust endpoint network isolation.',
    connectedCount: 3,
  },
  {
    id: 'ForensicAgent',
    label: 'Path Traversal Agent',
    type: 'Agent',
    risk: 'INFO',
    x: 620,
    y: 120,
    centrality: 0.79,
    description: 'Traverses multi-hop subgraphs to discover compromised assets and lateral spread.',
    connectedCount: 3,
  },
];

const DEFAULT_EDGES: GraphEdge[] = [
  // Ingress Attack Path
  { id: 'e1', source: '198.51.100.23', target: 'Workstation-04', label: 'C2_BEACON', isAttackPath: true },
  { id: 'e2', source: 'Workstation-04', target: 'svc_backup', label: 'REQUESTS_TGS', isAttackPath: true },
  { id: 'e3', source: 'svc_backup', target: 'DC-01-AUTH', label: 'KERBEROASTS', isAttackPath: true, isBlastRadius: true },
  { id: 'e4', source: 'DC-01-AUTH', target: 'FileServer-02', label: 'LATERAL_SMB', isBlastRadius: true },
  // Incident Links
  { id: 'e5', source: 'inc-9481', target: 'DC-01-AUTH', label: 'TARGETS_ASSET', isBlastRadius: true },
  { id: 'e6', source: 'inc-9481', target: 'Workstation-04', label: 'PATIENT_ZERO', isAttackPath: true },
  // Swarm Coordination Handoffs
  { id: 'e7', source: 'TriageAgent', target: 'ContainmentAgent', label: '(:AgentHandoff ho-101)', isHandoff: true },
  { id: 'e8', source: 'ContainmentAgent', target: 'ForensicAgent', label: '(:AgentHandoff ho-102)', isHandoff: true },
  { id: 'e9', source: 'ForensicAgent', target: 'chunk-101', label: 'SYNTHESIZES_VECTOR', isHandoff: true },
  { id: 'e10', source: 'ContainmentAgent', target: 'DC-01-AUTH', label: 'ENFORCES_QUARANTINE', isBlastRadius: true },
];

export default function GraphCanvas({
  nodesCount = 42,
  edgesCount = 89,
  highlightedNode = 'DC-01-AUTH',
  highlightMode = 'all',
  onNodeSelect,
  onModeChange,
}: GraphCanvasProps) {
  const [nodes] = useState<GraphNode[]>(DEFAULT_NODES);
  const [edges] = useState<GraphEdge[]>(DEFAULT_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(highlightedNode);
  const [activeMode, setActiveMode] = useState<CanvasHighlightMode>(highlightMode);
  const [searchFilter, setSearchFilter] = useState('');

  // Zoom and Pan transform state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveMode(highlightMode);
  }, [highlightMode]);

  useEffect(() => {
    if (highlightedNode) {
      setSelectedNodeId(highlightedNode);
    }
  }, [highlightedNode]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleSelectNode = (node: GraphNode) => {
    setSelectedNodeId(node.id);
    if (onNodeSelect) onNodeSelect(node);
  };

  const handleModeSwitch = (mode: CanvasHighlightMode) => {
    setActiveMode(mode);
    if (onModeChange) onModeChange(mode);
  };

  // Node Type styling map
  const getNodeColor = (type: GraphNode['type'], isSelected: boolean, isDimmed: boolean) => {
    if (isDimmed) return 'opacity-30 border-slate-800 bg-slate-950 text-slate-600';

    switch (type) {
      case 'Incident':
        return isSelected
          ? 'bg-rose-950 border-rose-400 text-rose-200 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/60'
          : 'bg-rose-950/70 border-rose-800/80 text-rose-300 hover:border-rose-500';
      case 'Asset':
        return isSelected
          ? 'bg-amber-950 border-amber-400 text-amber-200 ring-2 ring-amber-500/50 shadow-lg shadow-amber-950/60'
          : 'bg-amber-950/70 border-amber-800/80 text-amber-300 hover:border-amber-500';
      case 'Workload':
        return isSelected
          ? 'bg-sky-950 border-sky-400 text-sky-200 ring-2 ring-sky-500/50 shadow-lg shadow-sky-950/60'
          : 'bg-sky-950/70 border-sky-800/80 text-sky-300 hover:border-sky-500';
      case 'IOC':
        return isSelected
          ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-950/60'
          : 'bg-cyan-950/70 border-cyan-800/80 text-cyan-300 hover:border-cyan-500';
      case 'Agent':
        return isSelected
          ? 'bg-purple-950 border-purple-400 text-purple-200 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/60'
          : 'bg-purple-950/70 border-purple-800/80 text-purple-300 hover:border-purple-500';
      case 'MemoryChunk':
        return isSelected
          ? 'bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/60'
          : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300 hover:border-emerald-500';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-[350px] sm:h-[500px] lg:h-[620px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col select-none cursor-grab active:cursor-grabbing"
    >
      {/* Canvas Top Bar Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono text-slate-300 gap-2 z-10 backdrop-blur-sm">
        {/* Left: Mode Switcher */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-slate-500 mr-1 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode:</span>
          </span>
          <button
            type="button"
            onClick={() => handleModeSwitch('all')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
              activeMode === 'all'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-600 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            All Subgraph
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('attack_path')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
              activeMode === 'attack_path'
                ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold shadow-sm shadow-rose-950'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Attack Path Traversal
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('blast_radius')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
              activeMode === 'blast_radius'
                ? 'bg-amber-950 text-amber-300 border-amber-600 font-bold shadow-sm shadow-amber-950'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Asset Blast Radius
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('handoff_flow')}
            className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
              activeMode === 'handoff_flow'
                ? 'bg-purple-950 text-purple-300 border-purple-600 font-bold shadow-sm shadow-purple-950'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Swarm Handoff Flow
          </button>
        </div>

        {/* Right: Zoom & Pan Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-slate-500 font-mono w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Main Coordinate Grid & SVG Canvas */}
      <div className="relative flex-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden">
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative w-[850px] h-[500px]"
        >
          {/* SVG Connection Edges */}
          <svg className="w-full h-full absolute inset-0 pointer-events-none">
            <defs>
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
              <marker
                id="arrow-attack"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
              </marker>
              <marker
                id="arrow-handoff"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
              </marker>
              <marker
                id="arrow-blast"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Render Edges */}
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const isAttackActive = activeMode === 'attack_path' && edge.isAttackPath;
              const isHandoffActive = activeMode === 'handoff_flow' && edge.isHandoff;
              const isBlastActive = activeMode === 'blast_radius' && edge.isBlastRadius;

              const isHighlighted = isAttackActive || isHandoffActive || isBlastActive;
              const isDimmed =
                (activeMode === 'attack_path' && !edge.isAttackPath) ||
                (activeMode === 'handoff_flow' && !edge.isHandoff) ||
                (activeMode === 'blast_radius' && !edge.isBlastRadius);

              const strokeColor = isAttackActive
                ? '#f43f5e'
                : isHandoffActive
                ? '#a855f7'
                : isBlastActive
                ? '#f59e0b'
                : isDimmed
                ? '#1e293b'
                : '#334155';

              const marker = isAttackActive
                ? 'url(#arrow-attack)'
                : isHandoffActive
                ? 'url(#arrow-handoff)'
                : isBlastActive
                ? 'url(#arrow-blast)'
                : 'url(#arrow-default)';

              const midX = (srcNode.x + tgtNode.x) / 2;
              const midY = (srcNode.y + tgtNode.y) / 2;

              return (
                <g key={edge.id} className="transition-all duration-300">
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={strokeColor}
                    strokeWidth={isHighlighted ? 3 : 1.5}
                    strokeDasharray={isHighlighted ? '6 3' : isDimmed ? '2 2' : 'none'}
                    markerEnd={marker}
                    className={isHighlighted ? 'animate-pulse' : ''}
                  />
                  {/* Edge label pill */}
                  {!isDimmed && (
                    <text
                      x={midX}
                      y={midY - 6}
                      fill={isHighlighted ? '#cbd5e1' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="bg-slate-950 px-1 select-none"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Blast Radius Concentric Pulse Circle */}
            {activeMode === 'blast_radius' && (
              <g className="pointer-events-none">
                <circle
                  cx={480}
                  cy={190}
                  r={85}
                  fill="rgba(245, 158, 11, 0.05)"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
                <circle
                  cx={480}
                  cy={190}
                  r={160}
                  fill="rgba(245, 158, 11, 0.02)"
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="6 6"
                />
              </g>
            )}
          </svg>

          {/* Render Graph Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isAttackNode =
              activeMode === 'attack_path' &&
              ['198.51.100.23', 'Workstation-04', 'svc_backup', 'DC-01-AUTH'].includes(node.id);
            const isHandoffNode =
              activeMode === 'handoff_flow' &&
              ['TriageAgent', 'ContainmentAgent', 'ForensicAgent', 'chunk-101'].includes(node.id);
            const isBlastNode =
              activeMode === 'blast_radius' &&
              ['DC-01-AUTH', 'svc_backup', 'Workstation-04', 'FileServer-02', 'inc-9481'].includes(node.id);

            const isDimmed =
              (activeMode === 'attack_path' && !isAttackNode) ||
              (activeMode === 'handoff_flow' && !isHandoffNode) ||
              (activeMode === 'blast_radius' && !isBlastNode);

            const colorClasses = getNodeColor(node.type, isSelected, isDimmed);

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => handleSelectNode(node)}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-xl border text-left transition-all duration-200 z-10 ${colorClasses}`}
              >
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider opacity-80">
                    :{node.type}
                  </span>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/40">
                    {node.risk}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold">{node.id}</div>
                <div className="text-[10px] text-slate-300 opacity-90 truncate max-w-[130px]">
                  {node.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 w-[calc(100%-1.5rem)] sm:w-80 max-h-[220px] sm:max-h-none overflow-y-auto bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 sm:p-4 text-xs shadow-2xl backdrop-blur-md z-20 space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {selectedNode.id}
                </span>
                <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                  :{selectedNode.type}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    selectedNode.risk === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : selectedNode.risk === 'HIGH'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                  }`}
                >
                  {selectedNode.risk}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId('')}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close Node Inspector"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              {selectedNode.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Degree Centrality</span>
                <strong className="text-cyan-300 text-xs">{selectedNode.centrality}</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Connected Edges</span>
                <strong className="text-purple-300 text-xs">{selectedNode.connectedCount} Edges</strong>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>OpenCypher Node ID: {selectedNode.id}</span>
              <span className="text-emerald-400">Indexed in Graph</span>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Footer Status */}
      <div className="px-3 sm:px-4 py-2 bg-slate-900/60 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>FalkorDB Subgraph Canvas</span>
          </span>
          <span>•</span>
          <span>Nodes: <strong className="text-cyan-300">{nodesCount}</strong></span>
          <span>Edges: <strong className="text-purple-300">{edgesCount}</strong></span>
        </div>
        <div className="text-slate-500 hidden sm:block">
          Click and drag to pan • Click node to inspect properties
        </div>
      </div>
    </div>
  );
}
