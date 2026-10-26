import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { SeverityBadge, severityConfig, StatusBadge } from '@/components/Badges';
import { TrendChart, SeverityBars, DonutChart, sparkColor } from '@/components/Charts';
import type { Severity, PageKey } from '@/types';
import { Activity, AlertTriangle, ShieldAlert, Eye, TrendingUp, Clock } from 'lucide-react';

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function OverviewPage({
  setPage,
  onSelectAlert,
}: {
  setPage: (p: PageKey) => void;
  onSelectAlert: (id: string) => void;
}) {
  const { events, alerts, isDemoData } = useApp();

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const openAlerts = alerts.filter((a) => a.status === 'open').length;
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const investigating = alerts.filter((a) => a.status === 'investigating').length;
    const sevDist: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const e of events) sevDist[e.severity] += 1;
    const outcomes = [
      { label: 'Success', value: events.filter((e) => e.outcome === 'success').length, color: '#10b981' },
      { label: 'Failure', value: events.filter((e) => e.outcome === 'failure').length, color: '#f59e0b' },
      { label: 'Blocked', value: events.filter((e) => e.outcome === 'blocked').length, color: '#ef4444' },
      { label: 'Suspicious', value: events.filter((e) => e.outcome === 'suspicious').length, color: '#fb923c' },
    ].filter((o) => o.value > 0);
    // trend over last 24 buckets
    const min = events.length > 0 ? new Date(events[0].timestamp).getTime() : Date.now();
    const max = events.length > 0 ? new Date(events[events.length - 1].timestamp).getTime() : Date.now();
    const span = Math.max(1, max - min);
    const bucketCount = 24;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({ label: '', value: 0 }));
    for (const e of events) {
      const t = new Date(e.timestamp).getTime();
      const idx = Math.min(bucketCount - 1, Math.floor(((t - min) / span) * bucketCount));
      buckets[idx].value += 1;
    }
    buckets.forEach((b, i) => {
      const t = min + (i / (bucketCount - 1)) * span;
      b.label = new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    });
    return { totalEvents, openAlerts, critical, investigating, sevDist, outcomes, buckets };
  }, [events, alerts]);

  const recentEvents = useMemo(
    () => [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8),
    [events],
  );

  const topAlerts = useMemo(
    () => [...alerts].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 5),
    [alerts],
  );

  const sevData = (['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((s) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    value: stats.sevDist[s],
    color: sparkColor(s),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {isDemoData && (
        <div className="soc-card border-critical/30 bg-critical/5 px-4 py-3 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-critical shrink-0" />
          <p className="text-slate-300">
            <span className="font-mono font-semibold text-critical">DEMO DATA</span> — synthetic security events are loaded for demonstration. No live network telemetry is being collected.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Events"
          value={stats.totalEvents.toLocaleString()}
          accent="cyan"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Open Alerts"
          value={stats.openAlerts.toLocaleString()}
          accent={stats.openAlerts > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={<ShieldAlert className="w-5 h-5" />}
          label="Critical Incidents"
          value={stats.critical.toLocaleString()}
          accent={stats.critical > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Investigating"
          value={stats.investigating.toLocaleString()}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="soc-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Detection Trends
              </h2>
              <p className="text-xs text-slate-500">Event volume across the observation window</p>
            </div>
          </div>
          <TrendChart data={stats.buckets} color="#22d3ee" height={200} />
        </div>

        <div className="soc-card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Outcome Distribution</h2>
          <div className="flex items-center justify-center mb-4">
            <DonutChart data={stats.outcomes} size={160} />
          </div>
          <div className="space-y-2">
            {stats.outcomes.map((o) => (
              <div key={o.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: o.color }} />
                  <span className="text-slate-300">{o.label}</span>
                </div>
                <span className="font-mono text-slate-400">{o.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="soc-card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Severity Distribution</h2>
          <SeverityBars data={sevData} />
        </div>

        <div className="soc-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Top Active Alerts</h2>
            <button
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              onClick={() => setPage('alerts')}
            >
              View all →
            </button>
          </div>
          {topAlerts.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="w-6 h-6" />}
              title="No active alerts"
              body="The detection engine found no matching threats with the current rules."
            />
          ) : (
            <div className="space-y-2">
              {topAlerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onSelectAlert(a.id);
                    setPage('alerts');
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg bg-ink-800/50 hover:bg-ink-750 border border-ink-700 hover:border-ink-600 transition-colors"
                >
                  <SeverityBadge severity={a.severity} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200 truncate">{a.title}</div>
                    <div className="text-xs text-slate-500 font-mono">{a.findings.length} finding(s) · {a.findings.reduce((n, f) => n + f.evidence.length, 0)} events</div>
                  </div>
                  <StatusBadge status={a.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="soc-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" /> Recent Events
          </h2>
          <button
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            onClick={() => setPage('events')}
          >
            Open log explorer →
          </button>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-ink-700">
                <th className="font-medium pb-2 pr-3">Time</th>
                <th className="font-medium pb-2 pr-3">Severity</th>
                <th className="font-medium pb-2 pr-3">Type</th>
                <th className="font-medium pb-2 pr-3">Source IP</th>
                <th className="font-medium pb-2 pr-3">User</th>
                <th className="font-medium pb-2">Message</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {recentEvents.map((e) => (
                <tr key={e.id} className="border-b border-ink-800/60 hover:bg-ink-800/40">
                  <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{formatTs(e.timestamp)}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex items-center gap-1.5 ${severityConfig(e.severity).text}`}>
                      <span className={`severity-dot ${severityConfig(e.severity).dot}`} />
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-300">{e.type}</td>
                  <td className="py-2 pr-3 text-cyan-300">{e.sourceIp}</td>
                  <td className="py-2 pr-3 text-slate-400">{e.username ?? '—'}</td>
                  <td className="py-2 text-slate-400 max-w-xs truncate">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function sevRank(s: Severity): number {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[s] ?? 0;
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'cyan' | 'red' | 'amber' | 'green';
}) {
  const accentMap = {
    cyan: { ring: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    red: { ring: 'text-critical', bg: 'bg-critical/10', border: 'border-critical/20' },
    amber: { ring: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    green: { ring: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  }[accent];
  return (
    <div className={`soc-card p-5 flex items-center gap-4 ${accentMap.border}`}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accentMap.bg} ${accentMap.ring}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-100 tabular-nums">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center text-slate-500 mb-3">
        {icon}
      </div>
      <div className="text-sm font-medium text-slate-300">{title}</div>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">{body}</p>
    </div>
  );
}
