import {
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Search,
  Bot,
  FileText,
  Settings as SettingsIcon,
  FileBarChart,
  ScrollText,
  ShieldHalf,
  X,
} from 'lucide-react';
import type { NavItem, PageKey } from '@/types';
import { useApp } from '@/context/AppContext';
import { useMemo } from 'react';

const NAV: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Threat landscape summary' },
  { key: 'events', label: 'Security Events', icon: ScrollText, description: 'Search raw event stream' },
  { key: 'rules', label: 'Detection Rules', icon: ShieldCheck, description: 'Configure detection logic' },
  { key: 'alerts', label: 'Alert Investigation', icon: ShieldAlert, description: 'Investigate detections' },
  { key: 'analyst', label: 'AI Security Analyst', icon: Bot, description: 'Explain & recommend' },
  { key: 'logs', label: 'Log Explorer', icon: FileText, description: 'Import CSV / JSON logs' },
  { key: 'reports', label: 'Incident Reports', icon: FileBarChart, description: 'Export investigation summaries' },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, description: 'Thresholds & config' },
];

export function Sidebar({
  page,
  setPage,
  openAlertId,
  onSelectAlert,
  mobileOpen,
  setMobileOpen,
}: {
  page: PageKey;
  setPage: (p: PageKey) => void;
  openAlertId: string | null;
  onSelectAlert: (id: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const { alerts, isDemoData } = useApp();
  const openCount = useMemo(() => alerts.filter((a) => a.status === 'open').length, [alerts]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 bg-ink-900 border-r border-ink-700 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-ink-700">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <ShieldHalf className="w-7 h-7 text-cyan-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse-soft" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-100 tracking-tight">Sentinel AI</div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Threat Detection</div>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-100"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = page === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setPage(item.key);
                  if (item.key !== 'alerts') onSelectAlert(null);
                  setMobileOpen(false);
                }}
                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-ink-800 border border-transparent'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} style={{ width: 18, height: 18 }} />
                <span className="font-medium">{item.label}</span>
                {item.key === 'alerts' && openCount > 0 && (
                  <span className="ml-auto text-[10px] font-mono font-semibold bg-critical/20 text-critical px-1.5 py-0.5 rounded">
                    {openCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-ink-700 space-y-2">
          <div className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${isDemoData ? 'bg-critical/10 border border-critical/20 text-critical' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300'}`}>
            <span className={`severity-dot ${isDemoData ? 'bg-critical' : 'bg-cyan-400'} animate-pulse-soft`} />
            <span className="font-mono font-semibold">{isDemoData ? 'DEMO DATA' : 'IMPORTED DATA'}</span>
          </div>
          <div className="px-3 text-[10px] text-slate-600 font-mono leading-relaxed">
            v1.0 · Local detection engine
          </div>
        </div>
      </aside>
    </>
  );
}

export function TopBar({
  title,
  subtitle,
  onMenu,
  right,
}: {
  title: string;
  subtitle: string;
  onMenu: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-ink-900/80 backdrop-blur-md border-b border-ink-700 flex items-center px-4 lg:px-8 gap-4">
      <button
        className="lg:hidden text-slate-400 hover:text-slate-100"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Search className="w-5 h-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-semibold text-slate-100 truncate">{title}</h1>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      {right}
    </header>
  );
}
