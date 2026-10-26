// Core domain types for Sentinel AI

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type EventCategory =
  | 'authentication'
  | 'network'
  | 'endpoint'
  | 'data_access'
  | 'privilege'
  | 'malware'
  | 'config';

export type EventOutcome = 'success' | 'failure' | 'blocked' | 'suspicious';

export interface SecurityEvent {
  id: string;
  timestamp: string; // ISO 8601
  category: EventCategory;
  type: string;
  severity: Severity;
  outcome: EventOutcome;
  sourceIp: string;
  sourceHost: string;
  destination: string;
  username: string | null;
  message: string;
  details: Record<string, string | number | boolean>;
}

export type AlertStatus = 'open' | 'investigating' | 'resolved';

export type DetectionRuleType =
  | 'failed_logins'
  | 'brute_force'
  | 'login_burst'
  | 'event_frequency';

export interface DetectionRule {
  id: string;
  name: string;
  type: DetectionRuleType;
  enabled: boolean;
  severity: Severity;
  description: string;
  // threshold config keyed by type
  threshold: number;
  windowMinutes: number;
  createdAt: string;
}

export interface DetectionFinding {
  ruleId: string;
  ruleName: string;
  ruleType: DetectionRuleType;
  severity: Severity;
  description: string;
  evidence: SecurityEvent[];
  key: string; // grouping key (e.g. sourceIp or username)
  keyValue: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: Severity;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  findings: DetectionFinding[];
  affectedEntities: AffectedEntity[];
  notes: AnalystNote[];
  recommendation: string;
  incidentId: string | null;
}

export interface AffectedEntity {
  kind: 'user' | 'host' | 'ip';
  value: string;
  note: string;
}

export interface AnalystNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  kind: 'observation' | 'hypothesis' | 'action';
}

export interface IncidentReport {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  alertIds: string[];
  createdAt: string;
  updatedAt: string;
  author: string;
  timeline: { timestamp: string; text: string }[];
  findings: string[];
  recommendations: string[];
  status: AlertStatus;
}

export interface Settings {
  failedLoginsThreshold: number;
  failedLoginsWindow: number;
  bruteForceThreshold: number;
  bruteForceWindow: number;
  loginBurstThreshold: number;
  loginBurstWindow: number;
  eventFrequencyThreshold: number;
  eventFrequencyWindow: number;
  retentionDays: number;
  autoGroupIncidents: boolean;
  demoMode: boolean;
}

export type PageKey =
  | 'overview'
  | 'events'
  | 'rules'
  | 'alerts'
  | 'analyst'
  | 'logs'
  | 'reports'
  | 'settings';

export interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}
