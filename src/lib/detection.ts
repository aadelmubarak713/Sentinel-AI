import type {
  SecurityEvent,
  DetectionRule,
  DetectionFinding,
  Alert,
  AffectedEntity,
  AnalystNote,
} from '@/types';

// Deterministic detection engine.
// All thresholds come from DetectionRule definitions. No randomness.

function withinWindow(events: SecurityEvent[], windowMinutes: number): SecurityEvent[] {
  if (events.length === 0) return events;
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const cutoff = last - windowMinutes * 60 * 1000;
  return sorted.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
}

// Find any sliding window where count >= threshold within windowMinutes.
function slidingWindowBreach(
  events: SecurityEvent[],
  threshold: number,
  windowMinutes: number,
): SecurityEvent[] | null {
  if (events.length < threshold) return null;
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const times = sorted.map((e) => new Date(e.timestamp).getTime());
  const winMs = windowMinutes * 60 * 1000;
  for (let i = threshold - 1; i < times.length; i++) {
    if (times[i] - times[i - threshold + 1] <= winMs) {
      // Return the full group of events that are within this window
      return sorted.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= times[i] - winMs && t <= times[i];
      });
    }
  }
  return null;
}

function groupBy<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(item);
  }
  return m;
}

function maxSeverity(severities: string[]): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 } as const;
  let max = 'info';
  for (const s of severities) {
    if ((order as Record<string, number>)[s] > (order as Record<string, number>)[max]) max = s;
  }
  return max as 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export interface DetectionResult {
  findings: DetectionFinding[];
}

export function runDetection(events: SecurityEvent[], rules: DetectionRule[]): DetectionResult {
  const findings: DetectionFinding[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    switch (rule.type) {
      case 'failed_logins': {
        const failed = events.filter(
          (e) => e.category === 'authentication' && e.outcome === 'failure',
        );
        const byIp = groupBy(failed, (e) => e.sourceIp);
        for (const [ip, evs] of byIp) {
          const breach = slidingWindowBreach(evs, rule.threshold, rule.windowMinutes);
          if (breach) {
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: rule.type,
              severity: rule.severity,
              description: `Source IP ${ip} produced ${breach.length} failed login attempts within ${rule.windowMinutes} minutes (threshold: ${rule.threshold}).`,
              evidence: breach,
              key: 'sourceIp',
              keyValue: ip,
            });
          }
        }
        break;
      }
      case 'brute_force': {
        const failed = events.filter(
          (e) => e.category === 'authentication' && e.outcome === 'failure',
        );
        const byIpUser = groupBy(failed, (e) => `${e.sourceIp}|${e.username ?? '?'}`);
        for (const [gk, evs] of byIpUser) {
          const breach = slidingWindowBreach(evs, rule.threshold, rule.windowMinutes);
          if (breach) {
            const [ip, user] = gk.split('|');
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: rule.type,
              severity: rule.severity,
              description: `Source IP ${ip} produced ${breach.length} failed logins against account ${user} within ${rule.windowMinutes} minutes, consistent with a brute-force credential attack.`,
              evidence: breach,
              key: 'sourceIp|user',
              keyValue: gk,
            });
          }
        }
        break;
      }
      case 'login_burst': {
        const successes = events.filter(
          (e) => e.category === 'authentication' && e.outcome === 'success',
        );
        const byUser = groupBy(successes, (e) => e.username ?? '?');
        for (const [user, evs] of byUser) {
          // distinct IPs within window
          if (evs.length < rule.threshold) continue;
          const inWindow = withinWindow(evs, rule.windowMinutes);
          const ips = new Set(inWindow.map((e) => e.sourceIp));
          if (ips.size >= 3 && inWindow.length >= rule.threshold) {
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: rule.type,
              severity: rule.severity,
              description: `User ${user} authenticated ${inWindow.length} times from ${ips.size} distinct source IPs within ${rule.windowMinutes} minutes, indicating a suspicious login burst.`,
              evidence: inWindow,
              key: 'username',
              keyValue: user,
            });
          }
        }
        break;
      }
      case 'event_frequency': {
        const byIp = groupBy(events, (e) => e.sourceIp);
        for (const [ip, evs] of byIp) {
          const breach = slidingWindowBreach(evs, rule.threshold, rule.windowMinutes);
          if (breach) {
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: rule.type,
              severity: rule.severity,
              description: `Source IP ${ip} generated ${breach.length} events within ${rule.windowMinutes} minutes, an unusually high frequency consistent with automated tooling.`,
              evidence: breach,
              key: 'sourceIp',
              keyValue: ip,
            });
          }
        }
        break;
      }
    }
  }
  return { findings };
}

