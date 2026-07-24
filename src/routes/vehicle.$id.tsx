import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { ChevronLeft, MapPin, Phone, Clock, Building2 } from "lucide-react";
import { getFleetData } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";
import { StatusPill, toneForStatus } from "@/components/StatusPill";

function fleetQueryOptions(fetchFn: typeof getFleetData) {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/vehicle/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Vehicle ${params.id} · Fleet Executive` },
      {
        name: "description",
        content: `Attendance and ad-hoc trip history for vehicle ${params.id}.`,
      },
      { property: "og:title", content: `Vehicle ${params.id} · Fleet Executive` },
      {
        property: "og:description",
        content: `Attendance and ad-hoc trip history for vehicle ${params.id}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQueryOptions(getFleetData)),
  component: VehicleDetail,
});

function VehicleDetail() {
  const { id } = Route.useParams();
  
  const { data } = useSuspenseQuery(fleetQueryOptions(getFleetData));

  const fixedHistory = data.fixed.filter((r) => r.vehicle === id);
  const adhocHistory = data.adhoc.filter((r) => r.vehicle === id || r.ticketNo === id);
  const primary = fixedHistory[0] ?? {
    vehicle: id,
    vendor: adhocHistory[0]?.vendor ?? "",
    center: adhocHistory[0]?.center ?? "",
    city: adhocHistory[0]?.city ?? "",
    state: adhocHistory[0]?.state ?? "",
    zone: adhocHistory[0]?.zone ?? "",
    fleetDri: adhocHistory[0]?.fleetDri ?? "",
    facilityType: adhocHistory[0]?.facilityType ?? "",
    contractHrs: "",
  };

  const onTime = fixedHistory.filter((r) => r.status === "On-time").length;
  const delays = fixedHistory.filter((r) => r.status === "Delay").length;
  const compliance =
    fixedHistory.length === 0 ? 0 : Math.round((onTime / fixedHistory.length) * 100);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-surface/95 px-4 pt-4 pb-3 backdrop-blur">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{primary.vehicle || id}</h1>
          <p className="truncate text-xs text-muted-foreground">{primary.vendor || "—"}</p>
        </div>
      </div>

      <section className="px-4">
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                On-time compliance
              </p>
              <p className="mt-1 text-3xl font-bold text-[color:var(--color-success)]">
                {compliance}%
              </p>
            </div>
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Phone className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full"
              style={{ width: `${compliance}%`, background: "var(--color-success)" }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{fixedHistory.length}</div>
              <div className="text-[11px] text-muted-foreground">Attendance</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[color:var(--color-success)]">{onTime}</div>
              <div className="text-[11px] text-muted-foreground">On-time</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[oklch(0.55_0.16_65)]">{delays}</div>
              <div className="text-[11px] text-muted-foreground">Delay</div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <InfoTile icon={<Building2 className="h-4 w-4" />} label="Center" value={primary.center} />
          <InfoTile
            icon={<MapPin className="h-4 w-4" />}
            label="Zone"
            value={`${primary.zone} · ${primary.city}`}
          />
          <InfoTile
            icon={<Clock className="h-4 w-4" />}
            label="Contract"
            value={primary.contractHrs ? `${primary.contractHrs} hrs` : primary.facilityType}
          />
          <InfoTile
            icon={<Phone className="h-4 w-4" />}
            label="Fleet DRI"
            value={primary.fleetDri || "—"}
          />
        </div>
      </section>

      <section className="mt-4 px-4">
        <h2 className="mb-2 text-sm font-semibold">Recent attendance</h2>
        <div className="space-y-2">
          {fixedHistory.slice(0, 12).map((r, i) => (
            <div
              key={`${r.attendanceDate}-${i}`}
              className="flex items-center justify-between rounded-xl bg-card p-3 shadow-sm"
            >
              <div>
                <div className="text-sm font-medium">{r.attendanceDate?.split(" ")[0]}</div>
                <div className="text-[11px] text-muted-foreground">
                  Reported {r.reportedAt?.split(" ")[1] ?? "—"} · Sched{" "}
                  {r.reportingTime?.split(" ")[1] ?? "—"}
                </div>
              </div>
              <StatusPill tone={toneForStatus(r.status)}>{r.status || "N/A"}</StatusPill>
            </div>
          ))}
          {fixedHistory.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No fixed attendance history for this vehicle.
            </div>
          )}
        </div>
      </section>

      {adhocHistory.length > 0 && (
        <section className="mt-4 px-4">
          <h2 className="mb-2 text-sm font-semibold">Ad-hoc tickets</h2>
          <div className="space-y-2">
            {adhocHistory.slice(0, 10).map((r) => (
              <div
                key={r.ticketNo}
                className="flex items-center justify-between rounded-xl bg-card p-3 shadow-sm"
              >
                <div>
                  <div className="text-sm font-medium">#{r.ticketNo}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.lob} · {r.creationTime?.split(" ")[0]}
                  </div>
                </div>
                <StatusPill tone={toneForStatus(r.ticketStatus)}>
                  {r.ticketStatus.replace(/_/g, " ")}
                </StatusPill>
              </div>
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value || "—"}</div>
    </div>
  );
}
