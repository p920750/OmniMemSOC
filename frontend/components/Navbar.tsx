'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TenantSelector from './TenantSelector';
import { fetchHealth, HealthResponse } from '@/lib/api';
import {
  Shield,
  Activity,
  Layers,
  Cpu,
  Brain,
  Network,
  Radio,
  RefreshCw,
  Menu,
  X,
  Database,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthResponse>({
    status: 'checking',
    app: 'OmniMemSOC API',
    falkordb_connected: false,
    falkordb_host: 'localhost:6379',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch {
      setHealth({
        status: 'offline',
        app: 'OmniMemSOC API',
        falkordb_connected: false,
        falkordb_host: 'localhost:6379',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Periodic health check every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Executive Overview', href: '/', icon: Shield },
    { label: 'Agent Handoff Studio', href: '/coordination', icon: Cpu },
    { label: 'Memory Explorer', href: '/memory', icon: Brain },
    { label: 'Graph Analytics', href: '/analytics', icon: Network },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#0a0e1a]/95 backdrop-blur-md sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Desktop Links */}
        <div className="flex items-center space-x-6 xl:space-x-8">
          <Link href="/" className="flex items-center space-x-2.5 group shrink-0">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
            </span>
            <div className="flex flex-col">
              <div className="font-extrabold tracking-wider text-white text-base font-mono flex items-center space-x-1">
                <span>OmniMem</span>
                <span className="text-cyan-400">SOC</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest -mt-1 hidden xs:inline">
                Autonomous Memory Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex space-x-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Responsive Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Tenant Selector: visible in top bar on tablet & desktop (>= 640px) */}
          <div className="hidden sm:block">
            <TenantSelector />
          </div>

          {/* Backend / FalkorDB Status Badge: visible on md+ (>= 768px) */}
          <div
            title={`Backend: ${health.app} • FalkorDB: ${health.falkordb_host}`}
            className="hidden md:flex items-center space-x-2 border border-slate-800 bg-slate-900/80 rounded-lg px-2.5 py-1 text-[11px] font-mono shadow-inner cursor-pointer"
            onClick={checkHealth}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                health.falkordb_connected
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : health.status === 'healthy'
                  ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                  : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              }`}
            ></span>
            <span
              className={`text-[11px] ${
                health.falkordb_connected
                  ? 'text-emerald-300 font-semibold'
                  : 'text-amber-300 font-semibold'
              }`}
            >
              {health.falkordb_connected
                ? 'FALKORDB ACTIVE'
                : health.status === 'healthy'
                ? 'CORE API LIVE'
                : 'DEV PREVIEW'}
            </span>
            <RefreshCw
              className={`w-3 h-3 text-slate-500 hover:text-cyan-400 transition-all shrink-0 ${
                isRefreshing ? 'animate-spin text-cyan-400' : ''
              }`}
            />
          </div>

          {/* Mobile/Tablet Hamburger Toggle Button (< 1024px) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700 lg:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-cyan-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Slide-Down Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800/80 bg-[#0c101c]/98 backdrop-blur-xl px-4 py-4 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-150">
          {/* Mobile Tenant Selector (Visible on < 640px) */}
          <div className="sm:hidden space-y-1.5 pb-3 border-b border-slate-800/80">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Tenant Graph Partition
            </div>
            <TenantSelector isFullWidth={true} />
          </div>

          {/* Mobile Status Pill (Visible on < 768px) */}
          <div className="md:hidden flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  health.falkordb_connected
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : health.status === 'healthy'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                }`}
              ></span>
              <span className="text-slate-300">
                {health.falkordb_connected
                  ? 'FalkorDB Engine: Connected'
                  : 'FalkorDB: Standby Mode'}
              </span>
            </div>
            <button
              onClick={checkHealth}
              disabled={isRefreshing}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Ping</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-2 py-1">
              Navigation Pages
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/90 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
