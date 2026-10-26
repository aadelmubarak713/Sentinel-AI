import { useApp } from '@/context/AppContext';
import type { Settings } from '@/types';
import { Settings as SettingsIcon, RotateCcw, Sliders, Database, ShieldAlert, Info } from 'lucide-react';

export function SettingsPage() {
  const { settings, updateSettings, resetDemoData, rules, alerts, events } = useApp();

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      <div className="soc-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-cyan-400" /> Detection Thresholds
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Adjust the thresholds and time windows used by the detection engine. Changes propagate to the corresponding rules and immediately re-evaluate all events.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Threshold
            label="Repeated Failed Logins — threshold"
            value={settings.failedLoginsThreshold}
            onChange={(v) => updateSettings({ failedLoginsThreshold: v })}
            min={2}
            max={50}
            unit="attempts"
          />
          <Threshold
            label="Repeated Failed Logins — window"
            value={settings.failedLoginsWindow}
            onChange={(v) => updateSettings({ failedLoginsWindow: v })}
            min={1}
            max={120}
            unit="minutes"
          />
          <Threshold
            label="Brute-Force — threshold"
            value={settings.bruteForceThreshold}
            onChange={(v) => updateSettings({ bruteForceThreshold: v })}
            min={5}
            max={200}
            unit="attempts"
          />
          <Threshold
            label="Brute-Force — window"
            value={settings.bruteForceWindow}
            onChange={(v) => updateSettings({ bruteForceWindow: v })}
            min={1}
            max={120}
            unit="minutes"
          />
          <Threshold
            label="Login Burst — threshold"
            value={settings.loginBurstThreshold}
            onChange={(v) => updateSettings({ loginBurstThreshold: v })}
            min={3}
            max={100}
            unit="logins"
          />
          <Threshold
            label="Login Burst — window"
            value={settings.loginBurstWindow}
            onChange={(v) => updateSettings({ loginBurstWindow: v })}
            min={1}
            max={240}
            unit="minutes"
          />
          <Threshold
            label="Event Frequency — threshold"
            value={settings.eventFrequencyThreshold}
            onChange={(v) => updateSettings({ eventFrequencyThreshold: v })}
            min={10}
            max={500}
            unit="events"
          />
          <Threshold
            label="Event Frequency — window"
            value={settings.eventFrequencyWindow}
            onChange={(v) => updateSettings({ eventFrequencyWindow: v })}
            min={1}
            max={60}
            unit="minutes"
          />
        </div>
      </div>

      <div className="soc-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-cyan-400" /> Data Management
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Control retention and how related detections are grouped into compound incidents.
        </p>
        <div className="space-y-4">
          <Threshold
            label="Retention period"
            value={settings.retentionDays}
            onChange={(v) => updateSettings({ retentionDays: v })}
            min={7}
            max={365}
            unit="days"
          />
          <label className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm text-slate-200">Auto-group related alerts into incidents</div>
              <p className="text-xs text-slate-500 mt-0.5">When multiple findings share a source IP, combine them into one compound incident.</p>
            </div>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.autoGroupIncidents}
              onChange={(e) => updateSettings({ autoGroupIncidents: e.target.checked })}
            />
            <div className="w-11 h-6 bg-ink-700 peer-checked:bg-cyan-500/70 rounded-full peer transition-colors relative">
              <span className="absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>
      </div>

      <div className="soc-card p-5">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-cyan-400" /> Application Configuration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="Events loaded" value={events.length} />
          <Stat label="Detection rules" value={rules.length} />
          <Stat label="Active alerts" value={alerts.length} />
          <Stat label="Data mode" value={settings.demoMode ? 'Demo' : 'Live'} />
        </div>
        <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded-lg flex items-start gap-2 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span>The application never auto-executes remediation actions or scans third-party systems. Suggested actions are advisory and require analyst confirmation. AI analysis runs locally in DEMO MODE — no external API calls are made from the browser.</span>
        </div>
      </div>

      <div className="soc-card p-5 border-critical/20">
        <h2 className="text-sm font-semibold text-critical flex items-center gap-2 mb-1">
          <RotateCcw className="w-4 h-4" /> Reset Demo Data
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Restore the original synthetic event dataset, default detection rules, and clear all analyst notes and reports. This action cannot be undone.
        </p>
        <button
          className="soc-btn-danger"
          onClick={() => {
            if (confirm('Reset all data to the original demo state? This clears imported events, notes, and reports.')) resetDemoData();
          }}
        >
          <RotateCcw className="w-4 h-4" /> Reset to demo state
        </button>
      </div>
    </div>
  );
}

function Threshold({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-300 font-medium">{label}</label>
      <div className="flex items-center gap-3 mt-1.5">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-cyan-500"
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="soc-input w-20 text-center font-mono"
        />
        <span className="text-xs text-slate-500 w-16">{unit}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-ink-800/50 border border-ink-700 rounded-lg px-3 py-2.5">
      <div className="text-lg font-semibold text-slate-100 font-mono">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">{label}</div>
    </div>
  );
}
