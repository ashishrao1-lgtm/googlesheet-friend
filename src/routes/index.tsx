import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, LogOut, RotateCcw } from "lucide-react";

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

function fleetQueryOptions() {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => getFleetData(),
    staleTime: 5 * 60_000,
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

function DashboardRoute() {
  return <AuthGate>{(session) => <DashboardPage session={session} />}</AuthGate>;
}

import { parseDate, sameDay } from "@/lib/dates";

const OPEN_ADHOC_STATUSES = new Set(["requested", "open", "pending"]);

function isFixedMissing(r: FixedRow): boolean {
  const s = (r.attendanceStatus || "").toLowerCase();
  // Vehicle still pending to mark in → attendance_status = "Attendance Missing" (or blank)
  return !s || s.includes("missing") || s.includes("not marked") || s.includes("pending");
}

function isAdhocOpen(r: AdhocRow): boolean {
  const s = (r.ticketStatus || "").toLowerCase().trim();
  return s === "requested" || s.includes("request") || s === "open" || s === "pending";
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
  const { data } = useSuspenseQuery(fleetQueryOptions());
  const [tab, setTab] = useState<"adhoc" | "fixed" | "resolved">("adhoc");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resolvedTick, setResolvedTick] = useState(0);

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
    return filteredAdhoc
      .filter(isAdhocOpen)
      .filter((r) => {
        if (dateActive) return true;
        if (!todayAdhoc) return true;
        const d = parseDate(r.creationTime);
        return !!d && sameDay(d, todayAdhoc);
      })
      .filter((r) => !resolved.has(adhocAlertId(r.ticketNo)));
  }, [filteredAdhoc, resolved, todayAdhoc, filters.dateFrom, filters.dateTo]);

  // Show only rows whose reportingTime falls on the "current data date" —
  // i.e. vehicles that are yet to report today.
  const fixedAlerts = useMemo(() => {
    const dateActive = !!(filters.dateFrom || filters.dateTo);
    return filteredFixed
      .filter(isFixedMissing)
      .filter((r) => {
        if (dateActive) return true; // user chose an explicit range
        if (!today) return true;
        const d = parseDate(r.reportingTime);
        return !!d && sameDay(d, today);
      })
      .filter((r) => !resolved.has(fixedAlertId(r.contractNumber, r.attendanceDate)));
  }, [filteredFixed, resolved, today, filters.dateFrom, filters.dateTo]);



  const resolvedList = useMemo(() => {
    void resolvedTick;
    return getResolutions(session.dri);
  }, [session.dri, resolvedTick]);

  const options = useMemo(
    () => (tab === "fixed" ? uniqueFixedOptions(mine.fixed) : uniqueAdhocOptions(mine.adhoc)),
    [mine, tab],
  );

  function signOut() {
    clearSession();
    navigate({ to: "/login" });
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
      id: fixedAlertId(r.contractNumber, r.attendanceDate),
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
      </div>

      <div className="mt-4 flex-1 space-y-2.5 px-4">

        {tab === "adhoc" && (
          <>
            <SectionHeading
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Adhoc tickets pending action"
              subtitle={
                todayAdhoc
                  ? `Requested tickets today · ${todayAdhoc.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`
                  : "Requested tickets — awaiting confirmation & placement"
              }
            />

            {adhocAlerts.slice(0, 80).map((r) => (
              <AdhocAlertCard key={r.ticketNo} row={r} onResolve={() => resolveAdhoc(r)} />
            ))}
            {adhocAlerts.length === 0 && <EmptyState label="No open adhoc tickets. 🎉" />}
          </>
        )}
        {tab === "fixed" && (
          <>
            <SectionHeading
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Fixed contracts pending attendance"
              subtitle={
                today
                  ? `Vehicles yet to mark in today · ${today.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`
                  : "Vehicles yet to be marked in at the facility"
              }
            />
            {fixedAlerts.slice(0, 80).map((r, i) => (
              <FixedAlertCard
                key={`${r.contractNumber}-${r.attendanceDate}-${i}`}
                row={r}
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
      className="rounded-full px-2 py-2 text-secondary-foreground transition-all duration-200 ease-out active:scale-95 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm"
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

const chip =
  "rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground transition-colors";

const resolveBtn =
  "rounded-full bg-[color:var(--color-success)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--color-success-foreground)] shadow-sm transition-all duration-200 ease-out hover:brightness-105 active:scale-95";

function AdhocAlertCard({ row, onResolve }: { row: AdhocRow; onResolve: () => void }) {
  return (
    <div
      className="card-elevated animate-rise rounded-2xl border-l-4 p-3.5"
      style={{ borderLeftColor: "var(--color-destructive)" }}
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
          <span className={chip}>Rep {row.reportingTime?.split(" ")[1] ?? "—"}</span>
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

function FixedAlertCard({ row, onResolve }: { row: FixedRow; onResolve: () => void }) {
  return (
    <div
      className="card-elevated animate-rise rounded-2xl border-l-4 p-3.5"
      style={{ borderLeftColor: "var(--color-warning)" }}
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
          <span className={chip}>Rep {row.reportingTime?.split(" ")[1] ?? "—"}</span>
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

