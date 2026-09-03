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

/** Manual "Sync now" — runs the same job the schedule triggers. */
export const syncFleetNow = createServerFn({ method: "POST" }).handler(async () => {
  const { runFleetSync } = await import("./fleet-sync.server");
  const result = await runFleetSync();
  return { ok: true as const, syncedAt: result.syncedAt, fixedRows: result.fixedRows, adhocRows: result.adhocRows };
});
