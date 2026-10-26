import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SeverityBadge } from '@/components/Badges';
import type { DetectionRule, DetectionRuleType, Severity } from '@/types';
import { ShieldCheck, Power, Sliders, Plus, X } from 'lucide-react';

const RULE_TYPE_LABELS: Record<DetectionRuleType, string> = {
  failed_logins: 'Failed Logins',
  brute_force: 'Brute-Force',
  login_burst: 'Login Burst',
  event_frequency: 'Event Frequency',
};

const RULE_TYPE_ICONS: Record<DetectionRuleType, string> = {
  failed_logins: 'Repeated failed authentication attempts from one source',
  brute_force: 'High-volume failed logins against a single account',
  login_burst: 'Many successful logins for one user across many IPs',
  event_frequency: 'Abnormally high event rate from a single source',
};

export function RulesPage() {
  const { rules, updateRule, setRules } = useApp();
  const [editing, setEditing] = useState<DetectionRule | null>(null);

  const addRule = () => {
    const id = `rule-custom-${Date.now().toString(36)}`;
    const newRule: DetectionRule = {
      id,
      name: 'New Detection Rule',
      type: 'failed_logins',
      enabled: true,
      severity: 'medium',
      description: RULE_TYPE_ICONS['failed_logins'],
      threshold: 5,
      windowMinutes: 15,
      createdAt: new Date().toISOString(),
    };
    setRules([...rules, newRule]);
    setEditing(newRule);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {rules.length} detection rule{rules.length === 1 ? '' : 's'} · {rules.filter((r) => r.enabled).length} active
        </p>
        <button className="soc-btn-primary" onClick={addRule}>
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className={`soc-card p-5 ${!rule.enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${rule.enabled ? 'bg-cyan-500/10 text-cyan-400' : 'bg-ink-700 text-slate-500'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{rule.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{RULE_TYPE_LABELS[rule.type]}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={rule.enabled}
                  onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                />
                <div className="w-9 h-5 bg-ink-700 peer-checked:bg-cyan-500/70 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
              </label>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">{rule.description}</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">Threshold</div>
                <div className="text-lg font-semibold text-slate-100 font-mono">{rule.threshold}</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">Window</div>
                <div className="text-lg font-semibold text-slate-100 font-mono">{rule.windowMinutes}<span className="text-xs text-slate-500 ml-1">min</span></div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-1">Severity</div>
                <SeverityBadge severity={rule.severity} size="xs" />
              </div>
            </div>
            <button className="soc-btn-ghost w-full" onClick={() => setEditing(rule)}>
              <Sliders className="w-4 h-4" /> Configure
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <RuleEditor
          rule={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateRule(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function RuleEditor({
  rule,
  onSave,
  onClose,
}: {
  rule: DetectionRule;
  onSave: (patch: Partial<DetectionRule>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule.name);
  const [type, setType] = useState(rule.type);
  const [severity, setSeverity] = useState<Severity>(rule.severity);
  const [threshold, setThreshold] = useState(rule.threshold);
  const [windowMinutes, setWindowMinutes] = useState(rule.windowMinutes);
  const [description, setDescription] = useState(rule.description);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative soc-card w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" /> Configure Rule
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Name</label>
            <input className="soc-input w-full mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Rule Type</label>
              <select className="soc-input w-full mt-1" value={type} onChange={(e) => setType(e.target.value as DetectionRuleType)}>
                {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Severity</label>
              <select className="soc-input w-full mt-1" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                {['critical', 'high', 'medium', 'low', 'info'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Threshold (count)</label>
              <input type="number" min={1} className="soc-input w-full mt-1" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Window (minutes)</label>
              <input type="number" min={1} className="soc-input w-full mt-1" value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-mono tracking-wider">Description</label>
            <textarea className="soc-input w-full mt-1 min-h-[72px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button className="soc-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="soc-btn-primary"
            onClick={() => onSave({ name, type, severity, threshold, windowMinutes, description })}
          >
            <Power className="w-4 h-4" /> Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
