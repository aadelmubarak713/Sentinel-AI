import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { parseImport, sampleCsvLog, type ImportResult } from '@/lib/importer';
import { SeverityBadge } from '@/components/Badges';
import type { SecurityEvent } from '@/types';
import {
  FileText, Upload, FileUp, CheckCircle2, AlertTriangle,
  Download, Trash2, FileCode,
} from 'lucide-react';

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', hour12: false });
}

export function LogsPage() {
  const { addImportedEvents, events } = useApp();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File) => {
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      setText(content);
      try {
        const r = parseImport(content, `imp-${Date.now()}`);
        setResult(r);
      } catch (e) {
        setError((e as Error).message);
        setResult(null);
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  };

  const onAnalyze = () => {
    if (!text.trim()) return;
    try {
      const r = parseImport(text, `imp-${Date.now()}`);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onImport = () => {
    if (!result || result.valid.length === 0) return;
    addImportedEvents(result.valid);
    setText('');
    setResult(null);
    setFileName('');
  };

  const loadSample = () => {
    const sample = sampleCsvLog();
    setText(sample);
    setFileName('sample-failed-logins.csv');
    setResult(parseImport(sample, `imp-${Date.now()}`));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="soc-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-cyan-400" /> Import Security Logs
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Upload or paste CSV / JSON security log files. Records are validated against the required schema. Supported fields: <span className="font-mono text-slate-300">timestamp, category, type, severity, outcome, source_ip, username, message</span>. Unknown extra columns are preserved as event details.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="border-2 border-dashed border-ink-700 rounded-lg p-6 text-center hover:border-cyan-500/40 transition-colors">
              <FileUp className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400 mb-3">Drop a CSV or JSON file, or</p>
              <label className="soc-btn-primary cursor-pointer">
                <Upload className="w-4 h-4" /> Choose file
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
              </label>
              {fileName && (
                <div className="mt-3 text-xs font-mono text-cyan-300 flex items-center justify-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" /> {fileName}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button className="soc-btn-ghost flex-1" onClick={loadSample}>
                <Download className="w-4 h-4" /> Load sample
              </button>
              <button className="soc-btn-ghost flex-1" onClick={() => { setText(''); setResult(null); setFileName(''); }}>
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </div>
          </div>

          <div>
            <textarea
              className="soc-input w-full min-h-[180px] font-mono text-xs resize-y"
              placeholder="timestamp,category,type,severity,outcome,source_ip,destination,username,message&#10;2026-10-26T08:00:00Z,authentication,login_failed,medium,failure,45.133.1.7,srv-auth-01.prod,a.chen,Failed login"
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); }}
            />
            <button className="soc-btn-primary w-full mt-2" onClick={onAnalyze} disabled={!text.trim()}>
              <FileText className="w-4 h-4" /> Validate & Preview
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-critical bg-critical/10 border border-critical/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {result && (
        <div className="soc-card p-5 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Validation Results</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="w-4 h-4" /> {result.valid.length} valid
              </span>
              {result.errors.length > 0 && (
                <span className="flex items-center gap-1.5 text-critical">
                  <AlertTriangle className="w-4 h-4" /> {result.errors.length} invalid
                </span>
              )}
              <button
                className="soc-btn-primary disabled:opacity-40"
                onClick={onImport}
                disabled={result.valid.length === 0}
              >
                <Upload className="w-4 h-4" /> Import {result.valid.length} events
              </button>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-slate-500 uppercase font-mono tracking-wider mb-2">Errors</div>
              <div className="space-y-1 max-h-32 overflow-y-auto bg-critical/5 border border-critical/20 rounded-lg p-2">
                {result.errors.map((e) => (
                  <div key={e.row} className="text-xs font-mono text-critical/90">
                    Row {e.row}: {e.errors.join('; ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 uppercase font-mono tracking-wider mb-2">Preview ({Math.min(result.valid.length, 50)} of {result.valid.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-ink-700">
                  <th className="font-medium px-2 py-2">Timestamp</th>
                  <th className="font-medium px-2 py-2">Sev</th>
                  <th className="font-medium px-2 py-2">Type</th>
                  <th className="font-medium px-2 py-2">Source IP</th>
                  <th className="font-medium px-2 py-2">User</th>
                  <th className="font-medium px-2 py-2">Message</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {result.valid.slice(0, 50).map((e: SecurityEvent) => (
                  <tr key={e.id} className="border-b border-ink-800/50">
                    <td className="px-2 py-2 text-slate-400 whitespace-nowrap">{formatTs(e.timestamp)}</td>
                    <td className="px-2 py-2"><SeverityBadge severity={e.severity} size="xs" /></td>
                    <td className="px-2 py-2 text-slate-300">{e.type}</td>
                    <td className="px-2 py-2 text-cyan-300">{e.sourceIp}</td>
                    <td className="px-2 py-2 text-slate-400">{e.username ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-400 max-w-xs truncate">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="soc-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Current Event Store</h2>
        <p className="text-xs text-slate-400">
          {events.length.toLocaleString()} total events in memory. Imported events are appended to the dataset and immediately evaluated by the detection engine.
        </p>
      </div>
    </div>
  );
}
