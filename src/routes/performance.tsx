import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { getFleetData } from "@/lib/fleet.functions";
import { BottomNav } from "@/components/BottomNav";

function fleetQueryOptions(fetchFn: typeof getFleetData) {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance · Fleet Executive" },
      {
        name: "description",
        content: "Zone-wise and vendor-wise fleet compliance performance analytics.",
      },
      { property: "og:title", content: "Performance · Fleet Executive" },
      {
        property: "og:description",
        content: "Zone-wise and vendor-wise fleet compliance performance analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQueryOptions(getFleetData)),
  component: PerformancePage,
});

function PerformancePage() {
  
  const { data } = useSuspenseQuery(fleetQueryOptions(getFleetData));

  const zoneStats = useMemo(() => {
    const map = new Map<string, { total: number; onTime: number }>();
    for (const r of data.fixed) {
      const z = r.zone || "Unknown";
      const cur = map.get(z) ?? { total: 0, onTime: 0 };
      cur.total += 1;
      if (r.status === "On-time") cur.onTime += 1;
      map.set(z, cur);
    }
    return Array.from(map.entries())
      .map(([zone, v]) => ({ zone, ...v, pct: Math.round((v.onTime / v.total) * 100) }))
      .sort((a, b) => b.total - a.total);
  }, [data.fixed]);

  const vendorStats = useMemo(() => {
    const map = new Map<string, { total: number; onTime: number }>();
    for (const r of data.fixed) {
      if (!r.vendor) continue;
      const cur = map.get(r.vendor) ?? { total: 0, onTime: 0 };
      cur.total += 1;
      if (r.status === "On-time") cur.onTime += 1;
      map.set(r.vendor, cur);
    }
    return Array.from(map.entries())
      .map(([vendor, v]) => ({ vendor, ...v, pct: Math.round((v.onTime / v.total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [data.fixed]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-surface/95 px-4 pt-4 pb-3 backdrop-blur">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-base font-semibold">Performance</h1>
      </div>

      <section className="px-4">
        <h2 className="mb-2 text-sm font-semibold">Zone-wise compliance</h2>
        <div className="space-y-2">
          {zoneStats.map((z) => (
            <div key={z.zone} className="rounded-2xl bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{z.zone}</span>
                <span className="text-[color:var(--color-success)]">{z.pct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full"
                  style={{ width: `${z.pct}%`, background: "var(--color-success)" }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                {z.onTime}/{z.total} on-time
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 px-4">
        <h2 className="mb-2 text-sm font-semibold">Top vendors</h2>
        <div className="space-y-2">
          {vendorStats.map((v) => (
            <div key={v.vendor} className="rounded-2xl bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{v.vendor}</span>
                <span className="shrink-0 text-[color:var(--color-success)]">{v.pct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full"
                  style={{ width: `${v.pct}%`, background: "var(--color-success)" }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                {v.onTime}/{v.total} on-time
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
