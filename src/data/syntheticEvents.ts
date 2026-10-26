import type { SecurityEvent, EventCategory, EventOutcome, Severity } from '@/types';

// Deterministic synthetic security event dataset (DEMO DATA)
// All events are fabricated and labeled as DEMO DATA in the UI.
// Never represented as live network telemetry.

const INTERNAL_HOSTS = [
  'srv-auth-01.prod',
  'srv-auth-02.prod',
  'db-cluster-01.prod',
  'srv-web-04.prod',
  'srv-web-07.prod',
  'bastion-01.prod',
  'git-runner-02.prod',
  'k8s-node-05.prod',
  'vpn-gw-01.edge',
  'mail-relay-01.edge',
];

const INTERNAL_USERS = [
  'a.chen',
  'j.martinez',
  's.patel',
  'm.olsen',
  'k.tanaka',
  'r.singh',
  'l.nguyen',
  't.brooks',
  'admin-svc',
  'deploy-bot',
  'c.wright',
  'd.fischer',
];

const ATTACKER_IPS = [
  '45.133.1.7',
  '185.220.101.45',
  '104.244.72.113',
  '193.27.228.219',
  '23.129.64.144',
  '171.252.85.12',
  '91.218.114.99',
  '62.204.56.21',
];

const LEGIT_IPS = [
  '10.20.30.12',
  '10.20.30.18',
  '10.20.40.55',
  '172.16.8.22',
  '172.16.8.91',
  '198.51.100.24',
  '203.0.113.7',
  '192.168.55.14',
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

let seq = 0;
function id(): string {
  seq += 1;
  return `evt-${seq.toString().padStart(4, '0')}`;
}

// Deterministic pseudo-random based on index
function rng(seed: number): number {
  const x = Math.sin(seed * 9999 + 7) * 10000;
  return x - Math.floor(x);
}

function iso(offsetMinutes: number): string {
  const base = new Date('2026-10-26T09:00:00Z');
  base.setMinutes(base.getMinutes() + offsetMinutes);
  return base.toISOString();
}

interface EventTemplate {
  category: EventCategory;
  type: string;
  severity: Severity;
  message: string;
  build: (i: number) => Partial<SecurityEvent>;
}

// Build a brute-force scenario at ~ 9:12-9:19
function bruteForceScenario(): SecurityEvent[] {
  const events: SecurityEvent[] = [];
  const attacker = '45.133.1.7';
  const target = 'a.chen';
  const host = 'srv-auth-01.prod';
  for (let i = 0; i < 28; i++) {
    const ev: SecurityEvent = {
      id: id(),
      timestamp: iso(12 + i * 0.4),
      category: 'authentication',
      type: 'login_failed',
      severity: i > 18 ? 'high' : 'medium',
      outcome: 'failure',
      sourceIp: attacker,
      sourceHost: 'tor-exit-relay-42',
      destination: host,
      username: target,
      message: `Failed login attempt for ${target} from ${attacker}`,
      details: {
        auth_method: 'password',
        reason: 'invalid_credentials',
        attempt: i + 1,
        user_agent: 'curl/7.88.1',
      },
    };
    events.push(ev);
  }
  // one success after many failures — credential stuffing pivot
  events.push({
    id: id(),
    timestamp: iso(12 + 28 * 0.4 + 1),
    category: 'authentication',
    type: 'login_success',
    severity: 'critical',
    outcome: 'success',
    sourceIp: attacker,
    sourceHost: 'tor-exit-relay-42',
    destination: host,
    username: target,
    message: `Successful login for ${target} following repeated failures`,
    details: { auth_method: 'password', user_agent: 'curl/7.88.1', mfa_used: false },
  });
  return events;
}

// Suspicious login burst — many successful logins for one user across many IPs quickly
function loginBurstScenario(): SecurityEvent[] {
  const events: SecurityEvent[] = [];
  const user = 'm.olsen';
  const hosts = ['srv-auth-01.prod', 'srv-auth-02.prod', 'vpn-gw-01.edge'];
  for (let i = 0; i < 14; i++) {
    const ip = i < 8 ? pick(LEGIT_IPS, i) : pick(ATTACKER_IPS, i - 8);
    events.push({
      id: id(),
      timestamp: iso(60 + i * 1.2),
      category: 'authentication',
      type: 'login_success',
      severity: i >= 8 ? 'high' : 'info',
      outcome: 'success',
      sourceIp: ip,
      sourceHost: i >= 8 ? 'unknown' : 'corp-laptop-33',
      destination: pick(hosts, i),
      username: user,
      message: `Successful login for ${user} from ${ip}`,
      details: { auth_method: 'sso', mfa_used: i < 8, device_fingerprint: `dev-${i % 6}` },
    });
  }
  return events;
}

// Privilege escalation — admin-svc grants role to attacker-controlled user
function privilegeEscalationScenario(): SecurityEvent[] {
  const events: SecurityEvent[] = [];
  events.push({
    id: id(),
    timestamp: iso(95),
    category: 'privilege',
    type: 'role_grant',
    severity: 'critical',
    outcome: 'suspicious',
    sourceIp: '203.0.113.7',
    sourceHost: 'bastion-01.prod',
    destination: 'db-cluster-01.prod',
    username: 'admin-svc',
    message: 'admin-svc granted role "superuser" to c.wright',
    details: { granted_role: 'superuser', target_user: 'c.wright', granted_by: 'admin-svc' },
  });
  events.push({
    id: id(),
    timestamp: iso(96),
    category: 'data_access',
    type: 'bulk_export',
    severity: 'critical',
    outcome: 'suspicious',
    sourceIp: '203.0.113.7',
    sourceHost: 'db-cluster-01.prod',
    destination: 'db-cluster-01.prod',
    username: 'c.wright',
    message: 'Bulk export of customer table by c.wright (42,108 rows)',
    details: { table: 'customers', rows_exported: 42108, query: 'SELECT * FROM customers' },
  });
  return events;
}

// Malware callback beacon from compromised endpoint
function malwareBeaconScenario(): SecurityEvent[] {
  const events: SecurityEvent[] = [];
  const c2 = '91.218.114.99';
  for (let i = 0; i < 6; i++) {
    events.push({
      id: id(),
      timestamp: iso(140 + i * 5),
      category: 'malware',
      type: 'c2_beacon',
      severity: 'critical',
      outcome: 'blocked',
      sourceIp: '10.20.40.55',
      sourceHost: 'srv-web-07.prod',
      destination: c2,
      username: null,
      message: `C2 beacon callback from srv-web-07.prod to ${c2}`,
      details: { port: 8443, interval_sec: 300, beacon_signature: 'cobalt-strike-like' },
    });
  }
  return events;
}

// Normal background events for realism
function backgroundEvents(): SecurityEvent[] {
  const events: SecurityEvent[] = [];
  const types: EventTemplate[] = [
    {
      category: 'authentication',
      type: 'login_success',
      severity: 'info',
      message: 'Routine login',
      build: (i) => ({
        sourceIp: pick(LEGIT_IPS, i),
        sourceHost: 'corp-laptop-12',
        destination: 'srv-auth-02.prod',
        username: pick(INTERNAL_USERS, i),
        outcome: 'success',
        details: { auth_method: 'sso', mfa_used: true },
      }),
    },
    {
      category: 'network',
      type: 'firewall_allow',
      severity: 'info',
      message: 'Allowed outbound connection',
      build: (i) => ({
        sourceIp: pick(LEGIT_IPS, i + 3),
        sourceHost: pick(INTERNAL_HOSTS, i),
        destination: '203.0.113.50',
        username: null,
        outcome: 'success',
        details: { port: 443, protocol: 'tcp', bytes: Math.floor(rng(i) * 50000) },
      }),
    },
    {
      category: 'data_access',
      type: 'read',
      severity: 'low',
      message: 'Routine table read',
      build: (i) => ({
        sourceIp: '10.20.30.12',
        sourceHost: 'db-cluster-01.prod',
        destination: 'db-cluster-01.prod',
        username: pick(INTERNAL_USERS, i + 4),
        outcome: 'success',
        details: { table: 'orders', rows: Math.floor(rng(i + 1) * 200) + 1 },
      }),
    },
    {
      category: 'endpoint',
      type: 'process_start',
      severity: 'low',
      message: 'Process started',
      build: (i) => ({
        sourceIp: '172.16.8.22',
        sourceHost: pick(INTERNAL_HOSTS, i + 2),
        destination: pick(INTERNAL_HOSTS, i + 2),
        username: pick(INTERNAL_USERS, i + 2),
        outcome: 'success',
        details: { process: 'nginx', pid: 1000 + i },
      }),
    },
    {
      category: 'authentication',
      type: 'login_failed',
      severity: 'low',
      message: 'Single failed login (legitimate typo)',
      build: (i) => ({
        sourceIp: pick(LEGIT_IPS, i + 5),
        sourceHost: 'corp-laptop-21',
        destination: 'srv-auth-01.prod',
        username: pick(INTERNAL_USERS, i + 6),
        outcome: 'failure',
        details: { auth_method: 'password', reason: 'invalid_credentials' },
      }),
    },
    {
      category: 'config',
      type: 'config_change',
      severity: 'medium',
      message: 'Configuration change applied',
      build: (i) => ({
        sourceIp: '10.20.30.18',
        sourceHost: 'git-runner-02.prod',
        destination: 'k8s-node-05.prod',
        username: 'deploy-bot',
        outcome: 'success',
        details: { change: 'replicas 3->4', service: 'api-gateway' },
      }),
    },
    {
      category: 'network',
      type: 'port_scan',
      severity: 'medium',
      message: 'Port scan detected at perimeter',
      build: (i) => ({
        sourceIp: pick(ATTACKER_IPS, i + 2),
        sourceHost: 'unknown',
        destination: 'vpn-gw-01.edge',
        username: null,
        outcome: 'blocked',
        details: { ports_scanned: 1024, blocked: true },
      }),
    },
    {
      category: 'endpoint',
      type: 'antivirus_block',
      severity: 'high',
      message: 'Antivirus quarantined suspicious file',
      build: (i) => ({
        sourceIp: '172.16.8.91',
        sourceHost: 'srv-web-04.prod',
        destination: 'srv-web-04.prod',
        username: null,
        outcome: 'blocked',
        details: { file: 'invoice.exe', signature: 'Trojan.GenericKD.44221' },
      }),
    },
  ];
  for (let i = 0; i < 80; i++) {
    const t = types[i % types.length];
    const built = t.build(i);
    events.push({
      id: id(),
      timestamp: iso(-120 + i * 3 + Math.floor(rng(i) * 2)),
      category: t.category,
      type: t.type,
      severity: t.severity,
      outcome: built.outcome ?? 'success',
      sourceIp: built.sourceIp ?? '10.0.0.1',
      sourceHost: built.sourceHost ?? 'unknown',
      destination: built.destination ?? 'unknown',
      username: built.username ?? null,
      message: t.message,
      details: built.details ?? {},
    });
  }
  return events;
}

export function generateInitialEvents(): SecurityEvent[] {
  const events = [
    ...backgroundEvents(),
    ...bruteForceScenario(),
    ...loginBurstScenario(),
    ...privilegeEscalationScenario(),
    ...malwareBeaconScenario(),
  ];
  // sort by timestamp
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  // re-sequence ids after sort for stable display
  events.forEach((e, i) => {
    e.id = `evt-${(i + 1).toString().padStart(4, '0')}`;
  });
  return events;
}

export function generateDemoRuleDefaults() {
  return {
    failedLoginsThreshold: 5,
    failedLoginsWindow: 15,
    bruteForceThreshold: 20,
    bruteForceWindow: 10,
    loginBurstThreshold: 10,
    loginBurstWindow: 20,
    eventFrequencyThreshold: 30,
    eventFrequencyWindow: 5,
    retentionDays: 90,
    autoGroupIncidents: true,
    demoMode: true,
  };
}
