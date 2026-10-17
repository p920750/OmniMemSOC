'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { executeCypherQuery, CypherQueryResult } from '@/lib/api';
import GraphCanvas, { CanvasHighlightMode, GraphNode } from '../../components/GraphCanvas';
import {
  Play,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Cpu,
  Database,
  Activity,
  Layers,
  Table as TableIcon,
  FileCode,
  Zap,
  Network,
  ArrowRight,
  GitCommit,
  CheckCircle2,
} from 'lucide-react';

interface PresetQuery {
  name: string;
  desc: string;
  query: string;
  associatedMode?: CanvasHighlightMode;
}

const PRESET_QUERIES: PresetQuery[] = [
  {
    name: 'Incident Event Traversal',
    desc: 'Traverse chronological events linked to active Kerberoasting incident',
    query: 'MATCH (inc:Incident {id: "inc-9481"})-[r:HAS_EVENT]->(evt)\nRETURN inc.id, inc.title, evt.type, evt.timestamp, evt.agent\nLIMIT 25;',
    associatedMode: 'all',
  },
  {
    name: 'Asset Blast Radius (3 Hops)',
    desc: 'Compute multi-hop connected entities from compromised Domain Controller',
    query: 'MATCH path = (asset:Asset {id: "DC-01-AUTH"})-[*1..3]-(compromised)\nRETURN path\nLIMIT 50;',
    associatedMode: 'blast_radius',
  },
  {
    name: 'Agent Handoff Provenance Chain',
    desc: 'Retrieve inter-agent (:AgentHandoff) state nodes and reasons',
    query: 'MATCH (s:Agent)-[h:INITIATED_HANDOFF]->(handoff:AgentHandoff)-[:ASSIGNED_TO]->(r:Agent)\nRETURN s.name, handoff.id, r.name, handoff.reason, handoff.status;',
    associatedMode: 'handoff_flow',
  },
  {
    name: 'Vector Memory Embeddings',
    desc: 'List dense 1536-dimensional semantic memory chunks',
    query: 'MATCH (chunk:MemoryChunk)\nRETURN chunk.id, chunk.source, chunk.timestamp, chunk.content\nLIMIT 15;',
    associatedMode: 'all',
  },
  {
    name: 'High-Degree Threat Assets',
    desc: 'Find assets with the highest number of incident edge connections',
    query: 'MATCH (a:Asset)-[r]-()\nWITH a, count(r) AS degree\nWHERE degree >= 2\nRETURN a.id, a.type, degree\nORDER BY degree DESC;',
    associatedMode: 'all',
  },
];

interface GraphAlgorithm {
  id: string;
  name: string;
  badge: string;
  desc: string;
  query: string;
  highlightMode: CanvasHighlightMode;
  targetNodeId?: string;
}

const GRAPH_ALGORITHMS: GraphAlgorithm[] = [
  {
    id: 'pagerank',
    name: 'algo.pageRank',
    badge: 'Centrality & Influence',
    desc: 'Computes threat propagation likelihood and identifies the most critical topological asset nodes.',
    query: 'CALL algo.pageRank("Asset", "CONNECTS_TO")\nYIELD node, score\nRETURN node.id, node.label, score\nORDER BY score DESC\nLIMIT 10;',
    highlightMode: 'all',
    targetNodeId: 'DC-01-AUTH',
  },
  {
    id: 'betweenness',
    name: 'algo.betweenness',
    badge: 'Bridge Detection',
    desc: 'Identifies choke-point network bridges and high-probability lateral movement pivot points.',
    query: 'CALL algo.betweenness("Asset", "CONNECTS_TO")\nYIELD node, score\nRETURN node.id, score\nORDER BY score DESC\nLIMIT 10;',
    highlightMode: 'blast_radius',
    targetNodeId: 'Workstation-04',
  },
  {
    id: 'bfs',
    name: 'algo.BFS',
    badge: 'Breadth-First Traversal',
    desc: 'Executes rapid multi-hop breadth-first traversal from ingress IP to crown jewel directory.',
    query: 'CALL algo.BFS("198.51.100.23", "DC-01-AUTH", "CONNECTS_TO")\nYIELD nodes, edges\nRETURN nodes, edges;',
    highlightMode: 'attack_path',
    targetNodeId: '198.51.100.23',
  },
  {
    id: 'shortestpath',
    name: 'shortestPath()',
    badge: 'Minimum Hop Route',
    desc: 'Calculates the minimal adversary lateral traversal route between patient zero and target host.',
    query: 'MATCH (src:Workload {id: "Workstation-04"}), (dst:Asset {id: "DC-01-AUTH"})\nRETURN shortestPath((src)-[*1..10]->(dst)) AS attack_path;',
    highlightMode: 'attack_path',
    targetNodeId: 'Workstation-04',
  },
];

