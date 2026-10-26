import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import { EmptyState } from '@/pages/OverviewPage';
import type { IncidentReport, Alert, Severity, AlertStatus } from '@/types';
import {
  FileBarChart, Plus, FileDown, Trash2, X, Pencil, Save,
} from 'lucide-react';

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', hour12: false });
}

function exportReportText(r: IncidentReport): string {
  const lines: string[] = [];
  lines.push(`INCIDENT REPORT — ${r.id}`);
  lines.push('=========================================');
  lines.push(`Title: ${r.title}`);
  lines.push(`Severity: ${r.severity.toUpperCase()}`);
  lines.push(`Status: ${r.status}`);
  lines.push(`Author: ${r.author}`);
  lines.push(`Created: ${formatTs(r.createdAt)}`);
  lines.push(`Updated: ${formatTs(r.updatedAt)}`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push('-----------------------------------------');
  lines.push(r.summary);
  lines.push('');
  lines.push('TIMELINE');
  lines.push('-----------------------------------------');
  r.timeline.forEach((t) => lines.push(`[${formatTs(t.timestamp)}] ${t.text}`));
  lines.push('');
  lines.push('FINDINGS');
  lines.push('-----------------------------------------');
  r.findings.forEach((f, i) => lines.push(`${i + 1}. ${f}`));
  lines.push('');
  lines.push('RECOMMENDATIONS');
  lines.push('-----------------------------------------');
  r.recommendations.forEach((rec, i) => lines.push(`${i + 1}. ${rec}`));
  lines.push('');
  lines.push('RELATED ALERTS');
  lines.push('-----------------------------------------');
  r.alertIds.forEach((id) => lines.push(`- ${id}`));
  return lines.join('\n');
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { reports, alerts, createReport, deleteReport, updateReport } = useApp();
  const [editing, setEditing] = useState<IncidentReport | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{reports.length} incident report{reports.length === 1 ? '' : 's'}</p>
        <button className="soc-btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="soc-card">
          <EmptyState
            icon={<FileBarChart className="w-6 h-6" />}
            title="No incident reports"
            body="Create an investigation report to summarize findings, timeline, and remediation recommendations for stakeholders."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reports.map((r) => (
            <div key={r.id} className="soc-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <SeverityBadge severity={r.severity} size="xs" />
                  <StatusBadge status={r.status} />
                  <span className="font-mono text-[10px] text-slate-600">{r.id}</span>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded hover:bg-ink-700 text-slate-400 hover:text-slate-100" onClick={() => setEditing(r)} aria-label="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-ink-700 text-slate-400 hover:text-cyan-300" onClick={() => download(`${r.id}.txt`, exportReportText(r))} aria-label="Export">
                    <FileDown className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-critical/10 text-slate-400 hover:text-critical" onClick={() => deleteReport(r.id)} aria-label="Delete">
                    <Trash2 className="w.3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">{r.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-3 mb-3">{r.summary}</p>
              <div className="text-xs text-slate-500 font-mono">
                {r.alertIds.length} alerts · {r.timeline.length} timeline entries · {formatTs(r.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editing) && (
        <ReportEditor
          alerts={alerts}
          existing={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSave={(data) => {
            if (editing) updateReport(editing.id, data);
            else createReport(data);
            setShowCreate(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ReportEditor({
  alerts,
  existing,
  onSave,
  onClose,
}: {
  alerts: Alert[];
  existing: IncidentReport | null;
  onSave: (data: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [severity, setSeverity] = useState<Severity>(existing?.severity ?? 'high');
  const [status, setStatus] = useState<AlertStatus>(existing?.status ?? 'investigating');
  const [author, setAuthor] = useState(existing?.author ?? 'analyst');
  const [alertIds, setAlertIds] = useState<string[]>(existing?.alertIds ?? []);
  const [findings, setFindings] = useState<string[]>(existing?.findings ?? []);
  const [recommendations, setRecommendations] = useState<string[]>(existing?.recommendations ?? []);
  const [timeline, setTimeline] = useState(existing?.timeline ?? []);

  const toggleAlert = (id: string) => {
    setAlertIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Auto-populate from selected alerts
  const autoPopulate = () => {
    const chosen = alerts.filter((a) => alertIds.includes(a.id));
    if (chosen.length === 0) return;
    const newFindings = chosen.flatMap((a) => a.findings.map((f) => f.description));
    const newRecs = Array.from(new Set(chosen.map((a) => a.recommendation)));
    const tl = chosen
      .flatMap((a) => a.findings.flatMap((f) => f.evidence))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((e) => ({ timestamp: e.timestamp, text: `${e.type}: ${e.message} (src: ${e.sourceIp})` }));
    setFindings(Array.from(new Set([...findings, ...newFindings])));
    setRecommendations(Array.from(new Set([...recommendations, ...newRecs])));
    setTimeline(Array.from(new Set([...timeline, ...tl])));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative soc-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-cyan-400" /> {existing ? 'Edit' : 'New'} Incident Report
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Title</label>
            <input className="soc-input w-full mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Credential stuffing against auth cluster" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Severity</label>
              <select className="soc-input w-full mt-1" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                {['critical', 'high', 'medium', 'low', 'info'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Status</label>
              <select className="soc-input w-full mt-1" value={status} onChange={(e) => setStatus(e.target.value as AlertStatus)}>
                {['open', 'investigating', 'resolved'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Author</label>
              <input className="soc-input w-full mt-1" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Summary</label>
            <textarea className="soc-input w-full mt-1 min-h-[80px] resize-y" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Executive summary of the incident…" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Linked Alerts</label>
              <button className="text-xs text-cyan-400 hover:text-cyan-300" onClick={autoPopulate}>Auto-populate from alerts</button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto bg-ink-900/50 border border-ink-700 rounded-lg p-2">
              {alerts.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-ink-800 rounded px-2 py-1">
                  <input type="checkbox" checked={alertIds.includes(a.id)} onChange={() => toggleAlert(a.id)} className="accent-cyan-500" />
                  <SeverityBadge severity={a.severity} size="xs" />
                  <span className="text-slate-300 truncate">{a.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Findings (one per line)</label>
            <textarea className="soc-input w-full mt-1 min-h-[80px] resize-y font-mono text-xs" value={findings.join('\n')} onChange={(e) => setFindings(e.target.value.split('\n').filter(Boolean))} />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Recommendations (one per line)</label>
            <textarea className="soc-input w-full mt-1 min-h-[80px] resize-y font-mono text-xs" value={recommendations.join('\n')} onChange={(e) => setRecommendations(e.target.value.split('\n').filter(Boolean))} />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Timeline (timestamp|text per line)</label>
            <textarea
              className="soc-input w-full mt-1 min-h-[80px] resize-y font-mono text-xs"
              value={timeline.map((t) => `${t.timestamp}|${t.text}`).join('\n')}
              onChange={(e) => setTimeline(e.target.value.split('\n').filter(Boolean).map((line) => {
                const [ts, ...rest] = line.split('|');
                return { timestamp: ts, text: rest.join('|') };
              }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="soc-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="soc-btn-primary"
            onClick={() => onSave({ title, summary, severity, status, author, alertIds, findings, recommendations, timeline })}
            disabled={!title.trim() || !summary.trim()}
          >
            <Save className="w-4 h-4" /> Save Report
          </button>
        </div>
      </div>
    </div>
  );
}
