'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchTenants, TenantInfo } from '@/lib/api';

interface TenantContextType {
  activeTenant: string;
  activeTenantData: TenantInfo | null;
  tenants: TenantInfo[];
  setActiveTenant: (tenantId: string) => void;
  isLoading: boolean;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [activeTenant, setActiveTenantState] = useState<string>('tenant-alpha');
  const [tenants, setTenants] = useState<TenantInfo[]>([
    {
      id: 'tenant-alpha',
      name: 'Global Corp Alpha',
      industry: 'Financial Services',
      graph_namespace: 'graph_tenant_alpha',
      incidents_count: 14,
    },
    {
      id: 'tenant-beta',
      name: 'Nexus Defense Beta',
      industry: 'Defense & Aerospace',
      graph_namespace: 'graph_tenant_beta',
      incidents_count: 9,
    },
    {
      id: 'tenant-soc-global',
      name: 'Shared Global Intel Hub',
      industry: 'Cross-Tenant Threat Exchange',
      graph_namespace: 'graph_tenant_soc_global',
      incidents_count: 38,
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTenants();
      if (data && data.length > 0) {
        setTenants(data);
      }
    } catch (e) {
      console.warn('Could not load tenants from backend, using defaults', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Restore saved tenant from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnimem_active_tenant');
      if (saved) {
        setActiveTenantState(saved);
      }
    }
    loadTenants();
  }, []);

  const setActiveTenant = (tenantId: string) => {
    setActiveTenantState(tenantId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnimem_active_tenant', tenantId);
    }
  };

  const activeTenantData = tenants.find((t) => t.id === activeTenant) || tenants[0] || null;

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        activeTenantData,
        tenants,
        setActiveTenant,
        isLoading,
        refreshTenants: loadTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
