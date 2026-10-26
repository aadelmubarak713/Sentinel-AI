import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import { EmptyState } from '@/pages/OverviewPage';
import type { Alert, AlertStatus, PageKey } from '@/types';
import {
  ShieldAlert, ArrowLeft, Clock, Network, User, Server,
  StickyNote, FileText, Bot, Lightbulb, Plus,
} from 'lucide-react';

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium', hour12: false });
}

export function AlertsPage({
  selectedAlertId,
  setSelectedAlertId,
  setPage,
}: {
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
  setPage: (p: PageKey) => void;
}) {
  const { alerts } = useApp();
  const selected = alerts.find((a) => a.id === selectedAlertId) ?? null;

  if (selected) {
    return (
      <AlertDetail
        alert={selected}
        onBack={() => setSelectedAlertId(null)}
        onOpenAnalyst={() => setPage('analyst')}
      />
    );
  }
  return <AlertList alerts={alerts} onOpen={(id) => setSelectedAlertId(id)} />;
}

function AlertList({ alerts, onOpen }: { alerts: Alert[]; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<AlertStatus | 'all'>('all');
  const list = filter === 'all' ? alerts : alerts.filter((a) => a.status === filter);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        {(['all', 'open', 'investigating', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-ink-800 text-slate-400 border border-ink-700 hover:text-slate-200'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 font-mono text-[10px] opacity-70">
              {f === 'all' ? alerts.length : alerts.filter((a) => a.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="soc-card">
          <EmptyState
            icon={<ShieldAlert className="w-6 h-6" />}
            title="No alerts to investigate"
            body="The detection engine has not produced any alerts in this state. Adjust detection rules or import more logs to generate detections."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="soc-card-hover w-full text-left p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <SeverityBadge severity={a.severity} size="xs" />
                    <StatusBadge status={a.status} />
                    <span className="font-mono text-[10px] text-slate-600">{a.id}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-1">{a.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{a.findings[0]?.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="font-mono">{a.findings.length} finding{a.findings.length === 1 ? '' : 's'}</span>
                    <span className="font-mono">{a.findings.reduce((n, f) => n + f.evidence.length, 0)} events</span>
                    <span className="font-mono">{a.affectedEntities.length} entities</span>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-600 rotate-180 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertDetail({ alert, onBack, onOpenAnalyst }: { alert: Alert; onBack: () => void; onOpenAnalyst: () => void }) {
  const { setAlertStatus, addNote } = useApp();
  const [noteText, setNoteText] = useState('');
  const [noteKind, setNoteKind] = useState<'observation' | 'hypothesis' | 'action'>('observation');

  const evidence = useMemo(
    () => alert.findings.flatMap((f) => f.evidence).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [alert],
  );

  const submitNote = () => {
    if (!noteText.trim()) return;
    addNote(alert.id, noteText.trim(), noteKind, 'analyst');
    setNoteText('');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="soc-btn-ghost">
        <ArrowLeft className="w-4 h-4" /> Back to alerts
      </button>

      <div className="soc-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <SeverityBadge severity={alert.severity} size="sm" />
              <StatusBadge status={alert.status} />
              <span className="font-mono text-xs text-slate-600">{alert.id}</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-100">{alert.title}</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Created {formatTs(alert.createdAt)} · Updated {formatTs(alert.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="soc-input"
              value={alert.status}
              onChange={(e) => setAlertStatus(alert.id, e.target.value as AlertStatus)}
            >
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="soc-btn-primary" onClick={onOpenAnalyst}>
              <Bot className="w-4 h-4" /> AI Analyst
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
          <Section title="Findings" icon={<ShieldAlert className="w-4 h-4" />}>
            <div className="space-y-3">
              {alert.findings.map((f, i) => (
                <div key={i} className="bg-ink-800/50 border border-ink-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <SeverityBadge severity={f.severity} size="xs" />
                    <span className="text-xs text-slate-300 font-medium">{f.ruleName}</span>
                  </div>
                  <p className="text-xs text-slate-400">{f.description}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Affected Entities" icon={<Network className="w-4 h-4" />}>
            <div className="space-y-2">
              {alert.affectedEntities.map((ent, i) => {
                const Icon = ent.kind === 'user' ? User : ent.kind === 'host' ? Server : Network;
                return (
                  <div key={i} className="flex items-center gap-2.5 bg-ink-800/50 border border-ink-700 rounded-lg px-3 py-2">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="text-xs font-mono text-slate-200">{ent.value}</div>
                      <div className="text-[10px] text-slate-500">{ent.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Recommendation" icon={<Lightbulb className="w-4 h-4" />}>
            <p className="text-xs text-slate-300 leading-relaxed">{alert.recommendation}</p>
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Evidence Timeline" icon={<Clock className="w-4 h-4" />}>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {evidence.map((e) => (
              <div key={e.id} className="flex gap-3 bg-ink-800/40 border border-ink-700 rounded-lg px-3 py-2">
                <div className="shrink-0">
                  <span className={`severity-dot ${sevDot(e.severity)}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-300">{e.type}</span>
                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{formatTs(e.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{e.message}</p>
                  <div className="text-[10px] text-cyan-300/80 font-mono mt-1">{e.sourceIp} → {e.destination}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Analyst Notes" icon={<StickyNote className="w-4 h-4" />}>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 mb-3">
            {alert.notes.length === 0 && (
              <p className="text-xs text-slate-500 italic">No notes yet. Record observations, hypotheses, and actions to preserve the investigation trail.</p>
            )}
            {alert.notes.map((n) => (
              <div key={n.id} className="bg-ink-800/50 border border-ink-700 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${noteKindColor(n.kind)}`}>{n.kind}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{n.author} · {formatTs(n.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-300">{n.text}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <select className="soc-input w-32" value={noteKind} onChange={(e) => setNoteKind(e.target.value as 'observation' | 'hypothesis' | 'action')}>
                <option value="observation">Observation</option>
                <option value="hypothesis">Hypothesis</option>
                <option value="action">Action</option>
              </select>
              <input
                className="soc-input flex-1"
                placeholder="Add a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitNote(); }}
              />
            </div>
            <button className="soc-btn-primary w-full" onClick={submitNote}>
              <Plus className="w-4 h-4" /> Add Note
            </button>
          </div>
        </Section>
      </div>

      <Section title="Linked Incident Report" icon={<FileText className="w-4 h-4" />}>
        {alert.incidentId ? (
          <p className="text-xs text-slate-300">Linked to incident <span className="font-mono text-cyan-300">{alert.incidentId}</span></p>
        ) : (
          <p className="text-xs text-slate-500">No incident report linked. Create one from the Incident Reports page.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="soc-card p-5">
      <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
        <span className="text-cyan-400">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function sevDot(s: string): string {
  return { critical: 'bg-critical', high: 'bg-orange-400', medium: 'bg-warning', low: 'bg-cyan-400', info: 'bg-slate-500' }[s] ?? 'bg-slate-500';
}

function noteKindColor(k: string): string {
  switch (k) {
    case 'observation': return 'bg-cyan-500/10 text-cyan-300';
    case 'hypothesis': return 'bg-warning/10 text-warning';
    case 'action': return 'bg-success/10 text-success';
    default: return 'bg-ink-700 text-slate-400';
  }
}
