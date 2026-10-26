import type { SecurityEvent, EventCategory, EventOutcome, Severity } from '@/types';

// Lightweight CSV parser supporting quoted fields and commas.
// Does not implement every RFC 4180 edge case — good enough for SOC log imports.

export interface ParsedRecord {
  row: number;
  ok: boolean;
  event?: SecurityEvent;
  errors: string[];
}

const CATEGORIES = new Set<EventCategory>([
  'authentication',
  'network',
  'endpoint',
  'data_access',
  'privilege',
  'malware',
  'config',
]);

const OUTCOMES = new Set<EventOutcome>(['success', 'failure', 'blocked', 'suspicious']);
const SEVERITIES = new Set<Severity>(['critical', 'high', 'medium', 'low', 'info']);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cur.push(field);
        field = '';
      } else if (ch === '\n') {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else if (ch === '\r') {
        // ignore
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

function coerceValue(raw: string): string | number | boolean {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t !== '' && !isNaN(Number(t)) && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function validateEvent(row: Record<string, string>, rowIdx: number, idBase: string): { event?: SecurityEvent; errors: string[] } {
  const errors: string[] = [];
  const timestamp = row['timestamp'] ?? row['time'] ?? row['@timestamp'] ?? '';
  const category = (row['category'] ?? row['event_category'] ?? '').toLowerCase();
  const type = row['type'] ?? row['event_type'] ?? '';
  const severity = (row['severity'] ?? 'info').toLowerCase();
  const outcome = (row['outcome'] ?? 'success').toLowerCase();
  const sourceIp = row['source_ip'] ?? row['sourceip'] ?? row['src_ip'] ?? '';
  const sourceHost = row['source_host'] ?? row['host'] ?? '';
  const destination = row['destination'] ?? row['dest'] ?? '';
  const username = row['username'] ?? row['user'] ?? '';
  const message = row['message'] ?? row['msg'] ?? '';

  if (!timestamp) errors.push('missing timestamp');
  else if (isNaN(Date.parse(timestamp))) errors.push(`invalid timestamp: ${timestamp}`);
  if (!category) errors.push('missing category');
  else if (!CATEGORIES.has(category as EventCategory)) errors.push(`unknown category: ${category}`);
  if (!type) errors.push('missing type');
  if (severity && !SEVERITIES.has(severity as Severity)) errors.push(`unknown severity: ${severity}`);
  if (outcome && !OUTCOMES.has(outcome as EventOutcome)) errors.push(`unknown outcome: ${outcome}`);
  if (!sourceIp) errors.push('missing source_ip');

  if (errors.length > 0) return { errors };

  const details: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(row)) {
    if (['timestamp', 'time', '@timestamp', 'category', 'event_category', 'type', 'event_type',
      'severity', 'outcome', 'source_ip', 'sourceip', 'src_ip', 'source_host', 'host',
      'destination', 'dest', 'username', 'user', 'message', 'msg'].includes(k)) {
      continue;
    }
    if (v) details[k] = coerceValue(v);
  }

  const event: SecurityEvent = {
    id: `${idBase}-r${rowIdx}`,
    timestamp: new Date(timestamp).toISOString(),
    category: category as EventCategory,
    type,
    severity: (severity || 'info') as Severity,
    outcome: (outcome || 'success') as EventOutcome,
    sourceIp,
    sourceHost: sourceHost || 'unknown',
    destination: destination || 'unknown',
    username: username || null,
    message: message || `${type} from ${sourceIp}`,
    details,
  };
  return { event, errors: [] };
}

export interface ImportResult {
  records: ParsedRecord[];
  valid: SecurityEvent[];
  errors: ParsedRecord[];
  totalRows: number;
}

export function parseImport(text: string, idBase: string): ImportResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { records: [], valid: [], errors: [], totalRows: 0 };
  }
  // JSON detection
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJson(trimmed, idBase);
  }
  return parseCsvStream(trimmed, idBase);
}

function parseCsvStream(text: string, idBase: string): ImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { records: [], valid: [], errors: [], totalRows: Math.max(0, rows.length - 1) };
  }
  const header = rows[0].map((h) => h.trim());
  const records: ParsedRecord[] = [];
  const valid: SecurityEvent[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && !row[0].trim()) continue; // skip blank
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = (row[idx] ?? '').trim();
    });
    const { event, errors } = validateEvent(obj, i, idBase);
    if (event && errors.length === 0) {
      records.push({ row: i, ok: true, event, errors: [] });
      valid.push(event);
    } else {
      records.push({ row: i, ok: false, errors });
    }
  }
  return { records, valid, errors: records.filter((r) => !r.ok), totalRows: records.length };
}

function parseJson(text: string, idBase: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return {
      records: [{ row: 0, ok: false, errors: [`invalid JSON: ${(e as Error).message}`] }],
      valid: [],
      errors: [],
      totalRows: 0,
    };
  }
  const arr = Array.isArray(data) ? data : [data];
  const records: ParsedRecord[] = [];
  const valid: SecurityEvent[] = [];
  arr.forEach((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      records.push({ row: idx + 1, ok: false, errors: ['row is not an object'] });
      return;
    }
    const obj = item as Record<string, unknown>;
    const strObj: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      strObj[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    const { event, errors } = validateEvent(strObj, idx + 1, idBase);
    if (event && errors.length === 0) {
      records.push({ row: idx + 1, ok: true, event, errors: [] });
      valid.push(event);
    } else {
      records.push({ row: idx + 1, ok: false, errors });
    }
  });
  return { records, valid, errors: records.filter((r) => !r.ok), totalRows: records.length };
}

export function sampleCsvLog(): string {
  return [
    'timestamp,category,type,severity,outcome,source_ip,source_host,destination,username,message',
    '2026-10-26T08:15:00Z,authentication,login_failed,medium,failure,45.133.1.7,tor-exit-01,srv-auth-01.prod,a.chen,Failed login for a.chen',
    '2026-10-26T08:15:30Z,authentication,login_failed,medium,failure,45.133.1.7,tor-exit-01,srv-auth-01.prod,a.chen,Failed login for a.chen',
    '2026-10-26T08:16:00Z,authentication,login_failed,high,failure,45.133.1.7,tor-exit-01,srv-auth-01.prod,a.chen,Failed login for a.chen',
    '2026-10-26T08:16:30Z,authentication,login_failed,high,failure,45.133.1.7,tor-exit-01,srv-auth-01.prod,a.chen,Failed login for a.chen',
    '2026-10-26T08:17:00Z,authentication,login_failed,high,failure,45.133.1.7,tor-exit-01,srv-auth-01.prod,a.chen,Failed login for a.chen',
    '2026-10-26T08:18:00Z,malware,c2_beacon,critical,blocked,10.20.40.55,srv-web-07.prod,91.218.114.99,,C2 beacon blocked',
  ].join('\n');
}
