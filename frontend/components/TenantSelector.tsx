'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { Layers, ChevronDown, Check, Database, Shield } from 'lucide-react';

interface TenantSelectorProps {
  onTenantChange?: (tenantId: string) => void;
  isFullWidth?: boolean;
  className?: string;
}

export default function TenantSelector({
  onTenantChange,
  isFullWidth = false,
  className = '',
}: TenantSelectorProps) {
  const { activeTenant, activeTenantData, tenants, setActiveTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tenantId: string) => {
    setActiveTenant(tenantId);
    setIsOpen(false);
    if (onTenantChange) {
      onTenantChange(tenantId);
    }
  };

  return (
    <div className={`relative ${isFullWidth ? 'w-full' : ''} ${className}`} ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between space-x-2 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/60 text-slate-200 rounded-lg px-2.5 sm:px-3 py-1.5 transition-all text-xs font-mono shadow-sm group ${
          isFullWidth ? 'w-full' : 'w-full max-w-[190px] sm:max-w-xs'
        }`}
      >
        <div className="flex items-center space-x-2 overflow-hidden">
          <span className="flex items-center justify-center w-5 h-5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shrink-0">
            <Layers className="w-3 h-3" />
          </span>
          <div className="flex flex-col text-left overflow-hidden">
            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-400 font-sans hidden sm:inline">
              Partition Context
            </span>
            <span className="font-semibold text-cyan-300 text-[11px] sm:text-xs truncate">
              {activeTenantData?.name || activeTenant}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-slate-300'
          }`}
        />
      </button>

      {/* Cyber SOC Popover Menu */}
      {isOpen && (
        <div
          className={`absolute mt-2 bg-[#0e1424] border border-slate-700 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            isFullWidth
              ? 'w-full left-0 right-0 max-w-full'
              : 'right-0 w-72 max-w-[calc(100vw-1.5rem)]'
          }`}
        >
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>FALKORDB GRAPH SPACES</span>
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
              ISOLATED
            </span>
          </div>

          <div className="space-y-1">
            {tenants.map((t) => {
              const isSelected = t.id === activeTenant;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`w-full flex items-start justify-between p-2.5 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-950/50 border border-cyan-500/40 text-cyan-100'
                      : 'hover:bg-slate-800/60 border border-transparent text-slate-300 hover:text-slate-100'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold">{t.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Namespace: <span className="text-cyan-400/90">{t.graph_namespace}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{t.industry}</div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                    {t.id}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-cyan-500" />
              <span>Zero Cross-Tenant Leakage</span>
            </span>
            <span>ACL Enabled</span>
          </div>
        </div>
      )}
    </div>
  );
}
