import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getFleetPayload } from "./fleet-data.server";

export type { FixedRow, AdhocRow, FleetPayload } from "./fleet-data.server";

const driSchema = z.object({
  dri: z.string().trim().min(1).max(120),
});

const isOnTime = (v: string) =>
  (v || "").trim().toLowerCase().replace(/[\s_-]/g, "") === "ontime";

/** Team-wide aggregates for the Performance scorecard (computed once server-side). */
export type TeamAggregates = {
  fixedOnTimePct: number;
  adhocBreachPct: number;
};

export type ScopedFleetData = {
  fixed: Awaited<ReturnType<typeof getFleetPayload>>["fixed"];
  adhoc: Awaited<ReturnType<typeof getFleetPayload>>["adhoc"];
  fetchedAt: string;
  coverageFrom: string | null;
  team: TeamAggregates;
};

/**
 * Returns ONLY the signed-in DRI's rows (server-side filtering) plus small
 * team aggregates. This keeps the payload a few hundred rows instead of the
 * full ~54k-row dataset, which is the main page-load speed fix.
 */
export const getFleetData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => driSchema.parse(input))
  .handler(async ({ data }): Promise<ScopedFleetData> => {
    const payload = await getFleetPayload();
    const target = data.dri.trim().toLowerCase();

    const fixed = payload.fixed.filter(
      (r) => (r.fleetDri || "").trim().toLowerCase() === target,
    );
    const adhoc = payload.adhoc.filter(
      (r) => (r.fleetDri || "").trim().toLowerCase() === target,
    );

    const teamFixedTotal = payload.fixed.length;
    const teamFixedOnTime = payload.fixed.filter((r) => isOnTime(r.status)).length;
    const teamFixedOnTimePct = teamFixedTotal
      ? Math.round((teamFixedOnTime / teamFixedTotal) * 100)
      : 0;

    const ticketSet = new Set<string>();
    const delayedSet = new Set<string>();
    for (const r of payload.adhoc) {
      const p = (r.ontimePlacement || "").trim().toLowerCase();
      if (!p || !r.ticketNo) continue;
      ticketSet.add(r.ticketNo);
      if (p.includes("delay")) delayedSet.add(r.ticketNo);
    }
    const teamBreachPct = ticketSet.size
      ? Math.round((delayedSet.size / ticketSet.size) * 100)
      : 0;

    return {
      fixed,
      adhoc,
      fetchedAt: payload.fetchedAt,
      coverageFrom: payload.coverageFrom,
      team: { fixedOnTimePct: teamFixedOnTimePct, adhocBreachPct: teamBreachPct },
    };
  });

/** Last server-side sync of the sheet mirror. */
export const getSyncStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getLastSync } = await import("./fleet-mirror.server");
  return getLastSync();
});

/** Manual "Sync now" — same job the schedule triggers, throttled to once a minute. */
export const syncFleetNow = createServerFn({ method: "POST" }).handler(async () => {
  const { getLastSync } = await import("./fleet-mirror.server");
  const last = await getLastSync();
  if (last.syncedAt && Date.now() - new Date(last.syncedAt).getTime() < 60_000) {
    return { ok: true as const, syncedAt: last.syncedAt, skipped: true as const };
  }
  const { runFleetSync } = await import("./fleet-sync.server");
  const result = await runFleetSync();
  return { ok: true as const, syncedAt: result.syncedAt, skipped: false as const };
});
