'use client';

import React from 'react';
import { HandoffRecord } from '@/lib/api';
import {
  ShieldAlert,
  ShieldCheck,
  GitBranch,
  Database,
  ArrowRight,
  Clock,
  Activity,
  Layers,
  ChevronRight,
  Cpu,
  Sparkles,
} from 'lucide-react';

export interface AgentHandoffVisualizerProps {
  handoffs: HandoffRecord[];
  activeHandoffId?: string;
  onSelectHandoff?: (handoff: HandoffRecord) => void;
  isExecuting?: boolean;
  activeStep?: number; // 0: Idle, 1: Triage, 2: Containment, 3: Forensic, 4: Persistent
}

export default function AgentHandoffVisualizer({
  handoffs = [],
  activeHandoffId,
  onSelectHandoff,
  isExecuting = false,
  activeStep = 0,
}: AgentHandoffVisualizerProps) {
  // Swarm Agent Topology definition
  const agents = [
    {
      id: 'TriageAgent',
      name: 'TriageAgent',
      stepNum: '01',
      icon: ShieldAlert,
      role: 'Alert Validation & Severity',
      desc: 'Correlates incoming security alerts against episodic memory graphs to determine blast radius.',
      borderColor: 'border-blue-500/40',
      activeBorderColor: 'border-blue-400 ring-2 ring-blue-500/40',
      bgGlow: 'bg-blue-950/20',
      textAccent: 'text-blue-400',
      badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-800',
      stepMatch: 1,
    },
    {
      id: 'ContainmentAgent',
      name: 'ContainmentAgent',
      stepNum: '02',
      icon: ShieldCheck,
      role: 'Automated Quarantine & Mitigation',
      desc: 'Applies procedural runbooks to quarantine compromised assets and revoke Active Directory tickets.',
      borderColor: 'border-amber-500/40',
      activeBorderColor: 'border-amber-400 ring-2 ring-amber-500/40',
      bgGlow: 'bg-amber-950/20',
      textAccent: 'text-amber-400',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800',
      stepMatch: 2,
    },
    {
      id: 'ForensicAgent',
      name: 'ForensicAgent',
      stepNum: '03',
      icon: GitBranch,
      role: 'Graph Forensics & Path Reconstruction',
      desc: 'Traverses FalkorDB subgraphs to discover lateral movement vectors and synthesizes semantic IOCs.',
      borderColor: 'border-purple-500/40',
      activeBorderColor: 'border-purple-400 ring-2 ring-purple-500/40',
      bgGlow: 'bg-purple-950/20',
      textAccent: 'text-purple-400',
      badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-800',
      stepMatch: 3,
    },
    {
      id: 'FalkorDBMemory',
      name: 'FalkorDB Memory Engine',
      stepNum: '04',
      icon: Database,
      role: 'Graph State & Vector Indexing',
      desc: 'Persists serialized (:AgentHandoff) nodes and 1536-dim vector embeddings with multi-tenant isolation.',
      borderColor: 'border-emerald-500/40',
      activeBorderColor: 'border-emerald-400 ring-2 ring-emerald-500/40',
      bgGlow: 'bg-emerald-950/20',
      textAccent: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
      stepMatch: 4,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Real-time Execution Banner */}
      {isExecuting && (
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-slate-900 border border-cyan-500/50 rounded-xl flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="font-mono font-semibold text-cyan-300">
              AUTONOMOUS SWARM ACTIVE:
            </span>
            <span className="text-slate-300">
              Executing multi-agent handoffs & committing state to FalkorDB graph...
            </span>
          </div>
          <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700">
            FalkorDB Write-Through
          </span>
        </div>
      )}

      {/* Agent Topology Pipeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Multi-Agent Topology & Consensus Flow</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Protocol: FalkorDB Graph State Machine (OpenCypher)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isCurrentlyProcessing =
              isExecuting && activeStep === agent.stepMatch;
            const isFinished = isExecuting && activeStep > agent.stepMatch;

            return (
              <div
                key={agent.id}
                className={`relative p-4 rounded-xl border ${
                  isCurrentlyProcessing
                    ? agent.activeBorderColor
                    : agent.borderColor
                } ${agent.bgGlow} bg-slate-900/60 backdrop-blur-sm transition-all duration-300 hover:border-slate-600 flex flex-col justify-between`}
              >
                {/* Step indicator & Name */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${agent.badgeBg} border`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold font-mono text-white">
                        {agent.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                      Step {agent.stepNum}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono font-medium text-slate-300 mb-1">
                    {agent.role}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {agent.desc}
                  </p>
                </div>

                {/* Agent State Footer */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">State</span>
                  {isCurrentlyProcessing ? (
                    <span className="text-amber-400 flex items-center space-x-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>PROCESSING</span>
                    </span>
                  ) : isFinished ? (
                    <span className="text-emerald-400 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>COMPLETED</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>SYNCHRONIZED</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context Provenance Trail */}
      <div className="p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] text-xs font-mono">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>CONTEXT PROVENANCE:</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Alert Trigger
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
              Triage Validation
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              (:AgentHandoff ho-101)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
              Quarantine Enforced
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
              (:AgentHandoff ho-102)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              FalkorDB Graph Vector
            </span>
          </div>
        </div>
      </div>

      {/* Handoff Stream Log */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Serialized FalkorDB (:AgentHandoff) Graph Nodes</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any handoff node below to inspect its serialized graph context and payload.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800 self-start sm:self-auto">
            {handoffs.length} Graph Handoffs Recorded
          </span>
        </div>

        {handoffs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono text-xs">
            No agent handoffs recorded for this tenant yet. Trigger an attack scenario above.
          </div>
        ) : (
          <div className="space-y-3">
            {handoffs.map((h) => {
              const isSelected = activeHandoffId === (h.handoff_id || h.id);
              const status = (h.status || 'COMPLETED').toUpperCase();

              const statusBadge =
                status === 'COMPLETED'
                  ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800'
                  : status === 'IN_PROGRESS' || status === 'INITIATED'
                  ? 'text-amber-400 bg-amber-950/70 border-amber-800 animate-pulse'
                  : 'text-slate-400 bg-slate-800 border-slate-700';

              return (
                <div
                  key={h.id || h.handoff_id}
                  onClick={() => onSelectHandoff && onSelectHandoff(h)}
                  className={`cursor-pointer p-4 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/70 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    {/* From -> To Agents */}
                    <div className="flex items-center space-x-2 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                        {h.from_agent}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                        {h.to_agent}
                      </span>
                      <span className="font-mono text-cyan-400 text-[11px] font-semibold">
                        [{h.handoff_id || h.id}]
                      </span>
                      {h.incident_id && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {h.incident_id}
                        </span>
                      )}
                    </div>

                    {/* Status & Timestamp */}
                    <div className="flex items-center space-x-3 text-[11px] font-mono">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${statusBadge}`}>
                        {status}
                      </span>
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>
                          {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : 'Recent'}
                        </span>
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-cyan-400 rotate-90' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Reason & Payload metadata */}
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    {h.reason}
                  </p>

                  {/* Payload quick glance pills */}
                  {h.payload && (
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 flex-wrap gap-y-1">
                      {h.payload.target_asset && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          Target: <strong className="text-cyan-300">{h.payload.target_asset}</strong>
                        </span>
                      )}
                      {h.payload.technique && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          Technique: <strong className="text-amber-300">{h.payload.technique}</strong>
                        </span>
                      )}
                      {h.payload.isolation_status && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          Isolation: <strong className="text-emerald-300">{h.payload.isolation_status}</strong>
                        </span>
                      )}
                      {h.payload.falkordb_subgraph && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          Graph: <strong className="text-purple-300">{h.payload.falkordb_subgraph}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