export default function AnalyticsPage() {
  const { activeTenant, activeTenantData } = useTenant();

  // State
  const [cypherQuery, setCypherQuery] = useState(PRESET_QUERIES[0].query);
  const [queryResult, setQueryResult] = useState<CypherQueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeAlgorithmId, setActiveAlgorithmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [copiedJson, setCopiedJson] = useState(false);

  // Canvas visual state
  const [canvasMode, setCanvasMode] = useState<CanvasHighlightMode>('all');
  const [canvasSelectedNode, setCanvasSelectedNode] = useState<string>('DC-01-AUTH');

  // Run initial query
  useEffect(() => {
    handleRunQuery(PRESET_QUERIES[0].query);
  }, [activeTenant]);

  const handleRunQuery = async (queryToRun: string = cypherQuery) => {
    setIsExecuting(true);
    try {
      const res = await executeCypherQuery(activeTenant, queryToRun);
      setQueryResult(res);
    } catch (e) {
      console.warn('Error running query:', e);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunAlgorithm = (algo: GraphAlgorithm) => {
    setActiveAlgorithmId(algo.id);
    setCypherQuery(algo.query);
    setCanvasMode(algo.highlightMode);
    if (algo.targetNodeId) {
      setCanvasSelectedNode(algo.targetNodeId);
    }
    handleRunQuery(algo.query);
    setTimeout(() => setActiveAlgorithmId(null), 1500);
  };

  const handleSelectPreset = (preset: PresetQuery) => {
    setCypherQuery(preset.query);
    if (preset.associatedMode) {
      setCanvasMode(preset.associatedMode);
    }
    handleRunQuery(preset.query);
  };

  const handleCopyJson = () => {
    if (!queryResult) return;
    navigator.clipboard.writeText(JSON.stringify(queryResult, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-slate-800 bg-slate-900/60 p-4 sm:p-6 rounded-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>FALKORDB GRAPH ANALYTICS & CYPHER CONSOLE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2 sm:gap-3">
              <span>FalkorDB Graph Analytics & Cypher Studio</span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-normal">
                {activeTenantData?.name || activeTenant}
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl">
              Execute live OpenCypher queries against tenant-isolated FalkorDB graphs. Run native graph algorithms
              for betweenness centrality, PageRank threat propagation, and multi-hop lateral attack path discovery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleRunQuery()}
              disabled={isExecuting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center space-x-2 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>Refresh Graph</span>
            </button>
            <div className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-xs text-slate-400 flex items-center space-x-2 max-w-full">
              <Database className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate">Partition: <strong className="text-cyan-300">graph_{activeTenant.replace(/-/g, '_')}</strong></span>
            </div>
          </div>
        </div>

        {/* Live Graph Telemetry Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-slate-800 text-xs font-mono">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Total Graph Nodes</span>
            <span className="text-cyan-300 font-bold text-sm">42 Nodes</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Graph Relationships</span>
            <span className="text-purple-300 font-bold text-sm">89 Edges</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Query Latency</span>
            <span className="text-emerald-300 font-bold text-sm">
              {queryResult?.latency_ms ? `${queryResult.latency_ms} ms` : '< 1.8 ms'}
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Graph Engine</span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>FALKORDB READY</span>
            </span>
          </div>
        </div>
      </div>

      {/* Graph Visualizer Canvas Component */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Network className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Topological Subgraph Canvas (OpenCypher Subgraph Projection)</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Interactive Pan & Zoom • Click Nodes to Inspect Centrality
          </span>
        </div>

        <GraphCanvas
          nodesCount={42}
          edgesCount={89}
          highlightedNode={canvasSelectedNode}
          highlightMode={canvasMode}
          onNodeSelect={(node: GraphNode) => setCanvasSelectedNode(node.id)}
          onModeChange={(mode: CanvasHighlightMode) => setCanvasMode(mode)}
        />
      </div>

      {/* Native FalkorDB Graph Algorithms Launchpad */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Native FalkorDB Graph Algorithms</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Engine: FalkorDB Graph Procedures (GraphBLAS Acceleration)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GRAPH_ALGORITHMS.map((algo) => {
            const isRunning = isExecuting && activeAlgorithmId === algo.id;

            return (
              <div
                key={algo.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-black/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {algo.name}
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                      {algo.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {algo.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRunAlgorithm(algo)}
                  disabled={isExecuting}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-all ${
                    isRunning
                      ? 'bg-amber-600 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-500'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>EXECUTING ALGO...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                      <span>RUN {algo.name}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* OpenCypher Query Console & Schema Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Editor & Result Viewers */}
        <div className="lg:col-span-2 space-y-4">
          {/* Query Editor Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  OpenCypher Query Editor
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                  Ctrl + Enter to Execute
                </span>
                <button
                  type="button"
                  onClick={() => handleRunQuery()}
                  disabled={isExecuting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-mono font-bold transition-all shadow-md shadow-cyan-950 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>EXECUTING...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>EXECUTE CYPHER</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={cypherQuery}
              onChange={(e) => setCypherQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              placeholder="MATCH (n) RETURN n LIMIT 25;"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 leading-relaxed transition-all resize-y"
            />

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-1.5 items-center pt-1 text-xs">
              <span className="text-slate-500 font-mono text-[11px] mr-1">
                Templates:
              </span>
              {PRESET_QUERIES.map((sq) => (
                <button
                  key={sq.name}
                  type="button"
                  onClick={() => handleSelectPreset(sq)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition-colors"
                  title={sq.desc}
                >
                  {sq.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results Output Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Query Results
                </span>
                {queryResult && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                    {queryResult.data?.length || 0} Records
                  </span>
                )}
                {queryResult?.latency_ms && (
                  <span className="text-[11px] font-mono text-slate-500">
                    in {queryResult.latency_ms} ms
                  </span>
                )}
              </div>

              {/* View Mode Toggle & Copy */}
              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 border ${
                    viewMode === 'table'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <TableIcon className="w-3 h-3" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('json')}
                  className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 border ${
                    viewMode === 'json'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  disabled={!queryResult}
                  className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
                  title="Copy Results JSON"
                >
                  {copiedJson ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Results Content */}
            {viewMode === 'table' ? (
              <div className="overflow-x-auto max-h-[360px] rounded-lg border border-slate-800 bg-slate-950">
                {queryResult?.header && queryResult.header.length > 0 ? (
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        {queryResult.header.map((col, idx) => (
                          <th key={idx} className="p-2.5 font-bold text-cyan-400">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {queryResult.data?.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-slate-900/60 transition-colors text-slate-200"
                        >
                          {row.map((val: any, cIdx: number) => (
                            <td key={cIdx} className="p-2.5 text-slate-300">
                              {typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs">
                    No tabular records returned. Execute a Cypher query above.
                  </div>
                )}
              </div>
            ) : (
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto max-h-[360px] leading-relaxed">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Right Col: Graph Schema & Topology Stats */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3 border-b border-slate-800 pb-2 flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>FalkorDB Node Labels Taxonomy</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-rose-400 font-bold">:Incident</span>
                <span className="text-slate-400">14 nodes</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-amber-400 font-bold">:Asset</span>
                <span className="text-slate-400">24 nodes</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-sky-400 font-bold">:Workload</span>
                <span className="text-slate-400">18 nodes</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-purple-400 font-bold">:Agent & :AgentHandoff</span>
                <span className="text-slate-400">34 nodes</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-cyan-400 font-bold">:IOC</span>
                <span className="text-slate-400">19 nodes</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-emerald-400 font-bold">:MemoryChunk (Vectors)</span>
                <span className="text-slate-400">16 chunks</span>
              </div>
            </div>

            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mt-6 mb-3 border-b border-slate-800 pb-2 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Relationship Types</span>
            </h3>

            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {[
                'HAS_EVENT',
                'INITIATED_HANDOFF',
                'ASSIGNED_TO',
                'HAS_SEMANTIC_MEMORY',
                'CONTAINS_STEP',
                'EXHIBITS_IOC',
                'QUARANTINED',
                'LATERAL_SPREAD',
              ].map((rel) => (
                <span
                  key={rel}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300"
                >
                  [:{rel}]
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>FalkorDB Graph Engine:</span>
              <span className="text-cyan-400">v1.0.8</span>
            </div>
            <div className="flex justify-between">
              <span>GraphBLAS BLAS Core:</span>
              <span className="text-emerald-400">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Isolation:</span>
              <span className="text-purple-400">Multi-Tenant Subgraphs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
