// Robust date parsing for Google-Sheet formatted values.
// Sheets may return values as "2026-07-27 08:00:00", "27/07/2026 08:00",
// "27-Jul-2026 08:00", "7/27/2026", ISO strings, or serial numbers.

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

export function parseDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // ISO / native parseable
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const nat = new Date(iso);
  if (!Number.isNaN(nat.getTime()) && /\d{4}-\d{2}-\d{2}/.test(s)) return nat;

  // DD/MM/YYYY or DD-MM-YYYY (with optional time)
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmy) {
    const [, dd, mm, yy, hh = "0", mi = "0", ss = "0"] = dmy;
    let year = parseInt(yy, 10);
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10),
      parseInt(hh, 10), parseInt(mi, 10), parseInt(ss, 10));
    if (!Number.isNaN(d.getTime())) return d;
  }

  // DD-MMM-YYYY or DD MMM YYYY
  const dmyName = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3,})[\s\-\/](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (dmyName) {
    const [, dd, mon, yy, hh = "0", mi = "0"] = dmyName;
    const m = MONTHS[mon.slice(0, 3).toLowerCase()];
    if (m != null) {
      let year = parseInt(yy, 10);
      if (year < 100) year += 2000;
      const d = new Date(year, m, parseInt(dd, 10), parseInt(hh, 10), parseInt(mi, 10));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // Fallback
  if (!Number.isNaN(nat.getTime())) return nat;
  return null;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