function buildAffectedEntities(findings: DetectionFinding[]): AffectedEntity[] {
  const ents = new Map<string, AffectedEntity>();
  for (const f of findings) {
    for (const e of f.evidence) {
      if (e.sourceIp) {
        const k = `ip|${e.sourceIp}`;
        if (!ents.has(k))
          ents.set(k, { kind: 'ip', value: e.sourceIp, note: 'Source of suspicious activity' });
      }
      if (e.username) {
        const k = `user|${e.username}`;
        if (!ents.has(k))
          ents.set(k, { kind: 'user', value: e.username, note: 'Account involved in detection' });
      }
      if (e.destination) {
        const k = `host|${e.destination}`;
        if (!ents.has(k))
          ents.set(k, { kind: 'host', value: e.destination, note: 'Target resource' });
      }
    }
  }
  return Array.from(ents.values());
}

function buildRecommendation(findings: DetectionFinding[]): string {
  if (findings.length === 0) return 'No remediation recommended.';
  const types = new Set(findings.map((f) => f.ruleType));
  const parts: string[] = [];
  if (types.has('brute_force') || types.has('failed_logins')) {
    parts.push('Block the source IP at the perimeter and require password reset + MFA for affected accounts.');
  }
  if (types.has('login_burst')) {
    parts.push('Revoke active sessions for the affected user and investigate whether session tokens were reused.');
  }
  if (types.has('event_frequency')) {
    parts.push('Rate-limit the source IP and review whether the traffic pattern matches a known scanner or agent.');
  }
  // Always include a conservative note
  parts.push('Confirm observations against source system logs before taking irreversible action.');
  return parts.join(' ');
}

function shouldGroupIntoIncident(findings: DetectionFinding[]): boolean {
  // If multiple findings share an affected IP, treat as one incident.
  if (findings.length < 2) return false;
  const ips = new Set<string>();
  for (const f of findings) {
    for (const e of f.evidence) {
      if (e.sourceIp) ips.add(e.sourceIp);
    }
  }
  return ips.size <= 3 && findings.length >= 2;
}

export function buildAlerts(
  findings: DetectionFinding[],
  autoGroup: boolean,
): Alert[] {
  const alerts: Alert[] = [];
  if (!autoGroup || findings.length === 0) {
    for (const f of findings) {
      const a = findingToAlert(f);
      alerts.push(a);
    }
    return alerts;
  }

  // group by shared source IP
  const groups = new Map<string, DetectionFinding[]>();
  const assigned = new Set<number>();
  for (let i = 0; i < findings.length; i++) {
    if (assigned.has(i)) continue;
    const group: DetectionFinding[] = [findings[i]];
    assigned.add(i);
    const ips = new Set(findings[i].evidence.map((e) => e.sourceIp));
    for (let j = i + 1; j < findings.length; j++) {
      if (assigned.has(j)) continue;
      const shared = findings[j].evidence.some((e) => ips.has(e.sourceIp));
      if (shared && shouldGroupIntoIncident([findings[i], findings[j]])) {
        group.push(findings[j]);
        assigned.add(j);
        findings[j].evidence.forEach((e) => ips.add(e.sourceIp));
      }
    }
    const key = Array.from(ips).sort().join(',');
    groups.set(key, group);
  }

  let alertIdx = 0;
  for (const [, group] of groups) {
    alertIdx += 1;
    if (group.length === 1) {
      const a = findingToAlert(group[0]);
      alerts.push(a);
    } else {
      const sev = maxSeverity(group.map((f) => f.severity));
      const title = `Compound incident: ${group.map((f) => f.ruleName).join(' + ')}`;
      const evidence = group.flatMap((f) => f.evidence);
      alerts.push({
        id: `alert-${alertIdx.toString().padStart(3, '0')}`,
        title,
        severity: sev,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        findings: group,
        affectedEntities: buildAffectedEntities(group),
        notes: [],
        recommendation: buildRecommendation(group),
        incidentId: null,
      });
    }
  }
  return alerts;
}

function findingToAlert(f: DetectionFinding): Alert {
  return {
    id: `alert-${f.ruleId.slice(-2)}-${f.keyValue.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`,
    title: `${f.ruleName}: ${f.keyValue}`,
    severity: f.severity,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    findings: [f],
    affectedEntities: buildAffectedEntities([f]),
    notes: [],
    recommendation: buildRecommendation([f]),
    incidentId: null,
  };
}

export function makeNote(
  text: string,
  author: string,
  kind: AnalystNote['kind'],
): AnalystNote {
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author,
    text,
    kind,
    timestamp: new Date().toISOString(),
  };
}
