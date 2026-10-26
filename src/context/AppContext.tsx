import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  SecurityEvent,
  DetectionRule,
  Alert,
  AlertStatus,
  IncidentReport,
  Settings,
  AnalystNote,
} from '@/types';
import { generateInitialEvents, generateDemoRuleDefaults } from '@/data/syntheticEvents';
import { defaultRules } from '@/data/defaultRules';
import { runDetection, buildAlerts, makeNote } from '@/lib/detection';

const STORAGE_KEY = 'sentinel-ai-state-v1';

interface PersistShape {
  events: SecurityEvent[];
  rules: DetectionRule[];
  alerts: Alert[];
  reports: IncidentReport[];
  notes: Record<string, AnalystNote[]>;
  settings: Settings;
  isDemoData: boolean;
}

interface AppContextValue {
  events: SecurityEvent[];
  rules: DetectionRule[];
  alerts: Alert[];
  reports: IncidentReport[];
  settings: Settings;
  isDemoData: boolean;
  setRules: (r: DetectionRule[]) => void;
  updateRule: (id: string, patch: Partial<DetectionRule>) => void;
  setAlertStatus: (alertId: string, status: AlertStatus) => void;
  addNote: (alertId: string, text: string, kind: AnalystNote['kind'], author: string) => void;
  addImportedEvents: (events: SecurityEvent[]) => void;
  createReport: (r: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReport: (id: string, patch: Partial<IncidentReport>) => void;
  deleteReport: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemoData: () => void;
  recomputeAlerts: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function load(): PersistShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistShape;
  } catch {
    return null;
  }
}

function initialSettings(): Settings {
  return { ...generateDemoRuleDefaults() } as Settings;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [persist, setPersist] = useState<PersistShape>(() => {
    const loaded = load();
    if (loaded) return loaded;
    const events = generateInitialEvents();
    const rules = defaultRules();
    return {
      events,
      rules,
      alerts: [],
      reports: [],
      notes: {},
      settings: initialSettings(),
      isDemoData: true,
    };
  });

  const [events, setEvents] = useState<SecurityEvent[]>(persist.events);
  const [rules, setRules] = useState<DetectionRule[]>(persist.rules);
  const [alerts, setAlerts] = useState<Alert[]>(persist.alerts);
  const [reports, setReports] = useState<IncidentReport[]>(persist.reports);
  const [notes, setNotes] = useState<Record<string, AnalystNote[]>>(persist.notes);
  const [settings, setSettings] = useState<Settings>(persist.settings);
  const [isDemoData, setIsDemoData] = useState<boolean>(persist.isDemoData);

  // Persist
  useEffect(() => {
    const data: PersistShape = { events, rules, alerts, reports, notes, settings, isDemoData };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota */
    }
  }, [events, rules, alerts, reports, notes, settings, isDemoData]);

  const recomputeAlerts = useCallback(() => {
    setAlerts((prev) => {
      const { findings } = runDetection(events, rules);
      const fresh = buildAlerts(findings, settings.autoGroupIncidents);
      // Preserve status & notes from existing alerts by matching id
      const prevById = new Map(prev.map((a) => [a.id, a]));
      const merged = fresh.map((a) => {
        const old = prevById.get(a.id);
        if (old) {
          return {
            ...a,
            status: old.status,
            notes: old.notes,
            incidentId: old.incidentId,
            updatedAt: old.updatedAt,
          };
        }
        return a;
      });
      return merged.sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
    });
  }, [events, rules, settings.autoGroupIncidents]);

  // Recompute alerts whenever events/rules change
  useEffect(() => {
    recomputeAlerts();
  }, [recomputeAlerts]);

  const updateRule = useCallback((id: string, patch: Partial<DetectionRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const setAlertStatus = useCallback((alertId: string, status: AlertStatus) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status, updatedAt: new Date().toISOString() } : a,
      ),
    );
  }, []);

  const addNote = useCallback(
    (alertId: string, text: string, kind: AnalystNote['kind'], author: string) => {
      const note = makeNote(text, author, kind);
      setNotes((prev) => ({ ...prev, [alertId]: [...(prev[alertId] ?? []), note] }));
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, notes: [...a.notes, note], updatedAt: new Date().toISOString() } : a,
        ),
      );
    },
    [],
  );

  const addImportedEvents = useCallback((newEvents: SecurityEvent[]) => {
    setEvents((prev) => {
      const merged = [...prev, ...newEvents];
      merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      return merged;
    });
    setIsDemoData(false);
  }, []);

  const createReport = useCallback(
    (r: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `inc-${(reports.length + 1).toString().padStart(3, '0')}`;
      setReports((prev) => [
        ...prev,
        { ...r, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]);
    },
    [reports.length],
  );

  const updateReport = useCallback((id: string, patch: Partial<IncidentReport>) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)),
    );
  }, []);

  const deleteReport = useCallback((id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // Sync rule thresholds from settings when changed
      setRules((prevRules) =>
        prevRules.map((rule) => {
          switch (rule.type) {
            case 'failed_logins':
              return { ...rule, threshold: next.failedLoginsThreshold, windowMinutes: next.failedLoginsWindow };
            case 'brute_force':
              return { ...rule, threshold: next.bruteForceThreshold, windowMinutes: next.bruteForceWindow };
            case 'login_burst':
              return { ...rule, threshold: next.loginBurstThreshold, windowMinutes: next.loginBurstWindow };
            case 'event_frequency':
              return { ...rule, threshold: next.eventFrequencyThreshold, windowMinutes: next.eventFrequencyWindow };
            default:
              return rule;
          }
        }),
      );
      return next;
    });
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = generateInitialEvents();
    setEvents(fresh);
    setRules(defaultRules());
    setReports([]);
    setNotes({});
    setSettings(initialSettings());
    setIsDemoData(true);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      events,
      rules,
      alerts,
      reports,
      settings,
      isDemoData,
      setRules,
      updateRule,
      setAlertStatus,
      addNote,
      addImportedEvents,
      createReport,
      updateReport,
      deleteReport,
      updateSettings,
      resetDemoData,
      recomputeAlerts,
    }),
    [events, rules, alerts, reports, settings, isDemoData, updateRule, setAlertStatus, addNote, addImportedEvents, createReport, updateReport, deleteReport, updateSettings, resetDemoData, recomputeAlerts],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function sevRank(s: string): number {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[s] ?? 0;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
