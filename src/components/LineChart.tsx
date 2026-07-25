import { useState } from "react";

export type Point = { key: string; value: number; label?: string };

export function LineChart({
  points,
  height = 160,
  color = "var(--color-info)",
  emptyLabel = "No data.",
}: {
  points: Point[];
  height?: number;
  color?: string;
  emptyLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const padX = 32;
  const padY = 16;
  const width = Math.max(320, points.length * 44);
  const innerH = height - padY * 2;
  const innerW = width - padX * 2;
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;

  const coords = points.map((p, i) => ({
    x: padX + i * step,
    y: padY + innerH - (p.value / 100) * innerH,
    ...p,
  }));

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const todayIdx = coords.length - 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="Trend chart">
          {[0, 25, 50, 75, 100].map((y) => {
            const yy = padY + innerH - (y / 100) * innerH;
            return (
              <g key={y}>
                <line x1={padX} x2={width - padX / 2} y1={yy} y2={yy} stroke="var(--color-border)" strokeDasharray="2 3" />
                <text x={4} y={yy + 3} fontSize="9" fill="var(--color-muted-foreground)">
                  {y}
                </text>
              </g>
            );
          })}
          {coords.length > 0 && (
            <line
              x1={coords[todayIdx].x}
              x2={coords[todayIdx].x}
              y1={padY}
              y2={padY + innerH}
              stroke="var(--color-destructive)"
              strokeDasharray="3 3"
              opacity={0.5}
            />
          )}
          <path d={path} fill="none" stroke={color} strokeWidth={2} />
          {coords.map((c, i) => (
            <g key={c.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={c.x} cy={c.y} r={hover === i ? 5 : 3} fill={color} />
              {i % Math.max(1, Math.ceil(coords.length / 6)) === 0 && (
                <text
                  x={c.x}
                  y={height - 2}
                  fontSize="9"
                  textAnchor="middle"
                  fill="var(--color-muted-foreground)"
                >
                  {c.label ?? shortDay(c.key)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {hover !== null
          ? `${shortDay(coords[hover].key)} · ${coords[hover].value}%`
          : `Latest ${shortDay(coords[todayIdx].key)} · ${coords[todayIdx].value}%`}
      </div>
    </div>
  );
}

function shortDay(key: string) {
  const d = new Date(key + "T00:00:00");
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
