import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, LogOut, RotateCcw, Sparkles, X } from "lucide-react";

import { getFleetData, type AdhocRow, type FixedRow } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { clearSession, driMatches, formatDateTime, type FleetSession } from "@/lib/session";
import {
  adhocAlertId,
  fixedAlertId,
  getResolutions,
  markResolved,
  resolvedIds,
  unresolve,
  type ResolvedEntry,
} from "@/lib/resolutions";
import { FilterButton, FilterSheet } from "@/components/FilterSheet";
import {
  EMPTY_FILTERS,
  applyAdhocFilters,
  applyFixedFilters,
  uniqueAdhocOptions,
  uniqueFixedOptions,
  type FilterState,
} from "@/lib/filters";
import { isAdhocOpen, isFixedMissing } from "@/lib/alerts";
import { bySlaUrgency, slaColor, slaLabel, slaTone, timeToBreach } from "@/lib/sla";
import { logAction } from "@/lib/actions.functions";

function fleetQueryOptions() {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => getFleetData(),
    staleTime: 5 * 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delhivery Intracity Fleet · Alerts" },
      {
        name: "description",
        content:
          "Fleet Ops actionable alerts: adhoc tickets and fixed contracts pending attendance in your AOR.",
      },
      { property: "og:title", content: "Delhivery Intracity Fleet · Alerts" },
      {
        property: "og:description",
        content: "Actionable adhoc tickets and fixed contracts pending attendance in your AOR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQueryOptions()),
  component: DashboardRoute,
});

function CoverageNote({ from }: { from: string }) {
  return (
    <p className="rounded-xl border border-border/60 bg-card px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      Loaded data starts {new Date(from + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}.
      The selected date is outside that window, so counts may be incomplete.
    </p>
  );
}

function DashboardRoute() {
  return <AuthGate>{(session) => <DashboardPage session={session} />}</AuthGate>;
}

import { parseDate, sameDay } from "@/lib/dates";

function isTruckConfirmed(r: AdhocRow): boolean {
  const s = (r.ticketStatus || "").toLowerCase();
  return s === "truck_confirmed" || s === "truck confirmed";
}

