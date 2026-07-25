import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, Phone } from "lucide-react";

import { getFleetData, type AdhocRow, type FixedRow } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { driMatches, type FleetSession } from "@/lib/session";
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

export const Route = createFileRoute("/tracking")({
  head: () => ({
    meta: [
      { title: "Tracking · Delhivery Intracity Fleet" },
      {
        name: "description",
        content:
          "Track confirmed adhoc trips and fixed contracts pending attendance in your AOR.",
      },
      { property: "og:title", content: "Tracking · Delhivery Intracity Fleet" },
      {
        property: "og:description",
        content: "Track confirmed adhoc trips and fixed contracts pending attendance in your AOR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQueryOptions()),
  component: TrackingRoute,
});

function TrackingRoute() {
  return <AuthGate>{(s) => <TrackingPage session={s} />}</AuthGate>;
}

function isTruckConfirmed(r: AdhocRow): boolean {
  const s = (r.ticketStatus || "").toLowerCase();
  return s === "truck_confirmed" || s === "truck confirmed";
}

function isFixedMissingAttendance(r: FixedRow): boolean {
  const s = (r.attendanceStatus || "").toLowerCase();
  return !s || !s.includes("marked");
}

function TrackingPage({ session }: { session: FleetSession }) {
  const { data } = useSuspenseQuery(fleetQueryOptions());
  const [tab, setTab] = useState<"adhoc" | "fixed">("adhoc");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const mineFixed = useMemo(
    () => data.fixed.filter((r) => driMatches(r.fleetDri, session.dri)),
    [data.fixed, session.dri],
  );
  const mineAdhoc = useMemo(
    () => data.adhoc.filter((r) => driMatches(r.fleetDri, session.dri)),
    [data.adhoc, session.dri],
  );

  const adhocTrips = useMemo(
    () => applyAdhocFilters(mineAdhoc, filters).filter(isTruckConfirmed),
    [mineAdhoc, filters],
  );
  const fixedPending = useMemo(
    () => applyFixedFilters(mineFixed, filters).filter(isFixedMissingAttendance),
    [mineFixed, filters],
  );

  const options = tab === "adhoc" ? uniqueAdhocOptions(mineAdhoc) : uniqueFixedOptions(mineFixed);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <div className="sticky top-0 z-40 space-y-2 bg-surface/95 px-4 pt-4 pb-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">Live Tracking</h1>
            <p className="truncate text-[11px] text-muted-foreground">{session.dri}</p>
          </div>
          <FilterButton filters={filters} onClick={() => setFiltersOpen(true)} />
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-[12px] font-semibold">
          <button
            onClick={() => setTab("adhoc")}
            data-active={tab === "adhoc"}
            className="rounded-full py-2 text-secondary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            Adhoc — confirmed ({adhocTrips.length})
          </button>
          <button
            onClick={() => setTab("fixed")}
            data-active={tab === "fixed"}
            className="rounded-full py-2 text-secondary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            Fixed — pending ({fixedPending.length})
          </button>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-2 px-4">
        {tab === "adhoc" &&
          adhocTrips.slice(0, 80).map((r) => <AdhocTripCard key={r.ticketNo} row={r} />)}
        {tab === "adhoc" && adhocTrips.length === 0 && (
          <Empty label="No trucks in ‘truck confirmed’ status right now." />
        )}
        {tab === "fixed" &&
          fixedPending
            .slice(0, 80)
            .map((r, i) => <FixedPendingCard key={`${r.contractNumber}-${i}`} row={r} />)}
        {tab === "fixed" && fixedPending.length === 0 && (
          <Empty label="All fixed contracts have attendance marked." />
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

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function AdhocTripCard({ row }: { row: AdhocRow }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{row.vehicle || `#${row.ticketNo}`}</h3>
            <span className="rounded-full bg-[color-mix(in_oklch,var(--color-info)_16%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-info)]">
              Truck confirmed
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            #{row.ticketNo} · {row.center} · {row.city}
          </p>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <div>{row.lob}</div>
          <div>{row.vehicleType}</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          Rep {row.reportingTime?.split(" ")[1] ?? "—"}
        </span>
        <span className="truncate rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {row.vendor || "No vendor"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <CallButton phone={row.driverPhone} label="Call Driver" />
        <CallButton phone={row.spPhone} label="Call Vendor" />
      </div>
    </div>
  );
}

function FixedPendingCard({ row }: { row: FixedRow }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{row.vehicle || row.contractNumber}</h3>
            <span className="rounded-full bg-[color-mix(in_oklch,var(--color-destructive)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-destructive)]">
              Attendance pending
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {row.contractNumber} · {row.center} · {row.city}, {row.state}
          </p>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <div>{row.facilityType}</div>
          <div>{row.contractHrs}h</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          Rep {row.reportingTime?.split(" ")[1] ?? "—"}
        </span>
        <span className="truncate rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {row.vendor}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Follow up with the vendor to reach the vehicle at {row.center}.
      </p>
    </div>
  );
}

function CallButton({ phone, label }: { phone: string; label: string }) {
  const clean = (phone || "").replace(/[^0-9+]/g, "");
  const disabled = !clean;
  if (disabled) {
    return (
      <span className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary py-2 text-[11px] font-semibold text-muted-foreground">
        <Phone className="h-3.5 w-3.5" /> {label}
      </span>
    );
  }
  return (
    <a
      href={`tel:${clean}`}
      className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-semibold text-primary-foreground"
    >
      <Phone className="h-3.5 w-3.5" /> {label}
    </a>
  );
}
