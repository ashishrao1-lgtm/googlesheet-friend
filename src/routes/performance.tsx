import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";

import { getFleetData, type AdhocRow, type FixedRow } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { driMatches, type FleetSession } from "@/lib/session";
import { getResolutions } from "@/lib/resolutions";
import { LineChart, type Point } from "@/components/LineChart";
import { VendorSplitTable, type VendorRow } from "@/components/VendorSplitTable";
import { FilterButton, FilterSheet } from "@/components/FilterSheet";
import {
  EMPTY_FILTERS,
  applyAdhocFilters,
  applyFixedFilters,
  uniqueAdhocOptions,
  uniqueFixedOptions,
  type FilterState,
} from "@/lib/filters";

function fleetQueryOptions() {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => getFleetData(),
    staleTime: 5 * 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance · Delhivery Intracity Fleet" },
      {
        name: "description",
        content:
          "Day-level on-time trend, vendor split, axle-app placement % and reporting breach % for your AOR.",
      },
      { property: "og:title", content: "Performance · Delhivery Intracity Fleet" },
      {
        property: "og:description",
        content:
          "Day-level on-time trend, vendor split, axle-app placement % and reporting breach % for your AOR.",
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

import { parseDate, dayKey } from "@/lib/dates";

function isOnTime(s: string | undefined): boolean {
  const v = (s || "").toLowerCase().replace(/[\s_-]/g, "");
  return v === "ontime";
}
function isDelayed(s: string | undefined): boolean {
  return (s || "").toLowerCase().includes("delay");
}

function PerformancePage({ session }: { session: FleetSession }) {
  const { data } = useSuspenseQuery(fleetQueryOptions());
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scope, setScope] = useState<"fixed" | "adhoc">("fixed");
  const [showVendorFixed, setShowVendorFixed] = useState(false);
  const [showVendorAdhoc, setShowVendorAdhoc] = useState(false);

  const mineFixed = useMemo(
    () => data.fixed.filter((r) => driMatches(r.fleetDri, session.dri)),
    [data.fixed, session.dri],
  );
  const mineAdhoc = useMemo(
    () => data.adhoc.filter((r) => driMatches(r.fleetDri, session.dri)),
    [data.adhoc, session.dri],
  );

  const myFixed = useMemo(() => applyFixedFilters(mineFixed, filters), [mineFixed, filters]);
  const myAdhoc = useMemo(() => applyAdhocFilters(mineAdhoc, filters), [mineAdhoc, filters]);

  const dailyFixed: Point[] = useMemo(() => buildDailyFixed(myFixed), [myFixed]);
  const dailyAxle: Point[] = useMemo(() => buildDailyAxle(myAdhoc), [myAdhoc]);
  const dailyBreach: Point[] = useMemo(() => buildDailyBreach(myAdhoc), [myAdhoc]);

  const fixedSummary = useMemo(() => summarizeFixed(myFixed), [myFixed]);
  const adhocSummary = useMemo(() => summarizeAdhoc(myAdhoc), [myAdhoc]);

  const vendorFixed: VendorRow[] = useMemo(() => vendorSplitFixed(myFixed), [myFixed]);
  const vendorAdhoc: VendorRow[] = useMemo(() => vendorSplitAdhoc(myAdhoc), [myAdhoc]);

  // ---- Personal scorecard (you vs team average) ----
  const scorecard = useMemo(() => {
    const myOnTime = mineFixed.filter((r) => isOnTime(r.status)).length;
    const myFixedOnTimePct = mineFixed.length ? Math.round((myOnTime / mineFixed.length) * 100) : 0;

    const teamTotal = data.fixed.length;
    const teamOnTime = data.fixed.filter((r) => isOnTime(r.status)).length;
    const teamFixedOnTimePct = teamTotal ? Math.round((teamOnTime / teamTotal) * 100) : 0;

    const myDelayedSet = new Set(
      mineAdhoc.filter((r) => isDelayed(r.ontimePlacement)).map((r) => r.ticketNo),
    );
    const myTicketSet = new Set(mineAdhoc.filter((r) => r.ontimePlacement).map((r) => r.ticketNo));
    const myBreachPct = myTicketSet.size
      ? Math.round((myDelayedSet.size / myTicketSet.size) * 100)
      : 0;

    const teamDelayedSet = new Set(
      data.adhoc.filter((r) => isDelayed(r.ontimePlacement)).map((r) => r.ticketNo),
    );
    const teamTicketSet = new Set(data.adhoc.filter((r) => r.ontimePlacement).map((r) => r.ticketNo));
    const teamBreachPct = teamTicketSet.size
      ? Math.round((teamDelayedSet.size / teamTicketSet.size) * 100)
      : 0;

    const resolvedCount = getResolutions(session.dri).length;
    const totalAlerts = mineFixed.length + mineAdhoc.length;
    const resolutionRate = totalAlerts ? Math.round((resolvedCount / totalAlerts) * 100) : 0;

    return {
      myFixedOnTimePct,
      teamFixedOnTimePct,
      myBreachPct,
      teamBreachPct,
      resolutionRate,
      resolvedCount,
    };
  }, [mineFixed, mineAdhoc, data.fixed, data.adhoc, session.dri]);

  const options =
    scope === "fixed" ? uniqueFixedOptions(mineFixed) : uniqueAdhocOptions(mineAdhoc);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <div className="sticky top-0 z-40 space-y-2 bg-surface/95 px-4 pt-4 pb-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">Performance</h1>
            <p className="truncate text-[11px] text-muted-foreground">{session.dri}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-[12px] font-semibold">
          <button
            onClick={() => setScope("fixed")}
            data-active={scope === "fixed"}
            className="rounded-full py-2 text-secondary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            Fixed
          </button>
          <button
            onClick={() => setScope("adhoc")}
            data-active={scope === "adhoc"}
            className="rounded-full py-2 text-secondary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            Adhoc
          </button>
        </div>
      </div>

      {/* Personal scorecard */}
      <section className="mt-3 px-4">
        <div className="card-elevated rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Your AOR vs Team average</h3>
            <span className="label-meta">{scorecard.resolvedCount} resolved</span>
          </div>
          <div className="mt-3 space-y-2.5">
            <ScoreBar
              label="Fixed on-time %"
              you={scorecard.myFixedOnTimePct}
              team={scorecard.teamFixedOnTimePct}
              goodIsHigh
            />
            <ScoreBar
              label="Reporting breach %"
              you={scorecard.myBreachPct}
              team={scorecard.teamBreachPct}
              goodIsHigh={false}
            />
            <ScoreBar
              label="Resolution rate %"
              you={scorecard.resolutionRate}
              team={0}
              goodIsHigh
              teamHidden
            />
          </div>
        </div>
      </section>

      {scope === "fixed" && (
        <section className="mt-3 space-y-2 px-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Fixed performance</h2>
              <p className="text-[11px] text-muted-foreground">On-time attendance by day and vendor</p>
            </div>
            <FilterButton filters={filters} onClick={() => setFiltersOpen(true)} />
          </div>
          <SummaryTile
            title="Fixed on-time compliance"
            pct={fixedSummary.pct}
            detail={`${fixedSummary.onTime} on-time / ${fixedSummary.total} attendance`}
          />
          <ChartCard title="Daily on-time %" subtitle="status = On-time / total">
            <LineChart points={dailyFixed} emptyLabel="No fixed attendance in this window." />
          </ChartCard>

          <DetailSplitToggle
            open={showVendorFixed}
            onToggle={() => setShowVendorFixed((v) => !v)}
            label="Vendor-level on-time compliance"
          />
          {showVendorFixed && <VendorSplitTable rows={vendorFixed} title="Vendor" />}
        </section>
      )}

      {scope === "adhoc" && (
        <section className="mt-3 space-y-2 px-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Adhoc performance</h2>
              <p className="text-[11px] text-muted-foreground">Placement and reporting compliance</p>
            </div>
            <FilterButton filters={filters} onClick={() => setFiltersOpen(true)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryTile
              title="Axle-app placement %"
              pct={adhocSummary.axlePct}
              detail={`${adhocSummary.axle} of ${adhocSummary.withOrigin}`}
              small
            />
            <SummaryTile
              title="Reporting breached %"
              pct={adhocSummary.breachPct}
              detail={`${adhocSummary.delayed} delayed / ${adhocSummary.totalTickets}`}
              tone="danger"
              small
            />
          </div>

          <ChartCard title="Daily axle-app %" subtitle="count(bid_origin = axle-app) / count(bid_origin)">
            <LineChart
              points={dailyAxle}
              color="var(--color-info)"
              emptyLabel="No bid-origin data in this window."
            />
          </ChartCard>

          <ChartCard
            title="Daily reporting-breach %"
            subtitle="ontime_placement = Delayed (distinct tickets) / distinct tickets"
          >
            <LineChart
              points={dailyBreach}
              color="var(--color-destructive)"
              emptyLabel="No ontime_placement data in this window."
            />
          </ChartCard>

          <DetailSplitToggle
            open={showVendorAdhoc}
            onToggle={() => setShowVendorAdhoc((v) => !v)}
            label="Vendor-level placement compliance"
          />
          {showVendorAdhoc && <VendorSplitTable rows={vendorAdhoc} title="Vendor" />}
        </section>
      )}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={setFilters}
        options={options}
      />
      <BottomNav />
    </div>
  );
}

function ScoreBar({
  label,
  you,
  team,
  goodIsHigh,
  teamHidden,
}: {
  label: string;
  you: number;
  team: number;
  goodIsHigh: boolean;
  teamHidden?: boolean;
}) {
  const delta = you - team;
  const youWin = teamHidden ? true : goodIsHigh ? delta >= 0 : delta <= 0;
  const deltaColor = youWin ? "var(--color-success)" : "var(--color-destructive)";
  const arrow = teamHidden ? "" : delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="flex items-center gap-2">
          <span className="font-bold text-foreground">{you}%</span>
          {!teamHidden && (
            <span className="text-muted-foreground">team {team}%</span>
          )}
          {!teamHidden && (
            <span className="font-semibold" style={{ color: deltaColor }}>
              {arrow} {Math.abs(delta)}%
            </span>
          )}
        </span>
      </div>
      <div className="mt-1 flex h-2 gap-1">
        <div className="relative flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full" style={{ width: `${you}%`, background: "var(--color-primary)" }} />
        </div>
        {!teamHidden && (
          <div className="relative flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full" style={{ width: `${team}%`, background: "var(--color-muted-foreground)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  title,
  pct,
  detail,
  small,
  tone = "success",
}: {
  title: string;
  pct: number;
  detail: string;
  small?: boolean;
  tone?: "success" | "danger";
}) {
  const color = tone === "success" ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-1 flex items-end justify-between">
        <div className={small ? "text-2xl font-bold" : "text-3xl font-bold"} style={{ color }}>
          {pct}%
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function DetailSplitToggle({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="mt-1 flex w-full items-center justify-between rounded-xl bg-card px-3 py-2 text-sm font-semibold text-[color:var(--color-destructive)] shadow-sm"
    >
      <span>{open ? "Hide detailed split" : "Show detailed split"} · {label}</span>
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

// ============ calc helpers ============

function buildDailyFixed(rows: FixedRow[]): Point[] {
  const m = new Map<string, { total: number; onTime: number }>();
  for (const r of rows) {
    const d = parseDate(r.attendanceDate);
    if (!d) continue;
    const k = dayKey(d);
    const c = m.get(k) ?? { total: 0, onTime: 0 };
    c.total += 1;
    if (isOnTime(r.status)) c.onTime += 1;
    m.set(k, c);
  }
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({ key, value: v.total ? Math.round((v.onTime / v.total) * 100) : 0 }));
}

function buildDailyAxle(rows: AdhocRow[]): Point[] {
  const m = new Map<string, { total: number; axle: number }>();
  for (const r of rows) {
    const origin = (r.bidOrigin || "").trim().toLowerCase();
    if (!origin) continue;
    const d = parseDate(r.creationTime);
    if (!d) continue;
    const k = dayKey(d);
    const c = m.get(k) ?? { total: 0, axle: 0 };
    c.total += 1;
    if (origin.includes("axle")) c.axle += 1;
    m.set(k, c);
  }
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({ key, value: v.total ? Math.round((v.axle / v.total) * 100) : 0 }));
}

function buildDailyBreach(rows: AdhocRow[]): Point[] {
  const m = new Map<string, { tickets: Set<string>; delayed: Set<string> }>();
  for (const r of rows) {
    const p = (r.ontimePlacement || "").trim().toLowerCase();
    if (!p) continue;
    const d = parseDate(r.reportingTime) ?? parseDate(r.creationTime);
    if (!d) continue;
    const k = dayKey(d);
    const c = m.get(k) ?? { tickets: new Set(), delayed: new Set() };
    c.tickets.add(r.ticketNo);
    if (p.includes("delay")) c.delayed.add(r.ticketNo);
    m.set(k, c);
  }
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({
      key,
      value: v.tickets.size ? Math.round((v.delayed.size / v.tickets.size) * 100) : 0,
    }));
}

function summarizeFixed(rows: FixedRow[]) {
  const total = rows.length;
  const onTime = rows.filter((r) => isOnTime(r.status)).length;
  return { total, onTime, pct: total ? Math.round((onTime / total) * 100) : 0 };
}

function summarizeAdhoc(rows: AdhocRow[]) {
  const withOrigin = rows.filter((r) => r.bidOrigin).length;
  const axle = rows.filter((r) => (r.bidOrigin || "").toLowerCase().includes("axle")).length;
  const tickets = new Set(rows.filter((r) => r.ontimePlacement).map((r) => r.ticketNo));
  const delayed = new Set(
    rows.filter((r) => isDelayed(r.ontimePlacement)).map((r) => r.ticketNo),
  );
  return {
    withOrigin,
    axle,
    axlePct: withOrigin ? Math.round((axle / withOrigin) * 100) : 0,
    totalTickets: tickets.size,
    delayed: delayed.size,
    breachPct: tickets.size ? Math.round((delayed.size / tickets.size) * 100) : 0,
  };
}

function vendorSplitFixed(rows: FixedRow[]): VendorRow[] {
  const m = new Map<string, VendorRow>();
  for (const r of rows) {
    const v = (r.vendor || "").trim() || "—";
    const cur = m.get(v) ?? { vendor: v, total: 0, onTime: 0, delayed: 0, absent: 0 };
    cur.total += 1;
    if (isOnTime(r.status)) cur.onTime += 1;
    else if (isDelayed(r.status)) cur.delayed += 1;
    else cur.absent = (cur.absent ?? 0) + 1;
    m.set(v, cur);
  }
  return [...m.values()];
}

function vendorSplitAdhoc(rows: AdhocRow[]): VendorRow[] {
  const m = new Map<string, VendorRow>();
  for (const r of rows) {
    const v = (r.vendor || "").trim() || "—";
    const cur = m.get(v) ?? { vendor: v, total: 0, onTime: 0, delayed: 0 };
    cur.total += 1;
    if (isOnTime(r.ontimePlacement)) cur.onTime += 1;
    else if (isDelayed(r.ontimePlacement)) cur.delayed += 1;
    m.set(v, cur);
  }
  return [...m.values()];
}
