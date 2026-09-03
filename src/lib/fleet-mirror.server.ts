// Server-only: reads the database mirror and maps rows back to the app shapes.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { dayKey, parseDate } from "./dates";
import { getFleetPayload, type AdhocRow, type FixedRow, type FleetPayload } from "./fleet-data.server";

const STALE_MS = 15 * 60_000;
const PAGE = 1000;

async function fetchAll<T>(table: "fleet_fixed_current" | "fleet_adhoc_current"): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .is("removed_at", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} read failed: ${error.message}`);
    out.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

type FixedDb = Record<string, string | null>;
type AdhocDb = Record<string, string | null>;

const s = (v: string | null | undefined) => v ?? "";

/** Returns mirror-backed payload, or null when the mirror is empty/stale. */
export async function getMirrorPayload(): Promise<FleetPayload | null> {
  const { data: runs, error: runErr } = await supabaseAdmin
    .from("fleet_sync_runs")
    .select("finished_at, status")
    .eq("status", "ok")
    .order("finished_at", { ascending: false })
    .limit(1);
  if (runErr) throw new Error(runErr.message);

  const lastOk = runs?.[0]?.finished_at;
  if (!lastOk) return null;
  if (Date.now() - new Date(lastOk).getTime() > STALE_MS) return null;

  const [fixedDb, adhocDb] = await Promise.all([fetchAll<FixedDb>("fleet_fixed_current"), fetchAll<AdhocDb>("fleet_adhoc_current")]);
  if (fixedDb.length === 0 && adhocDb.length === 0) return null;

  const fixed: FixedRow[] = fixedDb.map((r) => ({
    contractCode: s(r["contract_code"]),
    contractNumber: s(r["contract_number"]),
    vehicle: s(r["vehicle"]),
    vendor: s(r["vendor"]),
    center: s(r["center"]),
    city: s(r["city"]),
    state: s(r["state"]),
    zone: s(r["zone"]),
    facilityType: s(r["facility_type"]),
    contractHrs: s(r["contract_hrs"]),
    contractDays: s(r["contract_days"]),
    attendanceDate: s(r["attendance_date"]),
    reportingTime: s(r["reporting_time"]),
    reportedAt: s(r["reported_at"]),
    status: s(r["status"]),
    attendanceStatus: s(r["attendance_status"]),
    startDate: s(r["start_date"]),
    fleetDri: s(r["fleet_dri"]),
  }));

  const adhoc: AdhocRow[] = adhocDb.map((r) => ({
    indentId: s(r["indent_id"]),
    ticketNo: s(r["ticket_no"]),
    lob: s(r["lob"]),
    duration: s(r["duration"]),
    vehicle: s(r["vehicle"]),
    driverPhone: s(r["driver_phone"]),
    spPhone: s(r["sp_phone"]),
    center: s(r["center"]),
    facilityType: s(r["facility_type"]),
    dr: s(r["dr"]),
    sdr: s(r["sdr"]),
    vehicleType: s(r["vehicle_type"]),
    state: s(r["state"]),
    city: s(r["city"]),
    zone: s(r["zone"]),
    creationTime: s(r["creation_time"]),
    reportingTime: s(r["reporting_time"]),
    attendanceInTime: s(r["attendance_in_time"]),
    vendor: s(r["vendor"]),
    ticketStatus: s(r["ticket_status"]),
    creationBucket: s(r["creation_bucket"]),
    reason: s(r["reason"]),
    targetPrice: s(r["target_price"]),
    bidAmount: s(r["bid_amount"]),
    bidOrigin: s(r["bid_origin"]),
    fleetDri: s(r["fleet_dri"]),
    ontimePlacement: s(r["ontime_placement"]),
  }));

  let earliest: Date | null = null;
  for (const r of fixed) {
    const d = parseDate(r.reportingTime || r.attendanceDate);
    if (d && (!earliest || d < earliest)) earliest = d;
  }

  return { fixed, adhoc, fetchedAt: lastOk, coverageFrom: earliest ? dayKey(earliest) : null };
}

/** Mirror first, live sheet as fallback. */
export async function getFleetPayloadCached(): Promise<FleetPayload> {
  try {
    const mirror = await getMirrorPayload();
    if (mirror) return mirror;
  } catch (err) {
    console.warn("mirror read failed, falling back to Sheets:", (err as Error).message);
  }
  return getFleetPayload();
}

export async function getLastSync(): Promise<{ syncedAt: string | null; status: string | null }> {
  const { data } = await supabaseAdmin
    .from("fleet_sync_runs")
    .select("finished_at, started_at, status")
    .order("started_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  return { syncedAt: row?.finished_at ?? row?.started_at ?? null, status: row?.status ?? null };
}
