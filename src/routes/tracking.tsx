import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react";

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

function cleanPhone(phone: string): string {
  return (phone || "").replace(/[^0-9+]/g, "");
}

function waLink(phone: string, message: string): string {
  const num = cleanPhone(phone).replace(/^\+/, "");
  if (!num) return "";
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
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
    () => bySlaUrgency(
      applyAdhocFilters(mineAdhoc, filters).filter(isTruckConfirmed),
      (r) => r.reportingTime,
    ),
    [mineAdhoc, filters],
  );
  const fixedPending = useMemo(
    () => bySlaUrgency(
      applyFixedFilters(mineFixed, filters).filter(isFixedMissingAttendance),
      (r) => r.reportingTime,
    ),
    [mineFixed, filters],
  );

  const options = tab === "adhoc" ? uniqueAdhocOptions(mineAdhoc) : uniqueFixedOptions(mineFixed);

  function track(action: "called_driver" | "called_vendor" | "whatsapp", ref: string, kind: "adhoc" | "fixed", label: string, center: string) {
    void logAction({ data: { dri: session.dri, ref, kind, action, label, center } }).catch(() => {});
  }

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
          adhocTrips.slice(0, 80).map((r, i) => (
            <AdhocTripCard key={r.ticketNo} row={r} index={i} onTrack={track} />
          ))}
        {tab === "adhoc" && adhocTrips.length === 0 && (
          <Empty label="No trucks in ‘truck confirmed’ status right now." />
        )}
        {tab === "fixed" &&
          fixedPending
            .slice(0, 80)
            .map((r, i) => <FixedPendingCard key={`${r.contractNumber}-${i}`} row={r} index={i} onTrack={track} />)}
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

function SlaChip({ reportingTime }: { reportingTime: string | undefined }) {
  const minutes = timeToBreach(reportingTime);
  const tone = slaTone(minutes);
  const color = slaColor(tone);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color, background: `color-mix(in oklch, ${color} 14%, transparent)` }}
    >
      {slaLabel(minutes)}
    </span>
  );
}

function AdhocTripCard({
  row,
  index,
  onTrack,
}: {
  row: AdhocRow;
  index: number;
  onTrack: (action: "called_driver" | "called_vendor" | "whatsapp", ref: string, kind: "adhoc", label: string, center: string) => void;
}) {
  const minutes = timeToBreach(row.reportingTime);
  const borderColor = slaColor(slaTone(minutes));
  const label = `${row.vehicle || `#${row.ticketNo}`}`;
  const center = `${row.center} · ${row.city}`;
  const waMsg = `Hi, regarding adhoc ticket #${row.ticketNo} (${row.vehicle || "vehicle"}) at ${row.center}. Please confirm vehicle arrival. — Delhivery Fleet`;
  return (
    <div
      className="animate-rise-stagger rounded-2xl border-l-4 bg-card p-3 shadow-sm"
      style={{ borderLeftColor: borderColor, ["--rise-i" as string]: index }}
    >
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

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          Rep {row.reportingTime?.split(" ")[1] ?? "—"}
        </span>
        <SlaChip reportingTime={row.reportingTime} />
        <span className="truncate rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {row.vendor || "No vendor"}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <CallButton phone={row.driverPhone} label="Call Driver" onClick={() => onTrack("called_driver", row.ticketNo, "adhoc", label, center)} />
        <CallButton phone={row.spPhone} label="Call Vendor" onClick={() => onTrack("called_vendor", row.ticketNo, "adhoc", label, center)} />
      </div>
      <WhatsAppButton phone={row.driverPhone || row.spPhone} message={waMsg} onClick={() => onTrack("whatsapp", row.ticketNo, "adhoc", label, center)} />
    </div>
  );
}

function FixedPendingCard({
  row,
  index,
  onTrack,
}: {
  row: FixedRow;
  index: number;
  onTrack: (action: "called_driver" | "called_vendor" | "whatsapp", ref: string, kind: "fixed", label: string, center: string) => void;
}) {
  const minutes = timeToBreach(row.reportingTime);
  const borderColor = slaColor(slaTone(minutes));
  const label = `${row.vehicle || row.contractNumber}`;
  const center = `${row.center} · ${row.city}`;
  const waMsg = `Hi, regarding fixed contract ${row.contractNumber} (${row.vehicle || "vehicle"}) at ${row.center}. Vehicle attendance is pending — please reach the facility. — Delhivery Fleet`;
  return (
    <div
      className="animate-rise-stagger rounded-2xl border-l-4 bg-card p-3 shadow-sm"
      style={{ borderLeftColor: borderColor, ["--rise-i" as string]: index }}
    >
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
        <SlaChip reportingTime={row.reportingTime} />
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

function CallButton({
  phone,
  label,
  onClick,
}: {
  phone: string;
  label: string;
  onClick: () => void;
}) {
  const clean = cleanPhone(phone);
  if (!clean) {
    return (
      <span className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary py-2 text-[11px] font-semibold text-muted-foreground">
        <Phone className="h-3.5 w-3.5" /> {label}
      </span>
    );
  }
  return (
    <a
      href={`tel:${clean}`}
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[11px] font-semibold text-primary-foreground active:scale-95"
    >
      <Phone className="h-3.5 w-3.5" /> {label}
    </a>
  );
}

function WhatsAppButton({
  phone,
  message,
  onClick,
}: {
  phone: string;
  message: string;
  onClick: () => void;
}) {
  const href = waLink(phone, message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_oklch,var(--color-success)_40%,transparent)] py-1.5 text-[11px] font-semibold text-[color:var(--color-success)] active:scale-95"
    >
      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp follow-up
    </a>
  );
}
