import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";

import { getFleetData } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import type { FleetSession } from "@/lib/session";

function fleetQueryOptions() {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => getFleetData(),
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance · Fleet Executive" },
      {
        name: "description",
        content:
          "Daily on-time performance charts for your assigned fixed vehicles and ad-hoc placements.",
      },
      { property: "og:title", content: "Performance · Fleet Executive" },
      {
        property: "og:description",
        content:
          "Daily on-time performance charts for your assigned fixed vehicles and ad-hoc placements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQueryOptions()),
  component: PerformanceRoute,
});

function PerformanceRoute() {
  return <AuthGate>{(s) => <PerformancePage session={s} />}</AuthGate>;
}

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function parseDate(s: string): Date | null {
  if (!s) return null;
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortDay(key: string): string {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function PerformancePage({ session }: { session: FleetSession }) {
  const { data } = useSuspenseQuery(fleetQueryOptions());
  const [days, setDays] = useState<number>(30);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d;
  }, [days]);

  const myFixed = useMemo(
    () =>
      data.fixed.filter((r) => {
        if (r.fleetDri !== session.dri) return false;
        const d = parseDate(r.attendanceDate);
        return !d || d >= cutoff;
      }),
    [data.fixed, session.dri, cutoff],
  );

  const myAdhoc = useMemo(
    () =>
      data.adhoc.filter((r) => {
        if (r.fleetDri !== session.dri) return false;
        const d = parseDate(r.creationTime);
        return !d || d >= cutoff;
      }),
    [data.adhoc, session.dri, cutoff],
  );

  const dailyFixed = useMemo(() => {
    const map = new Map<string, { total: number; onTime: number }>();
    for (const r of myFixed) {
      const d = parseDate(r.attendanceDate);
      if (!d) continue;
      const key = dayKey(d);
      const cur = map.get(key) ?? { total: 0, onTime: 0 };
      cur.total += 1;
      if (r.status === "On-time") cur.onTime += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({
        key,
        pct: v.total === 0 ? 0 : Math.round((v.onTime / v.total) * 100),
        total: v.total,
        onTime: v.onTime,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [myFixed]);

  const dailyAdhoc = useMemo(() => {
    const map = new Map<string, { total: number; onTime: number }>();
    for (const r of myAdhoc) {
      const placement = (r.ontimePlacement || "").trim().toLowerCase();
      if (!placement) continue;
      const d = parseDate(r.reportingTime) ?? parseDate(r.creationTime);
      if (!d) continue;
      const key = dayKey(d);
      const cur = map.get(key) ?? { total: 0, onTime: 0 };
      cur.total += 1;
      if (placement.includes("on-time") || placement.includes("ontime") || placement === "on time") {
        cur.onTime += 1;
      }
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({
        key,
        pct: v.total === 0 ? 0 : Math.round((v.onTime / v.total) * 100),
        total: v.total,
        onTime: v.onTime,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [myAdhoc]);

  const fixedSummary = useMemo(() => {
    const total = myFixed.length;
    const onTime = myFixed.filter((r) => r.status === "On-time").length;
    return { total, onTime, pct: total ? Math.round((onTime / total) * 100) : 0 };
  }, [myFixed]);

  const adhocSummary = useMemo(() => {
    const withPlacement = myAdhoc.filter((r) => r.ontimePlacement);
    const total = withPlacement.length;
    const onTime = withPlacement.filter((r) =>
      (r.ontimePlacement || "").toLowerCase().includes("on-time") ||
      (r.ontimePlacement || "").toLowerCase().includes("ontime"),
    ).length;
    return { total, onTime, pct: total ? Math.round((onTime / total) * 100) : 0 };
  }, [myAdhoc]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-surface/95 px-4 pt-4 pb-3 backdrop-blur">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">Performance</h1>
          <p className="truncate text-[11px] text-muted-foreground">{session.dri}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-secondary p-1 text-[11px] font-semibold">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.days}
              onClick={() => setDays(o.days)}
              data-active={days === o.days}
              className="rounded-full px-2.5 py-1 text-secondary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-2 px-4">
        <SummaryTile
          title="Fixed on-time compliance"
          subtitle="Vehicles reporting on schedule"
          pct={fixedSummary.pct}
          detail={`${fixedSummary.onTime} on-time / ${fixedSummary.total} attendance`}
        />
        <ChartCard
          title="Daily on-time %"
          empty="No fixed attendance in this window."
          bars={dailyFixed}
        />
      </section>

      <section className="mt-4 space-y-2 px-4">
        <SummaryTile
          title="Ad-hoc placement compliance"
          subtitle="Placements meeting reporting time"
          pct={adhocSummary.pct}
          detail={`${adhocSummary.onTime} on-time / ${adhocSummary.total} classified placements`}
        />
        <ChartCard
          title="Daily placement on-time %"
          empty="No ad-hoc placements with on-time data in this window."
          bars={dailyAdhoc}
        />
      </section>

      <BottomNav />
    </div>
  );
}

function SummaryTile({
  title,
  subtitle,
  pct,
  detail,
}: {
  title: string;
  subtitle: string;
  pct: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-3xl font-bold text-[color:var(--color-success)]">{pct}%</div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: "var(--color-success)" }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function ChartCard({
  title,
  empty,
  bars,
}: {
  title: string;
  empty: string;
  bars: { key: string; pct: number; total: number; onTime: number }[];
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{bars.length} days</span>
      </div>
      {bars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          {empty}
        </div>
      ) : (
        <BarChart bars={bars} />
      )}
    </div>
  );
}

function BarChart({
  bars,
}: {
  bars: { key: string; pct: number; total: number; onTime: number }[];
}) {
  const max = 100;
  const height = 140;
  const gap = 4;
  const barW = 14;
  const width = bars.length * (barW + gap);
  const [active, setActive] = useState<number | null>(null);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          width={Math.max(width, 320)}
          height={height + 24}
          role="img"
          aria-label="Daily on-time percentage"
        >
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1={0}
              x2={Math.max(width, 320)}
              y1={height - (y / max) * height}
              y2={height - (y / max) * height}
              stroke="var(--color-border)"
              strokeDasharray="2 3"
            />
          ))}
          {bars.map((b, i) => {
            const h = (b.pct / max) * height;
            const x = i * (barW + gap);
            const y = height - h;
            const fill =
              b.pct >= 85
                ? "var(--color-success)"
                : b.pct >= 65
                  ? "oklch(0.72 0.16 75)"
                  : "var(--color-destructive)";
            return (
              <g key={b.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, 2)}
                  rx={3}
                  fill={fill}
                  opacity={active === null || active === i ? 1 : 0.55}
                />
                {i % Math.max(1, Math.ceil(bars.length / 6)) === 0 && (
                  <text
                    x={x + barW / 2}
                    y={height + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill="var(--color-muted-foreground)"
                  >
                    {shortDay(b.key)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {active !== null
          ? `${shortDay(bars[active].key)} · ${bars[active].pct}% (${bars[active].onTime}/${bars[active].total})`
          : `Latest ${shortDay(bars[bars.length - 1].key)} · ${bars[bars.length - 1].pct}%`}
      </div>
    </div>
  );
}