// Derive "current date" from the latest date present in the dataset.
function latestDate(dates: (string | undefined)[]): Date | null {
  let latest: Date | null = null;
  for (const s of dates) {
    const d = parseDate(s || "");
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

function DashboardPage({ session }: { session: FleetSession }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, dataUpdatedAt } = useSuspenseQuery(fleetQueryOptions());
  const [tab, setTab] = useState<"adhoc" | "fixed" | "resolved">("adhoc");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resolvedTick, setResolvedTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const mine = useMemo(
    () => ({
      fixed: data.fixed.filter((r) => driMatches(r.fleetDri, session.dri)),
      adhoc: data.adhoc.filter((r) => driMatches(r.fleetDri, session.dri)),
    }),
    [data, session.dri],
  );

  const today = useMemo(() => latestDate(mine.fixed.map((r) => r.reportingTime)), [mine.fixed]);
  const todayAdhoc = useMemo(
    () => latestDate(mine.adhoc.map((r) => r.creationTime)),
    [mine.adhoc],
  );

  const filteredFixed = useMemo(() => applyFixedFilters(mine.fixed, filters), [mine.fixed, filters]);
  const filteredAdhoc = useMemo(() => applyAdhocFilters(mine.adhoc, filters), [mine.adhoc, filters]);

  const resolved = useMemo(() => {
    void resolvedTick;
    return resolvedIds(session.dri);
  }, [session.dri, resolvedTick]);

  // Only latest-date open adhoc tickets (unless the user set an explicit range).
  const adhocAlerts = useMemo(() => {
    const dateActive = !!(filters.dateFrom || filters.dateTo);
    const list = filteredAdhoc
      .filter(isAdhocOpen)
      .filter((r) => {
        if (dateActive) return true;
        if (!todayAdhoc) return true;
        const d = parseDate(r.creationTime);
        return !!d && sameDay(d, todayAdhoc);
      })
      .filter((r) => !resolved.has(adhocAlertId(r.ticketNo)));
    return bySlaUrgency(list, (r) => r.reportingTime);
  }, [filteredAdhoc, resolved, todayAdhoc, filters.dateFrom, filters.dateTo]);

  // Show only rows whose reportingTime falls on the "current data date" —
  // i.e. vehicles that are yet to report today.
  const fixedAlerts = useMemo(() => {
    const dateActive = !!(filters.dateFrom || filters.dateTo);
    const list = filteredFixed
      .filter(isFixedMissing)
      .filter((r) => {
        if (dateActive) return true; // user chose an explicit range
        if (!today) return true;
        const d = parseDate(r.reportingTime);
        return !!d && sameDay(d, today);
      })
      .filter((r) => !resolved.has(fixedAlertId(r.contractNumber, r.reportingTime)));
    return bySlaUrgency(list, (r) => r.reportingTime);
  }, [filteredFixed, resolved, today, filters.dateFrom, filters.dateTo]);

  // Human label for the day currently in scope (explicit filter wins).
  const scopeDate = filters.dateFrom || filters.dateTo || "";
  const scopeLabel = scopeDate
    ? new Date(scopeDate + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    : null;
  const outOfWindow = !!(
    scopeDate && data.coverageFrom && scopeDate < data.coverageFrom
  );

  const resolvedList = useMemo(() => {
    void resolvedTick;
    return getResolutions(session.dri);
  }, [session.dri, resolvedTick]);

  // ---- Today digest (latest data day, regardless of filters) ----
  const digest = useMemo(() => {
    const adhocRequestedToday = mine.adhoc
      .filter(isAdhocOpen)
      .filter((r) => (todayAdhoc ? sameDay(parseDate(r.creationTime) ?? new Date(0), todayAdhoc) : true))
      .length;
    const adhocConfirmedToday = mine.adhoc
      .filter(isTruckConfirmed)
      .filter((r) => (todayAdhoc ? sameDay(parseDate(r.creationTime) ?? new Date(0), todayAdhoc) : true))
      .length;
    const dayTickets = mine.adhoc.filter((r) =>
      todayAdhoc ? sameDay(parseDate(r.creationTime) ?? new Date(0), todayAdhoc) : true,
    );
    const delayedSet = new Set(
      dayTickets
        .filter((r) => (r.ontimePlacement || "").toLowerCase().includes("delay"))
        .map((r) => r.ticketNo),
    );
    const ticketSet = new Set(dayTickets.filter((r) => r.ontimePlacement).map((r) => r.ticketNo));
    const breachPct = ticketSet.size ? Math.round((delayedSet.size / ticketSet.size) * 100) : 0;

    const dayFixed = mine.fixed.filter((r) =>
      today ? sameDay(parseDate(r.reportingTime) ?? new Date(0), today) : true,
    );
    const fixedMissingToday = dayFixed.filter(isFixedMissing).length;
    const onTimeFixed = dayFixed.filter((r) =>
      (r.status || "").toLowerCase().replace(/[\s_-]/g, "") === "ontime",
    ).length;
    const fixedOnTimePct = dayFixed.length ? Math.round((onTimeFixed / dayFixed.length) * 100) : 0;

    const now = new Date();
    const resolvedToday = resolvedList.filter((e) => {
      const d = new Date(e.resolvedAt);
      return !Number.isNaN(d.getTime()) && sameDay(d, now);
    }).length;

    return {
      adhocRequestedToday,
      adhocConfirmedToday,
      breachPct,
      fixedMissingToday,
      fixedOnTimePct,
      resolvedToday,
    };
  }, [mine, today, todayAdhoc, resolvedList]);

  // ---- New-arrival detection ----
  const seenKey = `fleet-seen:${session.dri.trim().toLowerCase()}`;
  useEffect(() => {
    const ids = new Set([
      ...adhocAlerts.map((r) => adhocAlertId(r.ticketNo)),
      ...fixedAlerts.map((r) => fixedAlertId(r.contractNumber, r.reportingTime)),
    ]);
    if (ids.size === 0) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(window.localStorage.getItem(seenKey) ?? "[]");
    } catch {
      seen = [];
    }
    const fresh = [...ids].filter((id) => !seen.includes(id));
    if (fresh.length > 0) setNewCount(fresh.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  function dismissNew() {
    const ids = [
      ...adhocAlerts.map((r) => adhocAlertId(r.ticketNo)),
      ...fixedAlerts.map((r) => fixedAlertId(r.contractNumber, r.reportingTime)),
    ];
    window.localStorage.setItem(seenKey, JSON.stringify(ids));
    setNewCount(0);
  }

  const options = useMemo(
    () => (tab === "fixed" ? uniqueFixedOptions(mine.fixed) : uniqueAdhocOptions(mine.adhoc)),
    [mine, tab],
  );

  function signOut() {
    clearSession();
    navigate({ to: "/login" });
  }

  async function refresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["fleet-data"] });
    setRefreshing(false);
  }

  function resolveAdhoc(r: AdhocRow) {
    markResolved(session.dri, {
      id: adhocAlertId(r.ticketNo),
      kind: "adhoc",
      ref: r.ticketNo,
      label: `${r.vehicle || "Ticket"} #${r.ticketNo}`,
      center: `${r.center} · ${r.city}`,
    });
    setResolvedTick((x) => x + 1);
  }

  function resolveFixed(r: FixedRow) {
    markResolved(session.dri, {
      id: fixedAlertId(r.contractNumber, r.reportingTime),
      kind: "fixed",
      ref: r.contractNumber,
      label: `${r.vehicle || "Contract"} · ${r.contractNumber}`,
      center: `${r.center} · ${r.city}`,
    });
    setResolvedTick((x) => x + 1);
  }

  function undoResolve(id: string) {
    unresolve(session.dri, id);
    setResolvedTick((x) => x + 1);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-28">
      <div className="sticky top-0 z-40 space-y-3 border-b border-border/60 bg-surface/90 px-4 pt-5 pb-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-success)] shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-success)_20%,transparent)]" />
              <span className="truncate">Logged in as: {session.dri}</span>
            </div>
            <p className="mt-1 truncate text-[11px] leading-relaxed text-muted-foreground">
              Last login {formatDateTime(session.previousLoginAt ?? session.loginAt)} · Data updated{" "}
              {formatDateTime(data.fetchedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FilterButton filters={filters} onClick={() => setFiltersOpen(true)} />
            <button
              onClick={refresh}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground active:scale-95"
              aria-label="Refresh data"
            >
              <RotateCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={signOut}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground active:scale-95"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1 text-[11px] font-semibold">
          <TabBtn active={tab === "adhoc"} onClick={() => setTab("adhoc")}>
            Adhoc alerts ({adhocAlerts.length})
          </TabBtn>
          <TabBtn active={tab === "fixed"} onClick={() => setTab("fixed")}>
            Fixed alerts ({fixedAlerts.length})
          </TabBtn>
          <TabBtn active={tab === "resolved"} onClick={() => setTab("resolved")}>
            Resolved ({resolvedList.length})
          </TabBtn>
        </div>

        {scopeLabel && (
          <button
            onClick={() => setFilters({ ...filters, dateFrom: "", dateTo: "" })}
            className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_14%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-primary)]"
          >
            Date: {scopeLabel}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mt-4 flex-1 space-y-2.5 px-4">
        {/* Today digest */}
        <DigestCard digest={digest} today={today} todayAdhoc={todayAdhoc} />

        {newCount > 0 && (
          <button
            onClick={dismissNew}
            className="flex w-full items-center gap-2 rounded-2xl border border-[color-mix(in_oklch,var(--color-info)_40%,transparent)] bg-[color-mix(in_oklch,var(--color-info)_10%,transparent)] px-3 py-2.5 text-[12px] font-semibold text-[color:var(--color-info)]"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">
              {newCount} new alert{newCount > 1 ? "s" : ""} since you last checked
            </span>
            <X className="h-3.5 w-3.5 shrink-0" />
          </button>
        )}

        {tab === "adhoc" && (
          <>
            <SectionHeading
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Adhoc tickets pending action"
              subtitle={`${scopeLabel ?? todayAdhoc?.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) ?? "Latest day"} · ${adhocAlerts.length} requested ticket${adhocAlerts.length === 1 ? "" : "s"}`}
            />

            {adhocAlerts.slice(0, 80).map((r, i) => (
              <AdhocAlertCard key={r.ticketNo} row={r} index={i} onResolve={() => resolveAdhoc(r)} />
            ))}
            {adhocAlerts.length === 0 && <EmptyState label="No open adhoc tickets. 🎉" />}
          </>
        )}
        {tab === "fixed" && (
          <>
            <SectionHeading
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Fixed pending to mark in"
              subtitle={`${scopeLabel ?? today?.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) ?? "Latest day"} · ${fixedAlerts.length} vehicle${fixedAlerts.length === 1 ? "" : "s"}`}
            />
            {outOfWindow && <CoverageNote from={data.coverageFrom!} />}
            {fixedAlerts.slice(0, 80).map((r, i) => (
              <FixedAlertCard
                key={`${r.contractNumber}-${r.attendanceDate}-${i}`}
                row={r}
                index={i}
                onResolve={() => resolveFixed(r)}
              />
            ))}
            {fixedAlerts.length === 0 && <EmptyState label="No missed fixed attendance in your AOR." />}
          </>
        )}
        {tab === "resolved" && (
          <>
            <SectionHeading
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Resolved actions"
              subtitle="Items you have marked as resolved"
            />
            {resolvedList.map((e) => (
              <ResolvedCard key={e.id} entry={e} onUndo={() => undoResolve(e.id)} />
            ))}
            {resolvedList.length === 0 && <EmptyState label="No resolved items yet." />}
          </>
        )}
      </div>

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

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className="relative rounded-full px-2 py-2 text-secondary-foreground transition-all duration-200 ease-out active:scale-95 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm"
    >
      {children}
    </button>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2.5 pt-1 pb-0.5">
      <div className="mt-0.5 text-[color:var(--color-destructive)]">{icon}</div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="animate-rise rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function DigestCard({
  digest,
  today,
  todayAdhoc,
}: {
  digest: {
    adhocRequestedToday: number;
    adhocConfirmedToday: number;
    breachPct: number;
    fixedMissingToday: number;
    fixedOnTimePct: number;
    resolvedToday: number;
  };
  today: Date | null;
  todayAdhoc: Date | null;
}) {
  const dayLabel =
    today?.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" }) ??
    todayAdhoc?.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" }) ??
    "Today";
  return (
    <div className="card-elevated rounded-2xl p-3.5">
      <div className="flex items-center justify-between">
        <span className="label-meta">Today · {dayLabel}</span>
        <span className="rounded-full bg-[color-mix(in_oklch,var(--color-success)_16%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--color-success)]">
          {digest.resolvedToday} resolved
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DigestStat
          label="Adhoc requested"
          value={digest.adhocRequestedToday}
          sub={`Confirmed ${digest.adhocConfirmedToday}`}
          tone="info"
        />
        <DigestStat
          label="Reporting breach"
          value={`${digest.breachPct}%`}
          sub="delayed today"
          tone="danger"
        />
        <DigestStat
          label="Fixed missing"
          value={digest.fixedMissingToday}
          sub="attendance pending"
          tone="warn"
        />
        <DigestStat
          label="Fixed on-time"
          value={`${digest.fixedOnTimePct}%`}
          sub="today"
          tone="success"
        />
      </div>
    </div>
  );
}

function DigestStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: "info" | "danger" | "warn" | "success";
}) {
  const colorMap: Record<typeof tone, string> = {
    info: "var(--color-info)",
    danger: "var(--color-destructive)",
    warn: "var(--color-warning)",
    success: "var(--color-success)",
  };
  const color = colorMap[tone];
  return (
    <div className="rounded-xl bg-secondary/60 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

const chip =
  "rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground transition-colors";

const resolveBtn =
  "rounded-full bg-[color:var(--color-success)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--color-success-foreground)] shadow-sm transition-all duration-200 ease-out hover:brightness-105 active:scale-95";

function SlaChip({ reportingTime }: { reportingTime: string | undefined }) {
  const minutes = timeToBreach(reportingTime);
  const tone = slaTone(minutes);
  const color = slaColor(tone);
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color,
        background: `color-mix(in oklch, ${color} 14%, transparent)`,
      }}
    >
      {slaLabel(minutes)}
    </span>
  );
}

