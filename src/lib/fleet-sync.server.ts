// Server-only: pulls the Google Sheet and mirrors it into the database.
// Called by the scheduled sync endpoint (and the manual "Sync now" action).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getFleetPayload, type AdhocRow, type FixedRow } from "./fleet-data.server";

export function fixedKey(r: FixedRow): string {
  return [r.contractNumber, r.vehicle, r.reportingTime].join("|");
}

export function adhocKey(r: AdhocRow): string {
  return r.ticketNo || r.indentId;
}

type FixedMirror = {
  row_key: string;
  contract_code: string;
  contract_number: string;
  vehicle: string;
  vendor: string;
  center: string;
  city: string;
  state: string;
  zone: string;
  facility_type: string;
  contract_hrs: string;
  contract_days: string;
  attendance_date: string;
  reporting_time: string;
  reported_at: string;
  status: string;
  attendance_status: string;
  start_date: string;
  fleet_dri: string;
  synced_at: string;
  removed_at: string | null;
};

type AdhocMirror = {
  row_key: string;
  indent_id: string;
  ticket_no: string;
  lob: string;
  duration: string;
  vehicle: string;
  driver_phone: string;
  sp_phone: string;
  center: string;
  facility_type: string;
  dr: string;
  sdr: string;
  vehicle_type: string;
  state: string;
  city: string;
  zone: string;
  creation_time: string;
  reporting_time: string;
  attendance_in_time: string;
  vendor: string;
  ticket_status: string;
  creation_bucket: string;
  reason: string;
  target_price: string;
  bid_amount: string;
  bid_origin: string;
  fleet_dri: string;
  ontime_placement: string;
  synced_at: string;
  removed_at: string | null;
};

function toFixedMirror(r: FixedRow, syncedAt: string): FixedMirror {
  return {
    row_key: fixedKey(r),
    contract_code: r.contractCode,
    contract_number: r.contractNumber,
    vehicle: r.vehicle,
    vendor: r.vendor,
    center: r.center,
    city: r.city,
    state: r.state,
    zone: r.zone,
    facility_type: r.facilityType,
    contract_hrs: r.contractHrs,
    contract_days: r.contractDays,
    attendance_date: r.attendanceDate,
    reporting_time: r.reportingTime,
    reported_at: r.reportedAt,
    status: r.status,
    attendance_status: r.attendanceStatus,
    start_date: r.startDate,
    fleet_dri: r.fleetDri,
    synced_at: syncedAt,
    removed_at: null,
  };
}

function toAdhocMirror(r: AdhocRow, syncedAt: string): AdhocMirror {
  return {
    row_key: adhocKey(r),
    indent_id: r.indentId,
    ticket_no: r.ticketNo,
    lob: r.lob,
    duration: r.duration,
    vehicle: r.vehicle,
    driver_phone: r.driverPhone,
    sp_phone: r.spPhone,
    center: r.center,
    facility_type: r.facilityType,
    dr: r.dr,
    sdr: r.sdr,
    vehicle_type: r.vehicleType,
    state: r.state,
    city: r.city,
    zone: r.zone,
    creation_time: r.creationTime,
    reporting_time: r.reportingTime,
    attendance_in_time: r.attendanceInTime,
    vendor: r.vendor,
    ticket_status: r.ticketStatus,
    creation_bucket: r.creationBucket,
    reason: r.reason,
    target_price: r.targetPrice,
    bid_amount: r.bidAmount,
    bid_origin: r.bidOrigin,
    fleet_dri: r.fleetDri,
    ontime_placement: r.ontimePlacement,
    synced_at: syncedAt,
    removed_at: null,
  };
}

const CHUNK = 500;

async function upsertChunks<T extends { row_key: string }>(table: "fleet_fixed_current" | "fleet_adhoc_current", rows: T[]) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabaseAdmin
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(slice as any, { onConflict: "row_key" });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

async function insertSnapshots(
  rows: { synced_at: string; kind: string; ref: string; status: string; attendance_status: string; reported_at: string; reporting_time: string; dri: string; center: string; vendor: string }[],
) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabaseAdmin.from("fleet_snapshots").insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`fleet_snapshots insert failed: ${error.message}`);
  }
}

