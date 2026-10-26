import type { DetectionRule } from '@/types';

export function defaultRules(): DetectionRule[] {
  return [
    {
      id: 'rule-failed-logins',
      name: 'Repeated Failed Logins',
      type: 'failed_logins',
      enabled: true,
      severity: 'medium',
      description:
        'Triggers when a single source IP exceeds the configured number of failed authentication attempts within the time window.',
      threshold: 5,
      windowMinutes: 15,
      createdAt: '2026-10-20T00:00:00Z',
    },
    {
      id: 'rule-brute-force',
      name: 'Brute-Force Pattern',
      type: 'brute_force',
      enabled: true,
      severity: 'high',
      description:
        'Triggers when a source IP produces a high volume of failed logins against a single account, indicating a credential attack.',
      threshold: 20,
      windowMinutes: 10,
      createdAt: '2026-10-20T00:00:00Z',
    },
    {
      id: 'rule-login-burst',
      name: 'Suspicious Login Burst',
      type: 'login_burst',
      enabled: true,
      severity: 'high',
      description:
        'Triggers when a single user authenticates successfully from many distinct source IPs in a short window, possibly indicating token reuse or session hijacking.',
      threshold: 10,
      windowMinutes: 20,
      createdAt: '2026-10-20T00:00:00Z',
    },
    {
      id: 'rule-event-frequency',
      name: 'Unusual Event Frequency',
      type: 'event_frequency',
      enabled: true,
      severity: 'medium',
      description:
        'Triggers when a single source IP generates an abnormally high number of any events in a short window, indicating a possible automated tool.',
      threshold: 30,
      windowMinutes: 5,
      createdAt: '2026-10-20T00:00:00Z',
    },
  ];
}