function AdhocAlertCard({
  row,
  index,
  onResolve,
}: {
  row: AdhocRow;
  index: number;
  onResolve: () => void;
}) {
  const minutes = timeToBreach(row.reportingTime);
  const borderColor = slaColor(slaTone(minutes));
  return (
    <div
      className="card-elevated animate-rise-stagger rounded-2xl border-l-4 p-3.5"
      style={{ borderLeftColor: borderColor, ["--rise-i" as string]: index }}
    >
      <Link to="/vehicle/$id" params={{ id: row.vehicle || row.ticketNo }} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">
              #{row.ticketNo} {row.vehicle ? `· ${row.vehicle}` : ""}
            </h3>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {row.center} · {row.city}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--color-destructive)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-destructive)]">
            {row.ticketStatus.replace(/_/g, " ") || "open"}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={chip}>{row.lob || "—"}</span>
          <SlaChip reportingTime={row.reportingTime} />
          <span className={chip}>{row.vendor || "No vendor"}</span>
        </div>
      </Link>
      <div className="mt-3 flex justify-end">
        <button onClick={onResolve} className={resolveBtn}>
          Mark resolved
        </button>
      </div>
    </div>
  );
}

function FixedAlertCard({
  row,
  index,
  onResolve,
}: {
  row: FixedRow;
  index: number;
  onResolve: () => void;
}) {
  const minutes = timeToBreach(row.reportingTime);
  const borderColor = slaColor(slaTone(minutes));
  return (
    <div
      className="card-elevated animate-rise-stagger rounded-2xl border-l-4 p-3.5"
      style={{ borderLeftColor: borderColor, ["--rise-i" as string]: index }}
    >
      <Link to="/vehicle/$id" params={{ id: row.vehicle || row.contractNumber }} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">
              {row.vehicle || row.contractNumber}
            </h3>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {row.center} · {row.city}, {row.state}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--color-destructive)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-destructive)]">
            {row.attendanceStatus || "Not marked"}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={chip}>
            {row.facilityType} · {row.contractHrs}h
          </span>
          <SlaChip reportingTime={row.reportingTime} />
          <span className={chip}>{row.vendor}</span>
        </div>
      </Link>
      <div className="mt-3 flex justify-end">
        <button onClick={onResolve} className={resolveBtn}>
          Mark resolved
        </button>
      </div>
    </div>
  );
}

function ResolvedCard({ entry, onUndo }: { entry: ResolvedEntry; onUndo: () => void }) {
  return (
    <div className="card-elevated animate-rise flex items-center justify-between gap-3 rounded-2xl p-3.5">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-success)]" />
          <h3 className="truncate text-sm font-semibold tracking-tight">{entry.label}</h3>
        </div>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {entry.kind === "adhoc" ? "Adhoc" : "Fixed"} · {entry.center} ·{" "}
          {formatDateTime(entry.resolvedAt)}
        </p>
      </div>
      <button
        onClick={onUndo}
        className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
      >
        <RotateCcw className="h-3 w-3" /> Undo
      </button>
    </div>
  );
}
