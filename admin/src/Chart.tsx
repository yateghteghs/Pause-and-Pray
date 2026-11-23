import { useState } from 'react';

/**
 * Columns for one series over time (members praying per day). Single series:
 * the title names it, so no legend. Thin columns with a 4px rounded top, a 2px
 * gap, a recessive hairline grid, and a hover tooltip per column. The busiest
 * day and today are labelled; everything else is in the tooltip and the table.
 */
export function DailyColumns({ data, valueLabel }: { data: { day: string; members: number }[]; valueLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { top: 22, right: 8, bottom: 24, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.members));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const slot = innerW / data.length;
  const barW = Math.min(18, slot - 2);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const peak = data.reduce((best, d, i) => (d.members > data[best].members ? i : best), 0);
  const last = data.length - 1;
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <div className="chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${valueLabel}, last ${data.length} days. Highest ${data[peak]?.members} on ${fmt(data[peak]?.day ?? '')}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} />
            <text className="axis" x={pad.left - 6} y={y(t) + 4} textAnchor="end">
              {t.toLocaleString()}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          const h = Math.max(0, y(0) - y(d.members));
          const r = Math.min(4, h, barW / 2);
          const label = i === peak || i === last;
          return (
            <g key={d.day}>
              <path
                className={`bar${hover !== null && hover !== i ? ' dim' : ''}`}
                d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barW - r} Q${x + barW},${y(0) - h} ${x + barW},${y(0) - h + r} V${y(0)} Z`}
              />
              {label ? (
                <text className="axis" x={x + barW / 2} y={y(d.members) - 6} textAnchor="middle">
                  {d.members.toLocaleString()}
                </text>
              ) : null}
              <rect className="hit" x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
        {[0, Math.floor(last / 2), last].map((i) => (
          <text key={i} className="axis" x={pad.left + i * slot + slot / 2} y={H - 6} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}>
            {i === last ? 'Today' : fmt(data[i].day)}
          </text>
        ))}
      </svg>
      {hover !== null ? (
        <div className="tip" style={{ left: `${((pad.left + hover * slot + slot / 2) / W) * 100}%`, top: `${(y(data[hover].members) / H) * 100}%` }}>
          <b className="num">{data[hover].members.toLocaleString()}</b> {valueLabel.toLowerCase()} · {fmt(data[hover].day)}
        </div>
      ) : null}
    </div>
  );
}

function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
