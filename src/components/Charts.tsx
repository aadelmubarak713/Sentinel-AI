import type { Severity } from '@/types';

export function sparkColor(s: Severity): string {
  switch (s) {
    case 'critical': return '#ef4444';
    case 'high': return '#fb923c';
    case 'medium': return '#f59e0b';
    case 'low': return '#22d3ee';
    case 'info': return '#64748b';
  }
}

// Simple SVG line chart for event counts over time buckets.
export function TrendChart({
  data,
  height = 160,
  color = '#22d3ee',
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const w = 720;
  const h = height;
  const pad = { left: 40, right: 12, top: 12, bottom: 22 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const points = data.map((d, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + innerH - (d.value / max) * innerH;
    return [x, y];
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pad.left + innerW} ${pad.top + innerH} L${pad.left} ${pad.top + innerH} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => {
        const y = pad.top + innerH - (t / max) * innerH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y} stroke="#1a2434" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="JetBrains Mono">
              {t}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={1.8} fill={color} />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pad.left + i * stepX} y={h - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="9" fill="#64748b" fontFamily="JetBrains Mono">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// Horizontal bar chart for severity distribution
export function SeverityBars({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium">{d.label}</span>
            <span className="font-mono text-slate-400">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Donut chart for outcome distribution
export function DonutChart({
  data,
  size = 140,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((n, d) => n + d.value, 0) || 1;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2434" strokeWidth="10" />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = frac * circumference;
        const seg = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return seg;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="700" fill="#e2e8f0" fontFamily="Inter">
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="JetBrains Mono">
        EVENTS
      </text>
    </svg>
  );
}
