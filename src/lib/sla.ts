// SLA / reporting-breach countdown helpers.
// "Breach" = the vehicle's scheduled reporting time has passed but attendance
// is still missing (or the adhoc ticket is still open past its reporting time).

import { parseDate } from "./dates";

export type SlaTone = "safe" | "warn" | "breached";

export const SLA_WARN_MIN = 120; // amber under 2h to reporting time

/** Minutes remaining until reporting time. Negative if already breached. */
export function timeToBreach(reportingTime: string | undefined, now = Date.now()): number | null {
  if (!reportingTime) return null;
  const d = parseDate(reportingTime);
  if (!d) return null;
  return Math.round((d.getTime() - now) / 60_000);
}

export function slaTone(minutes: number | null): SlaTone {
  if (minutes == null) return "safe";
  if (minutes <= 0) return "breached";
  if (minutes <= SLA_WARN_MIN) return "warn";
  return "safe";
}

export function slaColor(tone: SlaTone): string {
  switch (tone) {
    case "breached":
      return "var(--color-destructive)";
    case "warn":
      return "var(--color-warning)";
    default:
      return "var(--color-success)";
  }
}

export function slaLabel(minutes: number | null): string {
  if (minutes == null) return "Reporting time N/A";
  if (minutes <= 0) {
    const over = Math.abs(minutes);
    return `Breached ${formatDuration(over)} ago`;
  }
  return `Reports in ${formatDuration(minutes)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Sort comparator by SLA urgency: breached first, then soonest reporting time,
 * then null/unknown last. Used to surface the most urgent follow-ups at top.
 */
export function bySlaUrgency<T>(rows: T[], timeOf: (r: T) => string | undefined): T[] {
  return [...rows].sort((a, b) => {
    const ta = timeToBreach(timeOf(a));
    const tb = timeToBreach(timeOf(b));
    // Both null → keep order
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  });
}
