import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/Navbar';
import { TenantProvider } from '../context/TenantContext';

export const metadata: Metadata = {
  title: 'OmniMemSOC - Multi-Tenant Autonomous Memory Engine',
  description: 'Multi-Tenant Autonomous Memory Engine for Security Operations Centers (SOC) using FalkorDB and Swarm Coordination',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark overflow-x-hidden">
      <body className="bg-[#0a0d14] text-slate-100 min-h-screen flex flex-col font-sans antialiased overflow-x-hidden">
        <TenantProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-[#080a10] py-4 text-center text-xs text-slate-600 font-mono px-4">
            OmniMemSOC • Multi-Tenant Autonomous Memory Engine for SOC • Powered by FalkorDB
          </footer>
        </TenantProvider>
      </body>
    </html>
  );
}
