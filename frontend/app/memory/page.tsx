'use client';

import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
  fetchEpisodicMemory,
  searchSemanticMemory,
  fetchProceduralRunbooks,
  fetchIncidentTimeline,
  EpisodicIncident,
  SemanticSearchResult,
  ProceduralRunbook,
  EpisodicEvent,
} from '@/lib/api';
import MemorySearch, { MemorySearchParams, MemoryLayerType } from '../../components/MemorySearch';
import {
  Brain,
  Database,
  Layers,
  ShieldAlert,
  ShieldCheck,
  GitBranch,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Tag,
  Activity,
  Terminal,
  FileCode,
  Server,
  Lock,
  Workflow,
  Cpu,
} from 'lucide-react';

export default function MemoryExplorerPage() {
  const { activeTenant, activeTenantData } = useTenant();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'episodic' | 'semantic' | 'procedural'>('episodic');

  // Search parameters state
  const [searchParams, setSearchParams] = useState<MemorySearchParams>({
    query: '',
    memoryType: 'ALL',
    severity: 'ALL',
    k: 5,
    threshold: 0.0,
  });

  // Data states
  const [episodicIncidents, setEpisodicIncidents] = useState<EpisodicIncident[]>([]);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  const [proceduralRunbooks, setProceduralRunbooks] = useState<ProceduralRunbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Timeline expansion states: incidentId -> list of events
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, EpisodicEvent[]>>({});
  const [loadingTimelineId, setLoadingTimelineId] = useState<string | null>(null);

  // Runbook step test execution state
  const [simulatedRunbookId, setSimulatedRunbookId] = useState<string | null>(null);

  // Load all 3 memory stores
  const loadMemoryData = async (params: MemorySearchParams = searchParams) => {
    setIsLoading(true);
    try {
      const [epData, semData, procData] = await Promise.all([
        fetchEpisodicMemory(activeTenant, params.query, params.severity),
        searchSemanticMemory(activeTenant, params.query, params.k, params.threshold),
        fetchProceduralRunbooks(activeTenant),
      ]);

      setEpisodicIncidents(Array.isArray(epData) ? epData : []);
      setSemanticResults(Array.isArray(semData) ? semData : []);
      setProceduralRunbooks(Array.isArray(procData) ? procData : []);
    } catch (e) {
      console.warn('Error loading memory store:', e);
      setEpisodicIncidents([]);
      setSemanticResults([]);
      setProceduralRunbooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemoryData();
  }, [activeTenant]);

  // Handle Search Trigger from MemorySearch Component
  const handleSearchSubmit = (newParams: MemorySearchParams) => {
    setSearchParams(newParams);

    // Automatically switch to the relevant tab if a specific memory layer was selected
    if (newParams.memoryType === 'EPISODIC') setActiveTab('episodic');
    else if (newParams.memoryType === 'SEMANTIC') setActiveTab('semantic');
    else if (newParams.memoryType === 'PROCEDURAL') setActiveTab('procedural');

    loadMemoryData(newParams);
  };

  // Toggle chronological event timeline for an incident
  const handleToggleTimeline = async (incidentId: string) => {
    if (expandedTimelines[incidentId]) {
      // Collapse
      const next = { ...expandedTimelines };
      delete next[incidentId];
      setExpandedTimelines(next);
      return;
    }

    setLoadingTimelineId(incidentId);
    try {
      const events = await fetchIncidentTimeline(activeTenant, incidentId);
      setExpandedTimelines((prev) => ({
        ...prev,
        [incidentId]: Array.isArray(events) ? events : [],
      }));
    } catch (e) {
      console.warn('Error fetching timeline:', e);
    } finally {
      setLoadingTimelineId(null);
    }
  };

  const handleSimulateRunbook = (rbId: string) => {
    setSimulatedRunbookId(rbId);
    setTimeout(() => {
      setSimulatedRunbookId(null);
    }, 2500);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border border-slate-800 bg-slate-900/60 p-4 sm:p-6 rounded-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>EPISODIC & PROCEDURAL MEMORY EXPLORER</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>SOC Cognitive Threat Memory Repository</span>
              <span className="text-[11px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-normal">
                {activeTenantData?.name || activeTenant}
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl">
              Cross-session exploration of discrete historical episodes, dense 1536-dimensional vector knowledge, and
              reusable procedural containment runbooks powered by FalkorDB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadMemoryData()}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center space-x-2 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Memory</span>
            </button>
            <div className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-xs text-slate-400 flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Partition: <strong className="text-cyan-300">graph_{activeTenant.replace(/-/g, '_')}</strong></span>
            </div>
          </div>
        </div>

        {/* Live Memory Telemetry Badges */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-slate-800 text-xs font-mono">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Episodic Incidents</span>
            <span className="text-cyan-300 font-bold text-sm">{episodicIncidents.length}</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Vector Embeddings</span>
            <span className="text-emerald-300 font-bold text-sm">1536-dim Index</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Procedural Playbooks</span>
            <span className="text-purple-300 font-bold text-sm">{proceduralRunbooks.length}</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400">Query Status</span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>SYNCHRONIZED</span>
            </span>
          </div>
        </div>
      </div>

      {/* Memory Search Bar Component */}
      <MemorySearch
        onSearch={handleSearchSubmit}
        initialParams={searchParams}
        isLoading={isLoading}
      />

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex space-x-4 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab('episodic')}
          className={`pb-3 text-xs sm:text-sm font-mono font-semibold transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'episodic'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Episodic Incident History</span>
          <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 text-slate-300">
            {episodicIncidents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('semantic')}
          className={`pb-3 text-xs sm:text-sm font-mono font-semibold transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'semantic'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Semantic Vector Search</span>
          <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 text-slate-300">
            {semanticResults.length} matches
          </span>
        </button>

        <button
          onClick={() => setActiveTab('procedural')}
          className={`pb-3 text-xs sm:text-sm font-mono font-semibold transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'procedural'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Workflow className="w-4 h-4" />
          <span>Procedural Runbooks</span>
          <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 text-slate-300">
            {proceduralRunbooks.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Episodic Incident History */}
      {activeTab === 'episodic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Historical Causal Episodes Recorded in Graph</span>
            <span>Click any incident to inspect its chronological event timeline</span>
          </div>

          {(!episodicIncidents || episodicIncidents.length === 0) ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs border border-slate-800 rounded-xl bg-slate-900/40">
              No episodic incidents match the search criteria. Try clearing filters or changing query.
            </div>
          ) : (
            (episodicIncidents || []).map((item) => {
              const isTimelineOpen = !!expandedTimelines[item.id];
              const isTimelineLoading = loadingTimelineId === item.id;
              const events = expandedTimelines[item.id] || [];

              const severityBadge =
                item.severity === 'CRITICAL'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                  : item.severity === 'HIGH'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-800';

              return (
                <div
                  key={item.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all space-y-3"
                >
                  {/* Incident Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${severityBadge}`}>
                        {item.severity}
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-sm">
                        {item.id}
                      </span>
                      <span className="text-white font-semibold text-sm">
                        {item.title}
                      </span>
                      {item.agent && (
                        <span className="text-[10px] font-mono bg-blue-950/80 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                          Agent: {item.agent}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                        {item.status}
                      </span>
                      <span className="flex items-center space-x-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Tags & Timeline Toggle Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap gap-1.5">
                      {(item.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-cyan-300/90 px-2 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleToggleTimeline(item.id)}
                      className="self-start sm:self-auto text-xs font-mono px-3 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors flex items-center space-x-1.5"
                    >
                      {isTimelineLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Loading Timeline...</span>
                        </>
                      ) : isTimelineOpen ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Hide Timeline</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Inspect Chronological Event Timeline</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expanded Timeline Drawer */}
                  {isTimelineOpen && (
                    <div className="mt-3 p-4 bg-slate-950/90 border border-cyan-900/60 rounded-lg space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono text-cyan-300 border-b border-slate-800 pb-2">
                        <span className="flex items-center space-x-2">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Chronological Forensic Event Stream [{item.id}]</span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {(events || []).length} Events Linked in Graph
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {(events || []).map((evt, idx) => (
                          <div
                            key={evt.id}
                            className="flex items-start space-x-3 text-xs font-mono p-2.5 rounded bg-slate-900/80 border border-slate-800/80"
                          >
                            <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                              0{idx + 1}
                            </span>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-cyan-400 font-bold">{evt.type}</span>
                                  {evt.agent && (
                                    <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">
                                      by {evt.agent}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(evt.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-slate-300 text-xs">{evt.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Semantic Vector Memory Search */}
      {activeTab === 'semantic' && (
        <div className="space-y-6">
          {/* Natural Language Vector Query Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border border-emerald-500/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="font-mono font-bold text-white">
                  FalkorDB 1536-Dimensional Dense Vector Index
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Semantic similarity matching uses Cosine distance over OpenAI / Sentence-Transformer vector spaces.
                </div>
              </div>
            </div>
            <div className="font-mono text-[11px] px-3 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-300">
              <code>CALL db.idx.vector.queryNodes(&apos;chunk_vector_idx&apos;, {searchParams.k}, $vec)</code>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            {(!semanticResults || semanticResults.length === 0) ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs border border-slate-800 rounded-xl bg-slate-900/40">
                No semantic vector chunks matched threshold ≥ {searchParams.threshold.toFixed(2)}. Adjust the threshold or query.
              </div>
            ) : (
              (semanticResults || []).map((chunk) => {
                const matchPct = Math.round(chunk.score * 100);

                return (
                  <div
                    key={chunk.chunk_id}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 transition-all space-y-3"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold">
                          {chunk.chunk_id}
                        </span>
                        <span className="font-mono text-xs text-cyan-400">
                          [{chunk.incident_id}]
                        </span>
                        {chunk.incident_title && (
                          <span className="text-sm font-semibold text-slate-200">
                            {chunk.incident_title}
                          </span>
                        )}
                      </div>

                      {/* Score Indicator */}
                      <div className="flex items-center space-x-2 text-xs font-mono">
                        <span className="text-slate-400">Cosine Similarity:</span>
                        <div className="w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                            style={{ width: `${matchPct}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-emerald-400">{matchPct}% Match</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 leading-relaxed">
                      &quot;{chunk.content}&quot;
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                      <div className="flex items-center space-x-3">
                        <span>Source: <strong className="text-slate-400">{chunk.source}</strong></span>
                        <span>•</span>
                        <span>Embedding: <strong className="text-cyan-400">1536 Floats</strong></span>
                      </div>
                      <span className="text-emerald-400">Indexed in FalkorDB Namespace</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Procedural Runbooks & Playbooks */}
      {activeTab === 'procedural' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Deterministic Mitigation Playbooks & Sequential Countermeasures</span>
            <span>Zero-Trust Automated Quarantine Workflows</span>
          </div>

          <div className="space-y-6">
            {(!proceduralRunbooks || proceduralRunbooks.length === 0) ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs border border-slate-800 rounded-xl bg-slate-900/40">
                No procedural runbooks loaded. Check connection to FalkorDB.
              </div>
            ) : (
              (proceduralRunbooks || []).map((rb) => {
                const isSimulating = simulatedRunbookId === rb.id;

                return (
                  <div
                    key={rb.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-purple-500/40 transition-all space-y-4"
                  >
                    {/* Playbook Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center space-x-2 text-xs font-mono mb-1">
                          <span className="text-purple-400 font-bold">[{rb.id}]</span>
                          <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                            v{rb.version || '1.0'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">{rb.title}</h3>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono bg-slate-950 border border-slate-800 text-amber-300 px-3 py-1.5 rounded">
                          Pattern: {rb.attack_pattern}
                        </span>
                        <button
                          onClick={() => handleSimulateRunbook(rb.id)}
                          disabled={isSimulating}
                          className={`px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all ${
                            isSimulating
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {isSimulating ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>EXECUTED STEPS</span>
                            </>
                          ) : (
                            <>
                              <Workflow className="w-3.5 h-3.5 text-purple-400" />
                              <span>Simulate Runbook</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sequential Steps Trail */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Sequential Mitigation Steps</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(rb.steps || []).map((st) => (
                        <div
                          key={st.order}
                          className={`p-3.5 rounded-lg border flex flex-col justify-between transition-colors ${
                            isSimulating
                              ? 'bg-emerald-950/30 border-emerald-500/50'
                              : 'bg-slate-950/80 border-slate-800/80'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono font-bold">
                                {st.order}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                                {st.target_type || 'System'}
                              </span>
                            </div>
                            <div className="font-mono text-xs font-bold text-slate-200 mb-1">
                              {st.action}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                              {st.description || 'Automated policy enforcement step.'}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono flex items-center justify-between text-slate-500">
                            <span>Target: <strong className="text-cyan-300">{st.target}</strong></span>
                            {isSimulating ? (
                              <span className="text-emerald-400 font-bold">ENFORCED</span>
                            ) : (
                              <span className="text-slate-400">STANDBY</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      )}
    </div>
  );
}
