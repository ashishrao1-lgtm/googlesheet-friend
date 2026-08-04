// Shared "open alert" selectors for a DRI's AOR. Used by the Home page and the
// BottomNav badge so both surfaces agree on what counts as actionable.

import { parseDate, sameDay } from "./dates";
import { resolvedIds } from "./resolutions";
import { adhocAlertId, fixedAlertId } from "./resolutions";
import type { AdhocRow, FixedRow } from "./fleet.functions";
import { driMatches } from "./session";

export function isAdhocOpen(r: AdhocRow): boolean {
  const s = (r.ticketStatus || "").toLowerCase().trim();
  return s === "requested" || s.includes("request") || s === "open" || s === "pending";
}

export function isFixedMissing(r: FixedRow): boolean {
  const s = (r.attendanceStatus || "").toLowerCase();
  return !s || s.includes("missing") || s.includes("not marked") || s.includes("pending");
}

function latestDate(dates: (string | undefined)[]): Date | null {
  let latest: Date | null = null;
  for (const s of dates) {
    const d = parseDate(s || "");
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

export type OpenAlerts = {
  adhoc: AdhocRow[];
  fixed: FixedRow[];
  today: Date | null;
  todayAdhoc: Date | null;
};

export function computeOpenAlerts(
  fixed: FixedRow[],
  adhoc: AdhocRow[],
  dri: string,
): OpenAlerts {
  const mineFixed = fixed.filter((r) => driMatches(r.fleetDri, dri));
  const mineAdhoc = adhoc.filter((r) => driMatches(r.fleetDri, dri));
  const today = latestDate(mineFixed.map((r) => r.reportingTime));
  const todayAdhoc = latestDate(mineAdhoc.map((r) => r.creationTime));
  const resolved = resolvedIds(dri);

  const adhocAlerts = mineAdhoc
    .filter(isAdhocOpen)
    .filter((r) => {
      if (!todayAdhoc) return true;
      const d = parseDate(r.creationTime);
      return !!d && sameDay(d, todayAdhoc);
    })
    .filter((r) => !resolved.has(adhocAlertId(r.ticketNo)));

  const fixedAlerts = mineFixed
    .filter(isFixedMissing)
    .filter((r) => {
      if (!today) return true;
      const d = parseDate(r.reportingTime);
      return !!d && sameDay(d, today);
    })
    .filter((r) => !resolved.has(fixedAlertId(r.contractNumber, r.attendanceDate)));

  return { adhoc: adhocAlerts, fixed: fixedAlerts, today, todayAdhoc };
}
