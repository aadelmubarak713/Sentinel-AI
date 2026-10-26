import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SeverityBadge } from '@/components/Badges';
import { analyzeAlert } from '@/lib/analyst';
import type { Alert } from '@/types';
import { Bot, AlertCircle, CheckCircle2, HelpCircle, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';

export function AnalystPage({ selectedAlertId }: { selectedAlertId: string | null }) {
  const { alerts } = useApp();
  const [chosenId, setChosenId] = useState<string>(selectedAlertId ?? alerts[0]?.id ?? '');
  const alert = alerts.find((a) => a.id === chosenId) ?? null;

  const analysis = useMemo(() => (alert ? analyzeAlert(alert) : null), [alert]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="soc-card p-5 border-cyan-500/20 bg-gradient-to-br from-ink-850 to-ink-900">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-100">AI Security Analyst</h1>
            <p className="text-xs text-slate-400 mt-1">
              Generates plain-English explanations that separate <span className="text-cyan-300">observed facts</span> from <span className="text-warning">hypotheses</span>, states uncertainty, and suggests defensive actions. In a production deployment, this would be backed by a server-side model endpoint; the current engine is a deterministic local rule-based reasoner.
            </p>
          </div>
        </div>
      </div>

      <div className="soc-card p-5">
        <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Select Alert to Analyze</label>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {alerts.map((a) => (
            <button
              key={a.id}
              onClick={() => setChosenId(a.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${chosenId === a.id ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-ink-800/50 border-ink-700 hover:border-ink-600'}`}
            >
              <SeverityBadge severity={a.severity} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-200 truncate">{a.title}</div>
                <div className="text-[10px] text-slate-500 font-mono">{a.id}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {alert && analysis && (
        <AnalysisView alert={alert} result={analysis} />
      )}
    </div>
  );
}

function AnalysisView({ alert, result }: { alert: Alert; result: ReturnType<typeof analyzeAlert> }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="soc-card p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Executive Summary</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
      </div>

      <div className="soc-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Analysis</h2>
        <div className="space-y-3">
          {result.sections.map((s, i) => (
            <div key={i} className={`rounded-lg border p-4 ${sectionStyle(s.kind).bg} ${sectionStyle(s.kind).border}`}>
              <div className="flex items-center gap-2 mb-2">
                {sectionStyle(s.kind).icon}
                <span className={`text-xs font-semibold ${sectionStyle(s.kind).text}`}>{s.heading}</span>
                <span className="ml-auto text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-ink-900/60 text-slate-400">
                  {s.confidence}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="soc-card p-5 border-warning/20">
        <div className="flex items-center gap-2.5 mb-2">
          <AlertCircle className="w-4 h-4 text-warning" />
          <h2 className="text-sm font-semibold text-warning">Uncertainty Statement</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{result.uncertainty}</p>
      </div>

      <div className="soc-card p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <ShieldCheck className="w-4 h-4 text-success" />
          <h2 className="text-sm font-semibold text-slate-200">Suggested Defensive Actions</h2>
        </div>
        <div className="space-y-2">
          {result.suggestedActions.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
              <span className="text-success font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>
              <span className="leading-relaxed">{a}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="soc-card p-4 bg-ink-900/60">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-mono font-semibold text-slate-400">DISCLAIMER · </span>
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}

function sectionStyle(kind: 'fact' | 'hypothesis' | 'action') {
  if (kind === 'fact') return { bg: 'bg-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-300', icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" /> };
  if (kind === 'hypothesis') return { bg: 'bg-warning/5', border: 'border-warning/20', text: 'text-warning', icon: <HelpCircle className="w-4 h-4 text-warning" /> };
  return { bg: 'bg-success/5', border: 'border-success/20', text: 'text-success', icon: <ShieldCheck className="w-4 h-4 text-success" /> };
}
