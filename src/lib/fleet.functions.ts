import { createServerFn } from "@tanstack/react-start";

export type { FixedRow, AdhocRow, FleetPayload } from "./fleet-data.server";

export const getFleetData = createServerFn({ method: "GET" }).handler(async () => {
  const { getFleetPayloadCached } = await import("./fleet-mirror.server");
  return getFleetPayloadCached();
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

