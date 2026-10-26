import { useState } from 'react';
import { AppProvider } from '@/context/AppContext';
import { Sidebar, TopBar } from '@/components/Sidebar';
import { OverviewPage } from '@/pages/OverviewPage';
import { EventsPage } from '@/pages/EventsPage';
import { RulesPage } from '@/pages/RulesPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { AnalystPage } from '@/pages/AnalystPage';
import { LogsPage } from '@/pages/LogsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import type { PageKey } from '@/types';
import { Menu } from 'lucide-react';

const PAGE_META: Record<PageKey, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'Threat landscape summary across the observation window' },
  events: { title: 'Security Events', subtitle: 'Search, filter, and inspect the raw event stream' },
  rules: { title: 'Detection Rules', subtitle: 'Configure deterministic detection logic and thresholds' },
  alerts: { title: 'Alert Investigation', subtitle: 'Investigate detections, review evidence, add analyst notes' },
  analyst: { title: 'AI Security Analyst', subtitle: 'Plain-English explanations separating facts from hypotheses' },
  logs: { title: 'Log Explorer', subtitle: 'Import and validate CSV / JSON security logs' },
  reports: { title: 'Incident Reports', subtitle: 'Create and export investigation summaries' },
  settings: { title: 'Settings', subtitle: 'Detection thresholds, data management, and configuration' },
};

function AppShell() {
  const [page, setPage] = useState<PageKey>('overview');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const meta = PAGE_META[page];

  const renderPage = () => {
    switch (page) {
      case 'overview': return <OverviewPage setPage={setPage} onSelectAlert={(id) => { setSelectedAlertId(id); setPage('alerts'); }} />;
      case 'events': return <EventsPage />;
      case 'rules': return <RulesPage />;
      case 'alerts': return <AlertsPage selectedAlertId={selectedAlertId} setSelectedAlertId={setSelectedAlertId} setPage={setPage} />;
      case 'analyst': return <AnalystPage selectedAlertId={selectedAlertId} />;
      case 'logs': return <LogsPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return <SettingsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <Sidebar
        page={page}
        setPage={setPage}
        openAlertId={selectedAlertId}
        onSelectAlert={setSelectedAlertId}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenu={() => setMobileOpen(true)}
          right={
            <button
              className="lg:hidden text-slate-400 hover:text-slate-100"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          }
        />
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
