import type { Severity, AlertStatus } from '@/types';

const sevConfig: Record<Severity, { dot: string; text: string; bg: string; border: string; label: string }> = {
  critical: { dot: 'bg-critical', text: 'text-critical', bg: 'bg-critical/10', border: 'border-critical/30', label: 'CRITICAL' },
  high: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', label: 'HIGH' },
  medium: { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', label: 'MEDIUM' },
  low: { dot: 'bg-cyan-400', text: 'text-cyan-300', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', label: 'LOW' },
  info: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', label: 'INFO' },
};

export function severityConfig(s: Severity) {
  return sevConfig[s];
}

export function SeverityBadge({ severity, size = 'sm' }: { severity: Severity; size?: 'xs' | 'sm' | 'md' }) {
  const c = sevConfig[severity];
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded font-mono font-semibold ${c.bg} ${c.text} ${c.border} border ${pad}`}>
      <span className={`severity-dot ${c.dot}`} />
      {c.label}
    </span>
  );
}

const statusConfig: Record<AlertStatus, { text: string; bg: string; border: string; dot: string; label: string }> = {
  open: { text: 'text-critical', bg: 'bg-critical/10', border: 'border-critical/30', dot: 'bg-critical', label: 'Open' },
  investigating: { text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', dot: 'bg-warning', label: 'Investigating' },
  resolved: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/30', dot: 'bg-success', label: 'Resolved' },
};

export function StatusBadge({ status }: { status: AlertStatus }) {
  const c = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text} ${c.border} border`}>
      <span className={`severity-dot ${c.dot} ${status === 'investigating' ? 'animate-pulse-soft' : ''}`} />
      {c.label}
    </span>
  );
}

export function Dot({ severity }: { severity: Severity }) {
  return <span className={`severity-dot ${sevConfig[severity].dot}`} />;
}
