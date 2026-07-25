import type { AdhocRow, FixedRow } from "./fleet.functions";

export type FilterState = {
  state: string;
  zone: string;
  city: string;
  vendor: string;
  center: string;
  facilityType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

export const EMPTY_FILTERS: FilterState = {
  state: "",
  zone: "",
  city: "",
  vendor: "",
  center: "",
  facilityType: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

export function activeCount(f: FilterState): number {
  return Object.values(f).filter((v) => v && v !== "").length;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inDateRange(dateStr: string, from: string, to: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return true;
  if (from) {
    const df = new Date(from + "T00:00:00");
    if (d < df) return false;
  }
  if (to) {
    const dt = new Date(to + "T23:59:59");
    if (d > dt) return false;
  }
  return true;
}

export function applyFixedFilters(rows: FixedRow[], f: FilterState): FixedRow[] {
  return rows.filter((r) => {
    if (f.state && r.state !== f.state) return false;
    if (f.zone && r.zone !== f.zone) return false;
    if (f.city && r.city !== f.city) return false;
    if (f.vendor && r.vendor !== f.vendor) return false;
    if (f.center && r.center !== f.center) return false;
    if (f.facilityType && r.facilityType !== f.facilityType) return false;
    if (f.status && r.status !== f.status) return false;
    if ((f.dateFrom || f.dateTo) && !inDateRange(r.attendanceDate, f.dateFrom, f.dateTo)) return false;
    return true;
  });
}

export function applyAdhocFilters(rows: AdhocRow[], f: FilterState): AdhocRow[] {
  return rows.filter((r) => {
    if (f.state && r.state !== f.state) return false;
    if (f.zone && r.zone !== f.zone) return false;
    if (f.city && r.city !== f.city) return false;
    if (f.vendor && r.vendor !== f.vendor) return false;
    if (f.center && r.center !== f.center) return false;
    if (f.facilityType && r.facilityType !== f.facilityType) return false;
    if (f.status && r.ticketStatus !== f.status) return false;
    if ((f.dateFrom || f.dateTo) && !inDateRange(r.creationTime, f.dateFrom, f.dateTo)) return false;
    return true;
  });
}

export function uniqueFixedOptions(rows: FixedRow[]) {
  const s = <K extends keyof FixedRow>(k: K) =>
    Array.from(new Set(rows.map((r) => r[k]).filter(Boolean) as string[])).sort();
  return {
    states: s("state"),
    zones: s("zone"),
    cities: s("city"),
    vendors: s("vendor"),
    centers: s("center"),
    facilityTypes: s("facilityType"),
    statuses: s("status"),
  };
}

export function uniqueAdhocOptions(rows: AdhocRow[]) {
  const s = <K extends keyof AdhocRow>(k: K) =>
    Array.from(new Set(rows.map((r) => r[k]).filter(Boolean) as string[])).sort();
  return {
    states: s("state"),
    zones: s("zone"),
    cities: s("city"),
    vendors: s("vendor"),
    centers: s("center"),
    facilityTypes: s("facilityType"),
    statuses: s("ticketStatus"),
  };
}