export type SyncResult = { fixedRows: number; adhocRows: number; fixedChanged: number; adhocChanged: number; syncedAt: string };

/** Pulls the sheet and mirrors only changed rows; appends history for changes. */
export async function runFleetSync(): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const { data: run } = await supabaseAdmin
    .from("fleet_sync_runs")
    .insert({ started_at: startedAt, status: "running" })
    .select("id")
    .single();

  try {
    const payload = await getFleetPayload();
    const syncedAt = new Date().toISOString();

    // Existing state, for change detection (keeps writes small).
    const [{ data: exFixed, error: efErr }, { data: exAdhoc, error: eaErr }] = await Promise.all([
      supabaseAdmin.from("fleet_fixed_current").select("row_key, status, attendance_status, reported_at"),
      supabaseAdmin.from("fleet_adhoc_current").select("row_key, ticket_status, attendance_in_time, ontime_placement"),
    ]);
    if (efErr) throw new Error(efErr.message);
    if (eaErr) throw new Error(eaErr.message);

    const fixedState = new Map((exFixed ?? []).map((r) => [r.row_key, `${r.status}|${r.attendance_status}|${r.reported_at}`]));
    const adhocState = new Map(
      (exAdhoc ?? []).map((r) => [r.row_key, `${r.ticket_status}|${r.attendance_in_time}|${r.ontime_placement}`]),
    );

    // Dedupe by row_key: the sheet can repeat a natural key; last one wins.
    const fixedMap = new Map<string, FixedMirror>();
    const seenFixed = new Set<string>();
    for (const r of payload.fixed) {
      const key = fixedKey(r);
      if (!key.replace(/\|/g, "")) continue;
      seenFixed.add(key);
      const sig = `${r.status}|${r.attendanceStatus}|${r.reportedAt}`;
      if (fixedState.get(key) !== sig) fixedMap.set(key, toFixedMirror(r, syncedAt));
    }

    const adhocMap = new Map<string, AdhocMirror>();
    const seenAdhoc = new Set<string>();
    for (const r of payload.adhoc) {
      const key = adhocKey(r);
      if (!key) continue;
      seenAdhoc.add(key);
      const sig = `${r.ticketStatus}|${r.attendanceInTime}|${r.ontimePlacement}`;
      if (adhocState.get(key) !== sig) adhocMap.set(key, toAdhocMirror(r, syncedAt));
    }

    const fixedChanged = [...fixedMap.values()];
    const adhocChanged = [...adhocMap.values()];

    await upsertChunks("fleet_fixed_current", fixedChanged);
    await upsertChunks("fleet_adhoc_current", adhocChanged);


    await insertSnapshots([
      ...fixedChanged.map((r) => ({
        synced_at: syncedAt,
        kind: "fixed",
        ref: r.row_key,
        status: r.status,
        attendance_status: r.attendance_status,
        reported_at: r.reported_at,
        reporting_time: r.reporting_time,
        dri: r.fleet_dri,
        center: r.center,
        vendor: r.vendor,
      })),
      ...adhocChanged.map((r) => ({
        synced_at: syncedAt,
        kind: "adhoc",
        ref: r.row_key,
        status: r.ticket_status,
        attendance_status: r.ontime_placement,
        reported_at: r.attendance_in_time,
        reporting_time: r.reporting_time,
        dri: r.fleet_dri,
        center: r.center,
        vendor: r.vendor,
      })),
    ]);

    if (!run?.id) throw new Error("Could not create sync run record");
    const { error: finishError } = await supabaseAdmin
      .from("fleet_sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "ok",
        fixed_rows: seenFixed.size,
        adhoc_rows: seenAdhoc.size,
      })
      .eq("id", run.id);
    if (finishError) throw new Error(`Could not finish sync run: ${finishError.message}`);

    return {
      fixedRows: seenFixed.size,
      adhocRows: seenAdhoc.size,
      fixedChanged: fixedChanged.length,
      adhocChanged: adhocChanged.length,
      syncedAt,
    };
  } catch (err) {
    const message = (err as Error).message ?? "unknown error";
    if (run?.id) {
      await supabaseAdmin
        .from("fleet_sync_runs")
        .update({ finished_at: new Date().toISOString(), status: "error", error: message })
        .eq("id", run.id);
    }
    throw err;
  }
}
