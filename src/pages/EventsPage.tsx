import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SeverityBadge, severityConfig, Dot } from '@/components/Badges';
import { EmptyState } from '@/pages/OverviewPage';
import type { SecurityEvent, Severity, EventCategory, EventOutcome } from '@/types';
import { Search, ChevronLeft, ChevronRight, X, Filter, ArrowUpDown } from 'lucide-react';

type SortKey = 'timestamp' | 'severity' | 'sourceIp' | 'type';
type SortDir = 'asc' | 'desc';

const sevRank = (s: Severity): number => ({ critical: 4, high: 3, medium: 2, low: 1, info: 0 }[s] ?? 0);

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium', hour12: false });
}

const CATEGORIES: (EventCategory | 'all')[] = ['all', 'authentication', 'network', 'endpoint', 'data_access', 'privilege', 'malware', 'config'];
const OUTCOMES: (EventOutcome | 'all')[] = ['all', 'success', 'failure', 'blocked', 'suspicious'];
const SEVERITIES: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'info'];

export function EventsPage() {
  const { events } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EventCategory | 'all'>('all');
  const [outcome, setOutcome] = useState<EventOutcome | 'all'>('all');
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SecurityEvent | null>(null);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = events.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (outcome !== 'all' && e.outcome !== outcome) return false;
      if (severity !== 'all' && e.severity !== severity) return false;
      if (q) {
        const blob = `${e.type} ${e.sourceIp} ${e.sourceHost} ${e.destination} ${e.username ?? ''} ${e.message} ${e.category} ${e.outcome}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'timestamp') cmp = a.timestamp.localeCompare(b.timestamp);
      else if (sortKey === 'severity') cmp = sevRank(a.severity) - sevRank(b.severity);
      else if (sortKey === 'sourceIp') cmp = a.sourceIp.localeCompare(b.sourceIp);
      else if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [events, search, category, outcome, severity, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setOutcome('all');
    setSeverity('all');
    setPage(0);
  };

  const hasFilters = search || category !== 'all' || outcome !== 'all' || severity !== 'all';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="soc-card p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="soc-input w-full pl-9"
              placeholder="Search by type, IP, host, user, message…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="soc-input" value={category} onChange={(e) => { setCategory(e.target.value as EventCategory | 'all'); setPage(0); }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
            </select>
            <select className="soc-input" value={severity} onChange={(e) => { setSeverity(e.target.value as Severity | 'all'); setPage(0); }}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All severities' : s}</option>)}
            </select>
            <select className="soc-input" value={outcome} onChange={(e) => { setOutcome(e.target.value as EventOutcome | 'all'); setPage(0); }}>
              {OUTCOMES.map((o) => <option key={o} value={o}>{o === 'all' ? 'All outcomes' : o}</option>)}
            </select>
            {hasFilters && (
              <button className="soc-btn-ghost" onClick={resetFilters}>
                <X className="w-4 h-4" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="soc-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300 font-medium">{filtered.length.toLocaleString()}</span>
            <span className="text-slate-500">events</span>
          </div>
          <div className="text-xs text-slate-500">Page {safePage + 1} of {totalPages}</div>
        </div>
        <div className="overflow-x-auto">
          {pageRows.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Search className="w-6 h-6" />}
                title="No matching events"
                body={hasFilters ? 'Adjust your filters or clear them to see all events.' : 'Import logs from the Log Explorer to populate this view.'}
              />
            </div>
          ) : (
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-ink-700 bg-ink-850/50">
                  <th className="font-medium px-4 py-2.5">
                    <SortButton label="Time" active={sortKey === 'timestamp'} dir={sortDir} onClick={() => toggleSort('timestamp')} />
                  </th>
                  <th className="font-medium px-4 py-2.5">Severity</th>
                  <th className="font-medium px-4 py-2.5">
                    <SortButton label="Category" active={sortKey === 'type'} dir={sortDir} onClick={() => toggleSort('type')} />
                  </th>
                  <th className="font-medium px-4 py-2.5">
                    <SortButton label="Source IP" active={sortKey === 'sourceIp'} dir={sortDir} onClick={() => toggleSort('sourceIp')} />
                  </th>
                  <th className="font-medium px-4 py-2.5">User</th>
                  <th className="font-medium px-4 py-2.5">Outcome</th>
                  <th className="font-medium px-4 py-2.5">Message</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="border-b border-ink-800/50 hover:bg-ink-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">{formatTs(e.timestamp)}</td>
                    <td className="px-4 py-2.5"><Dot severity={e.severity} /></td>
                    <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">{e.type}</td>
                    <td className="px-4 py-2.5 text-cyan-300 font-mono text-xs">{e.sourceIp}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{e.username ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${outcomeColor(e.outcome)}`}>{e.outcome}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 max-w-md truncate text-xs">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-700">
            <button
              className="soc-btn-ghost disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <div className="text-xs text-slate-500 font-mono">
              {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} of {filtered.length}
            </div>
            <button
              className="soc-btn-ghost disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selected && <EventDrawer event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function outcomeColor(o: EventOutcome): string {
  switch (o) {
    case 'success': return 'bg-success/10 text-success';
    case 'failure': return 'bg-warning/10 text-warning';
    case 'blocked': return 'bg-critical/10 text-critical';
    case 'suspicious': return 'bg-orange-400/10 text-orange-400';
  }
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 hover:text-slate-200 ${active ? 'text-cyan-300' : ''}`}>
      {label}
      <ArrowUpDown className="w-3 h-3" />
      {active && <span className="text-[9px] font-mono">{dir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
}

function EventDrawer({ event, onClose }: { event: SecurityEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-ink-850 border-l border-ink-700 h-full overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-ink-850 border-b border-ink-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SeverityBadge severity={event.severity} size="xs" />
            <span className="font-mono text-xs text-slate-500">{event.id}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{event.message}</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">{formatTs(event.timestamp)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Category" value={event.category} />
            <Field label="Type" value={event.type} />
            <Field label="Outcome" value={event.outcome} />
            <Field label="Severity" value={event.severity} />
            <Field label="Source IP" value={event.sourceIp} />
            <Field label="Source Host" value={event.sourceHost} />
            <Field label="Destination" value={event.destination} />
            <Field label="Username" value={event.username ?? '—'} />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-mono tracking-wider mb-2">Details</div>
            <pre className="bg-ink-900 border border-ink-700 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
{JSON.stringify(event.details, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-800/50 border border-ink-700 rounded-lg px-3 py-2">
      <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">{label}</div>
      <div className="text-slate-200 font-mono text-xs mt-0.5 break-all">{value}</div>
    </div>
  );
}
