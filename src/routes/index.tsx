import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { useMemo, useState } from "react";
import { Bell, ChevronDown, Phone, Search, Truck } from "lucide-react";
import { getFleetData, type AdhocRow, type FixedRow } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";
import { StatusPill, toneForStatus } from "@/components/StatusPill";

function fleetQueryOptions(fetchFn: typeof getFleetData) {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fleet Executive · Live Fleet Compliance" },
      {
        name: "description",
        content:
          "Fleet Executive mobile dashboard to monitor vehicle attendance, on-time performance, and ad-hoc trip compliance in real time.",
      },
      { property: "og:title", content: "Fleet Executive · Live Fleet Compliance" },
      {
        property: "og:description",
        content:
          "Monitor vehicle attendance, on-time performance and ad-hoc trip compliance on the go.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    // Prime cache using the client-safe server fn caller
    return context.queryClient.ensureQueryData(fleetQueryOptions(getFleetData));
  },
  component: DashboardPage,
});

function DashboardPage() {
  
  const { data } = useSuspenseQuery(fleetQueryOptions(getFleetData));
  const [tab, setTab] = useState<"fixed" | "adhoc">("fixed");
  const [query, setQuery] = useState("");

  const dris = useMemo(() => {
    const all = new Set<string>();
    data.fixed.forEach((r) => r.fleetDri && all.add(r.fleetDri));
    data.adhoc.forEach((r) => r.fleetDri && all.add(r.fleetDri));
    return ["All Executives", ...Array.from(all).sort()];
  }, [data]);
  const [dri, setDri] = useState<string>("All Executives");

  const scopedFixed = useMemo(
    () =>
      data.fixed.filter(
        (r) =>
          (dri === "All Executives" || r.fleetDri === dri) &&
          (query === "" ||
            r.vehicle.toLowerCase().includes(query.toLowerCase()) ||
            r.center.toLowerCase().includes(query.toLowerCase()) ||
            r.city.toLowerCase().includes(query.toLowerCase())),
      ),
    [data.fixed, dri, query],
  );

  const scopedAdhoc = useMemo(
    () =>
      data.adhoc.filter(
        (r) =>
          (dri === "All Executives" || r.fleetDri === dri) &&
          (query === "" ||
            r.vehicle.toLowerCase().includes(query.toLowerCase()) ||
            r.ticketNo.toLowerCase().includes(query.toLowerCase()) ||
            r.center.toLowerCase().includes(query.toLowerCase())),
      ),
    [data.adhoc, dri, query],
  );

  const kpi = useMemo(() => {
    const f = scopedFixed;
    const onTime = f.filter((r) => r.status === "On-time").length;
    const delay = f.filter((r) => r.status === "Delay").length;
    const missed = f.filter((r) => r.attendanceStatus !== "Attendance Marked").length;
    const a = scopedAdhoc;
    const completed = a.filter((r) => r.ticketStatus === "trip_completed").length;
    const cancelled = a.filter((r) => r.ticketStatus === "cancelled").length;
    return {
      fixedTotal: f.length,
      onTime,
      delay,
      missed,
      adhocTotal: a.length,
      completed,
      cancelled,
    };
  }, [scopedFixed, scopedAdhoc]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <Header driList={dris} dri={dri} setDri={setDri} />

      <div className="px-4">
        <div className="mt-2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vehicle, ticket, or center"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="px-4">
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-sm font-medium">
          <button
            onClick={() => setTab("fixed")}
            data-active={tab === "fixed"}
            className="rounded-full py-2 text-secondary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            Fixed ({kpi.fixedTotal})
          </button>
          <button
            onClick={() => setTab("adhoc")}
            data-active={tab === "adhoc"}
            className="rounded-full py-2 text-secondary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            Ad-hoc ({kpi.adhocTotal})
          </button>
        </div>
      </div>

      <KpiStrip tab={tab} kpi={kpi} />

      <div className="mt-3 flex-1 space-y-3 px-4">
        {tab === "fixed"
          ? scopedFixed.slice(0, 60).map((r, i) => <FixedCard key={`${r.vehicle}-${i}`} row={r} />)
          : scopedAdhoc.slice(0, 60).map((r, i) => <AdhocCard key={`${r.ticketNo}-${i}`} row={r} />)}
        {(tab === "fixed" ? scopedFixed.length : scopedAdhoc.length) === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No records match this filter.
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function Header({
  driList,
  dri,
  setDri,
}: {
  driList: string[];
  dri: string;
  setDri: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 bg-surface/95 px-4 pt-4 pb-2 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-success)]" />
            <span className="max-w-[180px] truncate">{dri}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {open && (
            <div className="absolute left-0 top-8 z-50 max-h-64 w-64 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
              {driList.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDri(d);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="relative flex h-9 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground">
          <Truck className="h-4 w-4" /> Fleet
          <Bell className="ml-1 h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--color-destructive)] px-1 text-[10px] text-primary-foreground">
            4
          </span>
        </button>
      </div>
    </div>
  );
}

function KpiStrip({
  tab,
  kpi,
}: {
  tab: "fixed" | "adhoc";
  kpi: {
    fixedTotal: number;
    onTime: number;
    delay: number;
    missed: number;
    adhocTotal: number;
    completed: number;
    cancelled: number;
  };
}) {
  const items =
    tab === "fixed"
      ? [
          { label: "Vehicles", value: kpi.fixedTotal, tone: "info" as const },
          { label: "On-time", value: kpi.onTime, tone: "success" as const },
          { label: "Delay", value: kpi.delay, tone: "warning" as const },
          { label: "Missed", value: kpi.missed, tone: "danger" as const },
        ]
      : [
          { label: "Tickets", value: kpi.adhocTotal, tone: "info" as const },
          { label: "Completed", value: kpi.completed, tone: "success" as const },
          { label: "Cancelled", value: kpi.cancelled, tone: "danger" as const },
          { label: "Others", value: kpi.adhocTotal - kpi.completed - kpi.cancelled, tone: "warning" as const },
        ];
  const toneColor: Record<string, string> = {
    success: "var(--color-success)",
    warning: "oklch(0.55 0.16 65)",
    danger: "var(--color-destructive)",
    info: "var(--color-info)",
  };
  return (
    <div className="mt-3 px-4">
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-card p-3 shadow-sm">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <div className="text-lg font-bold" style={{ color: toneColor[it.tone] }}>
              {it.value}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceBar({ onTime, total }: { onTime: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((onTime / total) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: "var(--color-success)",
        }}
      />
    </div>
  );
}

function FixedCard({ row }: { row: FixedRow }) {
  const tone = toneForStatus(row.status);
  return (
    <Link
      to="/vehicle/$id"
      params={{ id: row.vehicle || "unknown" }}
      className="block rounded-2xl border-l-4 bg-card p-4 shadow-sm"
      style={{
        borderLeftColor:
          tone === "success"
            ? "var(--color-success)"
            : tone === "warning"
              ? "oklch(0.72 0.16 75)"
              : tone === "danger"
                ? "var(--color-destructive)"
                : "var(--color-border)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold">{row.vehicle || "—"}</h3>
            <StatusPill tone={tone}>{row.status || "N/A"}</StatusPill>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.center} · {row.city}, {row.state}
          </p>
        </div>
        <button
          onClick={(e) => e.preventDefault()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Call vendor"
        >
          <Phone className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <ComplianceBar onTime={row.status === "On-time" ? 1 : 0} total={1} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {row.zone || "—"}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {row.facilityType} · {row.contractHrs}h
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          Rep {row.reportingTime?.split(" ")[1] ?? "—"}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{row.vendor}</span>
        <span>DRI: {row.fleetDri || "—"}</span>
      </div>
    </Link>
  );
}

function AdhocCard({ row }: { row: AdhocRow }) {
  const tone = toneForStatus(row.ticketStatus);
  const placementTone = toneForStatus(row.ontimePlacement);
  return (
    <Link
      to="/vehicle/$id"
      params={{ id: row.vehicle || row.ticketNo }}
      className="block rounded-2xl border-l-4 bg-card p-4 shadow-sm"
      style={{
        borderLeftColor:
          tone === "success"
            ? "var(--color-success)"
            : tone === "danger"
              ? "var(--color-destructive)"
              : "oklch(0.72 0.16 75)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold">
              {row.vehicle || `Ticket #${row.ticketNo}`}
            </h3>
            <StatusPill tone={tone}>{row.ticketStatus.replace(/_/g, " ")}</StatusPill>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.center} · {row.city}, {row.state}
          </p>
        </div>
        <button
          onClick={(e) => e.preventDefault()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Call driver"
        >
          <Phone className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {row.lob}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {row.vehicleType}
        </span>
        {row.ontimePlacement && (
          <StatusPill tone={placementTone}>{row.ontimePlacement}</StatusPill>
        )}
        {row.bidAmount && (
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
            ₹{row.bidAmount}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{row.vendor || "No vendor"}</span>
        <span>DRI: {row.fleetDri || "—"}</span>
      </div>
    </Link>
  );
}
