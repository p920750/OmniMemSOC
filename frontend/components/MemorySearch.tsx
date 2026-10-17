'use client';

import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Filter, X, SlidersHorizontal, ArrowRight } from 'lucide-react';

export type MemoryLayerType = 'ALL' | 'EPISODIC' | 'SEMANTIC' | 'PROCEDURAL';

export interface MemorySearchParams {
  query: string;
  memoryType: MemoryLayerType;
  severity: string;
  k: number;
  threshold: number;
}

export interface MemorySearchProps {
  onSearch: (params: MemorySearchParams) => void;
  initialParams?: Partial<MemorySearchParams>;
  isLoading?: boolean;
}

const SUGGESTED_QUERIES = [
  { label: 'Kerberoasting T1558.003', query: 'Kerberoasting T1558.003', type: 'EPISODIC' as MemoryLayerType },
  { label: 'C2 Beaconing T1071.001', query: 'C2 Beaconing T1071.001', type: 'SEMANTIC' as MemoryLayerType },
  { label: 'Domain Controller Isolation', query: 'Domain Controller Isolation', type: 'PROCEDURAL' as MemoryLayerType },
  { label: 'Ransomware VSS Purge', query: 'vssadmin delete shadows ransomware', type: 'SEMANTIC' as MemoryLayerType },
  { label: 'Password Spray SSO', query: 'Password Spraying T1110.003', type: 'EPISODIC' as MemoryLayerType },
];

export default function MemorySearch({
  onSearch,
  initialParams,
  isLoading = false,
}: MemorySearchProps) {
  const [query, setQuery] = useState(initialParams?.query || '');
  const [memoryType, setMemoryType] = useState<MemoryLayerType>(
    initialParams?.memoryType || 'ALL'
  );
  const [severity, setSeverity] = useState(initialParams?.severity || 'ALL');
  const [k, setK] = useState(initialParams?.k || 5);
  const [threshold, setThreshold] = useState(initialParams?.threshold || 0.0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (initialParams?.query !== undefined) setQuery(initialParams.query);
    if (initialParams?.memoryType !== undefined) setMemoryType(initialParams.memoryType);
    if (initialParams?.severity !== undefined) setSeverity(initialParams.severity);
  }, [initialParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query,
      memoryType,
      severity,
      k,
      threshold,
    });
  };

  const handlePillClick = (suggestion: typeof SUGGESTED_QUERIES[0]) => {
    setQuery(suggestion.query);
    setMemoryType(suggestion.type);
    onSearch({
      query: suggestion.query,
      memoryType: suggestion.type,
      severity,
      k,
      threshold,
    });
  };

  const handleClear = () => {
    setQuery('');
    setSeverity('ALL');
    setThreshold(0.0);
    onSearch({
      query: '',
      memoryType,
      severity: 'ALL',
      k: 5,
      threshold: 0.0,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5 shadow-lg shadow-black/40 backdrop-blur-sm space-y-4"
    >
      {/* Primary Search Inputs Row */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search Query Input */}
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search episodic incidents, dense 1536-dim vector chunks, or procedural runbooks..."
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-mono transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Memory Layer Selector */}
        <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-2">
          <select
            value={memoryType}
            onChange={(e) => setMemoryType(e.target.value as MemoryLayerType)}
            className="flex-1 sm:flex-none bg-slate-950 border border-slate-700/80 text-slate-300 text-xs rounded-lg px-3 py-2.5 font-mono focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Memory Layers</option>
            <option value="EPISODIC">Episodic (Incidents & Events)</option>
            <option value="SEMANTIC">Semantic (1536-dim Vectors)</option>
            <option value="PROCEDURAL">Procedural (Runbooks & Playbooks)</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-950 border border-slate-700/80 text-slate-300 text-xs rounded-lg px-3 py-2.5 font-mono focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Severity</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>

          {/* Advanced Vector Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2.5 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center shrink-0 ${
              showAdvanced
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Vector Search Parameters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold font-mono px-5 py-2.5 rounded-lg transition-all shadow-md shadow-cyan-950/50 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                <span>QUERYING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>SEARCH MEMORY</span>
              </>
            )}
          </button>

          {(query || severity !== 'ALL' || threshold > 0) && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
              title="Reset Search Filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Advanced Vector Parameters Drawer */}
      {showAdvanced && (
        <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <span className="text-slate-400">Vector Top-K Results:</span>
            <div className="flex space-x-1.5">
              {[3, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setK(num)}
                  className={`px-2.5 py-1 rounded border text-[11px] ${
                    k === num
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-600 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <span className="text-slate-400">Min Cosine Threshold:</span>
            <input
              type="range"
              min="0.0"
              max="0.9"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="accent-cyan-500 w-32 cursor-pointer"
            />
            <span className="text-cyan-300 font-bold w-12 text-right">
              ≥ {threshold.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Suggested Quick Filter Pills */}
      <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 flex-wrap gap-y-1.5">
        <span className="text-slate-500 flex items-center space-x-1">
          <Filter className="w-3 h-3 text-cyan-400" />
          <span>Suggested Memory Queries:</span>
        </span>
        {SUGGESTED_QUERIES.map((sugg) => (
          <button
            key={sugg.label}
            type="button"
            onClick={() => handlePillClick(sugg)}
            className="px-2.5 py-1 rounded bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-800/80 transition-colors flex items-center space-x-1 text-[10px]"
          >
            <span>{sugg.label}</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
          </button>
        ))}
      </div>
    </form>
  );
}
