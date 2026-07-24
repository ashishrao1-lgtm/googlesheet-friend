import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, MapPin } from "lucide-react";
import { getFleetData } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";
import { StatusPill, toneForStatus } from "@/components/StatusPill";

function fleetQueryOptions(fetchFn: () => Promise<Awaited<ReturnType<typeof getFleetData>>>) {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/tracking")({
  head: () => ({
    meta: [
      { title: "Tracking · Fleet Executive" },
      { name: "description", content: "Live tracking view of active fleet vehicles and trips." },
      { property: "og:title", content: "Tracking · Fleet Executive" },
      {
        property: "og:description",
        content: "Live tracking view of active fleet vehicles and trips.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQueryOptions(getFleetData)),
  component: TrackingPage,
});

function TrackingPage() {
  const fetchFleet = useServerFn(getFleetData);
  const { data } = useSuspenseQuery(fleetQueryOptions(fetchFleet));
  const active = data.adhoc
    .filter((r) => r.ticketStatus !== "cancelled" && r.vehicle)
    .slice(0, 40);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-surface/95 px-4 pt-4 pb-3 backdrop-blur">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-base font-semibold">Live Tracking</h1>
      </div>

      <div className="px-4">
        <div className="relative h-48 overflow-hidden rounded-2xl bg-card shadow-sm">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, oklch(0.9 0.05 200) 0, transparent 40%), radial-gradient(circle at 80% 60%, oklch(0.88 0.06 150) 0, transparent 45%), linear-gradient(180deg, oklch(0.97 0.01 220), oklch(0.94 0.02 220))",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <MapPin className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {active.length} active trips
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2 px-4">
        {active.map((r) => (
          <div key={r.ticketNo} className="rounded-2xl bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{r.vehicle}</h3>
                  <StatusPill tone={toneForStatus(r.ticketStatus)}>
                    {r.ticketStatus.replace(/_/g, " ")}
                  </StatusPill>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {r.center} · {r.city}
                </p>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div>{r.lob}</div>
                <div>{r.vehicleType}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
