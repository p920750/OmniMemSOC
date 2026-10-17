'use client';

import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
  fetchHandoffs,
  fetchSwarmStatus,
  triggerSwarmPipeline,
  HandoffRecord,
  SwarmStatusResponse,
  PipelineExecutionResult,
} from '@/lib/api';
import AgentHandoffVisualizer from '../../components/AgentHandoffVisualizer';
import {
  Play,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Radio,
  FileCode,
  Database,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  Server,
  Zap,
  Flame,
} from 'lucide-react';

interface AttackScenario {
  id: string;
  name: string;
  title: string;
  technique: string;
  target_host: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  indicators: string[];
  tags: string[];
  desc: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ATTACK_SCENARIOS: AttackScenario[] = [
  {
    id: 'kerberoasting',
    name: 'Kerberoasting Attack',
    title: 'Kerberoasting & RC4 Ticket Extraction on DC',
    technique: 'T1558.003 - Kerberoasting',
    target_host: 'DC-01-AUTH',
    severity: 'CRITICAL',
    indicators: ['svc_backup', '10.0.12.5', 'RC4-HMAC', 'Port:88'],
    tags: ['ActiveDirectory', 'Kerberos', 'PrivilegeEscalation'],
    desc: 'Requests Kerberos TGS tickets with RC4 encryption for offline password cracking against domain accounts.',
    accentBorder: 'border-rose-500/40 hover:border-rose-400',
    accentBg: 'bg-rose-950/20 hover:bg-rose-950/30',
    accentText: 'text-rose-400',
    badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800',
    icon: ShieldAlert,
  },
  {
    id: 'c2-beaconing',
    name: 'C2 Beaconing Traffic',
    title: 'Anomalous Outbound C2 Beaconing on Port 2222',
    technique: 'T1071.001 - Web Protocols / C2',
    target_host: 'Workstation-04',
    severity: 'HIGH',
    indicators: ['198.51.100.23', 'TCP:2222', 'Jitter:15%', 'Interval:45s'],
    tags: ['CommandAndControl', 'Exfiltration', 'Beaconing'],
    desc: 'Periodic jittered outbound network telemetry communicating with an external hostile infrastructure.',
    accentBorder: 'border-amber-500/40 hover:border-amber-400',
    accentBg: 'bg-amber-950/20 hover:bg-amber-950/30',
    accentText: 'text-amber-400',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800',
    icon: Radio,
  },
  {
    id: 'ransomware-staging',
    name: 'Ransomware Staging',
    title: 'Ransomware Staging & Volume Shadow Deletion',
    technique: 'T1486 - Data Encrypted for Impact',
    target_host: 'FileServer-02',
    severity: 'CRITICAL',
    indicators: ['vssadmin.exe delete shadows', 'crypt_header.bin', 'bulk_write_burst'],
    tags: ['Ransomware', 'Impact', 'StorageDisruption'],
    desc: 'Volume shadow copy purge attempt coupled with high entropy batch file writes on shared storage.',
    accentBorder: 'border-purple-500/40 hover:border-purple-400',
    accentBg: 'bg-purple-950/20 hover:bg-purple-950/30',
    accentText: 'text-purple-400',
    badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-800',
    icon: Flame,
  },
];

export default function SwarmCoordinationPage() {
  const { activeTenant, activeTenantData } = useTenant();

  // State
  const [handoffs, setHandoffs] = useState<HandoffRecord[]>([]);
  const [selectedHandoff, setSelectedHandoff] = useState<HandoffRecord | null>(null);
  const [swarmStatus, setSwarmStatus] = useState<SwarmStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingScenarioId, setExecutingScenarioId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [copiedJson, setCopiedJson] = useState(false);
  const [lastResult, setLastResult] = useState<PipelineExecutionResult | null>(null);

  // Load telemetry and handoffs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [hData, sData] = await Promise.all([
        fetchHandoffs(activeTenant),
        fetchSwarmStatus(),
      ]);
      setHandoffs(hData);
      setSwarmStatus(sData);
      if (hData.length > 0 && !selectedHandoff) {
        setSelectedHandoff(hData[0]);
      }
    } catch (err) {
      console.warn('Error loading swarm telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTenant]);

  // Execute scenario pipeline
  const handleRunScenario = async (scenario: AttackScenario) => {
    setIsExecuting(true);
    setExecutingScenarioId(scenario.id);
    setActiveStep(1); // Triage

    // Stagger step animations
    const t1 = setTimeout(() => setActiveStep(2), 600); // Containment
    const t2 = setTimeout(() => setActiveStep(3), 1200); // Forensic
    const t3 = setTimeout(() => setActiveStep(4), 1800); // FalkorDB Graph

    try {
      const result = await triggerSwarmPipeline(activeTenant, {
        title: scenario.title,
        severity: scenario.severity,
        target_host: scenario.target_host,
        indicators: scenario.indicators,
        technique: scenario.technique,
        tags: scenario.tags,
      });

      setLastResult(result);

      // Create new client-side handoff records from result if returned
      const newHandoffs: HandoffRecord[] = (result.handoff_trail || []).map((trail, idx) => ({
        id: trail.id || `ho-gen-${Date.now()}-${idx}`,
        handoff_id: trail.id || `ho-gen-${Date.now()}-${idx}`,
        from_agent: trail.from_agent,
        to_agent: trail.to_agent,
        incident_id: result.incident_id,
        timestamp: new Date().toISOString(),
        reason: trail.reason,
        status: (trail.status as any) || 'COMPLETED',
        payload: {
          incident_id: result.incident_id,
          target_asset: result.triage.target_asset,
          severity: result.triage.severity,
          technique: result.triage.technique,
          containment_status: result.containment.mitigation_status,
          compromised_nodes_count: result.forensics.compromised_nodes_count,
          falkordb_subgraph: `graph_${activeTenant.replace(/-/g, '_')}`,
        },
      }));

      if (newHandoffs.length > 0) {
        setHandoffs((prev) => [...newHandoffs, ...prev]);
        setSelectedHandoff(newHandoffs[0]);
      } else {
        await loadData();
      }
    } catch (e) {
      console.error('Scenario execution error:', e);
      // Fallback: reload existing handoffs
      await loadData();
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setTimeout(() => {
        setIsExecuting(false);
        setExecutingScenarioId(null);
        setActiveStep(0);
      }, 2400);
    }
  };

  const handleCopyJson = () => {
    if (!selectedHandoff) return;
    const content = JSON.stringify(
      selectedHandoff.payload || selectedHandoff.context_payload || selectedHandoff,
      null,
      2
    );
    navigator.clipboard.writeText(content);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>AGENT SWARM COORDINATION & HANDOFF STUDIO</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>Autonomous Swarm Coordination</span>
              <span className="text-[11px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-normal">
                {activeTenantData?.name || activeTenant}
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl">
              Real-time multi-agent orchestration of specialized defense agents. Context is serialized into FalkorDB
              <code className="text-cyan-300 mx-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-xs">(:AgentHandoff)</code>
              nodes for immutable cross-agent provenance and Zero-Trust containment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center space-x-2 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-xs text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span>Consensus: <strong className="text-emerald-300">ACTIVE</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Attack Scenario Launchpad Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Simulate Security Attack Scenarios (Autonomous Pipeline Trigger)</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Target Partition: <strong className="text-slate-400">graph_{activeTenant.replace(/-/g, '_')}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ATTACK_SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            const isThisRunning = isExecuting && executingScenarioId === sc.id;

            return (
              <div
                key={sc.id}
                className={`p-4 rounded-xl border ${sc.accentBorder} ${sc.accentBg} transition-all duration-300 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${sc.badgeBg} border`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold font-mono text-white">
                        {sc.name}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sc.badgeBg}`}>
                      {sc.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {sc.desc}
                  </p>

                  <div className="space-y-1 mb-4 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Technique:</span>
                      <span className="text-slate-300">{sc.technique}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Target Host:</span>
                      <span className="text-cyan-300 font-semibold">{sc.target_host}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRunScenario(sc)}
                  disabled={isExecuting}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-all ${
                    isThisRunning
                      ? 'bg-amber-600 text-white animate-pulse'
                      : isExecuting
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                  }`}
                >
                  {isThisRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>ORCHESTRATING PIPELINE...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>LAUNCH ATTACK SCENARIO</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Visualizer Component */}
      <AgentHandoffVisualizer
        handoffs={handoffs}
        activeHandoffId={selectedHandoff?.handoff_id || selectedHandoff?.id}
        onSelectHandoff={(h) => setSelectedHandoff(h)}
        isExecuting={isExecuting}
        activeStep={activeStep}
      />

      {/* Bottom Grid: Serialized Payload Inspector & Swarm Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Serialized FalkorDB (:AgentHandoff) Payload Inspector */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Serialized FalkorDB Node Payload
                </h3>
                {selectedHandoff && (
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    [{selectedHandoff.handoff_id || selectedHandoff.id}]
                  </span>
                )}
              </div>
              <button
                onClick={handleCopyJson}
                disabled={!selectedHandoff}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center space-x-1.5 transition-colors border border-slate-700"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            {selectedHandoff ? (
              <div className="space-y-3">
                {/* Context Header */}
                <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400">From:</span>
                  <span className="text-blue-300 font-bold">{selectedHandoff.from_agent}</span>
                  <span className="text-slate-600">➔</span>
                  <span className="text-slate-400">To:</span>
                  <span className="text-purple-300 font-bold">{selectedHandoff.to_agent}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">Incident:</span>
                  <span className="text-cyan-300">{selectedHandoff.incident_id}</span>
                </div>

                {/* JSON Viewer */}
                <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto max-h-[380px] leading-relaxed select-all">
                  {JSON.stringify(
                    selectedHandoff.payload || selectedHandoff.context_payload || selectedHandoff,
                    null,
                    2
                  )}
                </pre>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                Select a handoff record from the stream above to inspect its serialized graph context.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>Graph Format: OpenCypher (:AgentHandoff)</span>
            <span className="text-cyan-400">Schema Version 2.4</span>
          </div>
        </div>

        {/* Right: Swarm Consensus & SOC Guardrails */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Swarm Consensus Telemetry & Guardrail Policies</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                ZERO-TRUST ENFORCED
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Containment Authorization Threshold</div>
                  <div className="text-[11px] text-slate-400">Requires 95% certainty before endpoint network quarantine</div>
                </div>
                <span className="font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800">
                  98.4% Confidence
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Human-In-The-Loop Fallback</div>
                  <div className="text-[11px] text-slate-400">Operator override channel for Tier-1 infrastructure</div>
                </div>
                <span className="font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  Standby (Bypass P1)
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">FalkorDB Memory Persistence Sync</div>
                  <div className="text-[11px] text-slate-400">Write-through graph commit before next agent step execution</div>
                </div>
                <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800">
                  Real-Time ACID
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Mitigation Rollback Journal</div>
                  <div className="text-[11px] text-slate-400">Rollback checkpoints generated for each containment action</div>
                </div>
                <span className="font-mono text-amber-400 bg-amber-950/60 px-2 py-1 rounded border border-amber-800">
                  Active (4 Checkpoints)
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Multi-Tenant Namespace Isolation</div>
                  <div className="text-[11px] text-slate-400">Independent FalkorDB graph namespace per enterprise tenant</div>
                </div>
                <span className="font-mono text-purple-400 bg-purple-950/60 px-2 py-1 rounded border border-purple-800">
                  Strictly Partitioned
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>Swarm Health: All 3 Agents Online</span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>100% Operational</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
