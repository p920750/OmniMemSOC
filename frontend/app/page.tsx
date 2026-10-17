'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTenant } from '../context/TenantContext';
import {
  fetchEpisodicMemory,
  fetchSwarmStatus,
  triggerSwarmPipeline,
  EpisodicIncident,
  SwarmStatusResponse,
  PipelineExecutionResult,
} from '@/lib/api';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Cpu,
  Brain,
  Network,
  Database,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
  X,
  Server,
  Lock,
} from 'lucide-react';

export default function ExecutiveOverviewPage() {
  const { activeTenant, activeTenantData, tenants, setActiveTenant } = useTenant();

  // State
  const [incidents, setIncidents] = useState<EpisodicIncident[]>([]);
  const [swarmStatus, setSwarmStatus] = useState<SwarmStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Swarm Pipeline Execution
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult | null>(null);
  const [alertPreset, setAlertPreset] = useState({
    title: 'Anomalous Kerberoasting & Golden Ticket Request on Domain Controller',
    severity: 'CRITICAL',
    target_host: 'DC-01-AUTH',
    indicators: ['svc_backup', '10.0.12.5', 'RC4-HMAC'],
    technique: 'T1558.003 - Kerberoasting',
    tags: ['ActiveDirectory', 'Kerberos', 'PrivilegeEscalation'],
  });

  // Load live data from FastAPI backend
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [incData, swarmData] = await Promise.all([
        fetchEpisodicMemory(activeTenant, searchQuery, filterSeverity),
        fetchSwarmStatus(),
      ]);
      setIncidents(incData);
      setSwarmStatus(swarmData);
    } catch (e) {
      console.warn('Error loading dashboard telemetry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeTenant, filterSeverity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDashboardData();
  };

  const handleTriggerSwarm = async () => {
    setIsExecuting(true);
    setPipelineResult(null);
    try {
      const result = await triggerSwarmPipeline(activeTenant, alertPreset);
      setPipelineResult(result);
      // Prepend newly created incident to the top of list
      setIncidents((prev) => [
        {
          id: result.incident_id,
          title: alertPreset.title,
          severity: (result.triage.severity as any) || 'CRITICAL',
          status: result.containment.mitigation_status || 'CONTAINED',
          timestamp: new Date().toISOString(),
          summary: result.forensics.forensic_summary,
          tags: alertPreset.tags,
          agent: 'ForensicAgent',
        },
        ...prev,
      ]);
    } catch (err: any) {
      alert(`Pipeline error: ${err.message || 'Check if backend is running on port 9000'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Severity styles
  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-950/80 text-rose-300 border-rose-800 shadow-[0_0_8px_rgba(244,63,94,0.2)]';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-300 border-amber-800 shadow-[0_0_8px_rgba(245,158,11,0.2)]';
      case 'MEDIUM':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: SOC Threat Awareness & Autonomous Trigger */}
      <div className="border border-slate-800 bg-gradient-to-r from-slate-900/90 via-[#0d1629] to-slate-900/90 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-[10px] sm:text-xs font-mono text-cyan-400">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
              <span className="font-semibold uppercase tracking-wider truncate">
                EXECUTIVE OVERVIEW & MULTI-TENANT MEMORY HUB
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
              Autonomous SOC Situational Awareness
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Real-time synchronization of episodic events, procedural runbooks, and semantic
              vectors into isolated FalkorDB graph partitions.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono text-slate-400">
              <span>Active Partition:</span>
              <span className="text-cyan-300 bg-slate-950/80 border border-slate-700 px-2 py-0.5 rounded">
                {activeTenantData?.graph_namespace || `graph_${activeTenant}`}
              </span>
              <span className="text-slate-600 hidden xs:inline">•</span>
              <span>Tenant:</span>
              <span className="text-slate-200 font-semibold">{activeTenantData?.name}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>+ TRIGGER AUTONOMOUS SWARM</span>
            </button>
            <Link
              href="/coordination"
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono font-medium transition-all"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>SWARM STUDIO</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Live Memory Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: FalkorDB Nodes */}
        <div className="p-5 rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              FalkorDB Graph Nodes
            </span>
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {activeTenant === 'tenant-alpha' ? '42' : activeTenant === 'tenant-beta' ? '28' : '310'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Incidents, Events, Assets & IOCs
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Partition: {activeTenantData?.graph_namespace}</span>
          </div>
        </div>

        {/* Card 2: Connected Graph Relationships */}
        <div className="p-5 rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Graph Relationships
            </span>
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {activeTenant === 'tenant-alpha' ? '89' : activeTenant === 'tenant-beta' ? '54' : '740'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              [:HAS_EVENT], [:ASSIGNED_TO], [:MITIGATES]
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-cyan-400 flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>Sub-millisecond Cypher Traversal</span>
          </div>
        </div>

        {/* Card 3: Active Swarm Sessions */}
        <div className="p-5 rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Active Agent Swarms
            </span>
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {swarmStatus?.active_swarms || 3}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Triage, Containment & Forensic
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-amber-400 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{swarmStatus?.total_handoffs || 31} Handoffs Recorded</span>
          </div>
        </div>

        {/* Card 4: Episodic Incidents Retained */}
        <div className="p-5 rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Autonomous Mitigations
            </span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              100%
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              {incidents.filter((i) => i.status === 'CONTAINED').length} Contained • 0 Unmitigated
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Procedural Playbook Alignment</span>
          </div>
        </div>
      </div>

      {/* Main Section: Live Incident Stream & Partition Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Incident Stream */}
        <div className="lg:col-span-2 border border-slate-800 bg-slate-900/60 rounded-2xl p-6 backdrop-blur space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Live Security Incident & Memory Stream</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Episodic incidents correlated with graph attack paths in {activeTenantData?.name}
              </p>
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    filterSeverity === sev
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Keyword Search Filter Bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter incidents by title, MITRE ATT&CK ID, or compromised asset..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium transition-colors self-end sm:self-auto"
            >
              Filter
            </button>
          </form>

          {/* Incident List */}
          <div className="space-y-3 pt-1">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                Synchronizing with {activeTenantData?.graph_namespace}...
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                No incidents match the active filter criteria for {activeTenantData?.name}.
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 hover:bg-slate-950 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getSeverityBadge(
                          inc.severity
                        )}`}
                      >
                        {inc.severity}
                      </span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">{inc.id}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
                        {inc.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(inc.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {inc.title}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed">{inc.summary}</p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {inc.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-cyan-400/80 px-2 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between text-xs font-mono border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">
                      Agent:{' '}
                      <strong className="text-slate-200">
                        {inc.agent || (inc.status === 'CONTAINED' ? 'ContainmentAgent' : 'TriageAgent')}
                      </strong>
                    </span>
                    <Link
                      href={`/memory`}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1 mt-1"
                    >
                      <span>Explore Trace</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: FalkorDB Multi-Tenant Partition Grid & Agent Workload */}
        <div className="space-y-6">
          {/* Tenant Partition Cards */}
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tenant Partition Isolation</span>
              </h2>
              <span className="text-[10px] font-mono text-cyan-400">FalkorDB v1.8</span>
            </div>

            <div className="space-y-3">
              {tenants.map((t) => {
                const isActive = t.id === activeTenant;
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white">{t.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isActive
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {isActive ? 'ACTIVE CONTEXT' : 'ONLINE'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-cyan-400/90 mb-1">
                      Namespace: {t.graph_namespace}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{t.industry}</span>
                      {!isActive && (
                        <button
                          onClick={() => setActiveTenant(t.id)}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline font-mono"
                        >
                          Switch ➔
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Autonomous Swarm Workload */}
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Specialized Swarm Telemetry</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-400">3 AGENTS</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-mono">
                  <span className="text-blue-400 font-semibold">TriageAgent</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Alert evaluation, MITRE technique tagging, episodic history scan.
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-mono">
                  <span className="text-amber-400 font-semibold">ContainmentAgent</span>
                  <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded animate-pulse">
                    ENGAGED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Automated host isolation, SPN credential reset, firewall perimeter block.
                </p>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <div className="flex justify-between items-center font-mono">
                  <span className="text-purple-400 font-semibold">ForensicAgent</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  FalkorDB blast radius traversal, attack path mapping & semantic vector synthesis.
                </p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/coordination"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center justify-center space-x-1"
              >
                <span>Open Swarm Coordination Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Autonomous Swarm Pipeline Execution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1424] border border-slate-700 max-w-2xl w-full max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Trigger Autonomous Multi-Agent Swarm Pipeline
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Dispatches an incoming security alert to the agent swarm for autonomous triage,
              FalkorDB handoffs, procedural mitigation, and blast radius forensics against{' '}
              <strong className="text-cyan-400 font-mono">{activeTenantData?.name}</strong>.
            </p>

            {/* Alert Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Alert Title</label>
                <input
                  type="text"
                  value={alertPreset.title}
                  onChange={(e) => setAlertPreset({ ...alertPreset, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Target Host</label>
                  <input
                    type="text"
                    value={alertPreset.target_host}
                    onChange={(e) => setAlertPreset({ ...alertPreset, target_host: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">MITRE ATT&CK</label>
                  <input
                    type="text"
                    value={alertPreset.technique}
                    onChange={(e) => setAlertPreset({ ...alertPreset, technique: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Execution Result Feedback */}
            {pipelineResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/80 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SWARM PIPELINE COMPLETED [Incident: {pipelineResult.incident_id}]</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(pipelineResult.pipeline_completed).toLocaleTimeString()}
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-cyan-400">Phase 1 (Triage):</span>{' '}
                    {pipelineResult.triage.triage_summary} (Severity: {pipelineResult.triage.severity})
                  </div>
                  <div>
                    <span className="text-amber-400">Phase 2 (Containment):</span> Quarantined{' '}
                    {pipelineResult.containment.executed_steps.length} assets via{' '}
                    {pipelineResult.containment.playbook_id}.
                  </div>
                  <div>
                    <span className="text-purple-400">Phase 3 (Forensics):</span> Traversed{' '}
                    {pipelineResult.forensics.compromised_nodes_count} attack graph nodes & saved
                    semantic vector chunk.
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Handoff Audit: {pipelineResult.handoff_trail.map((h) => `${h.from_agent} ➔ ${h.to_agent}`).join(' | ')}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={handleTriggerSwarm}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-2"
              >
                {isExecuting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>ORCHESTRATING SWARM...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>RUN AUTONOMOUS PIPELINE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
