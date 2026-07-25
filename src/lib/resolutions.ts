export type ResolvedEntry = {
  id: string;
  kind: "adhoc" | "fixed";
  ref: string; // ticketNo or contractNumber
  label: string;
  center: string;
  resolvedAt: string;
  note?: string;
};

const KEY_PREFIX = "fleet-resolved:";

function key(dri: string) {
  return KEY_PREFIX + dri.trim().toLowerCase();
}

export function getResolutions(dri: string): ResolvedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(dri));
    if (!raw) return [];
    return JSON.parse(raw) as ResolvedEntry[];
  } catch {
    return [];
  }
}

export function saveResolutions(dri: string, list: ResolvedEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(dri), JSON.stringify(list));
}

export function markResolved(dri: string, entry: Omit<ResolvedEntry, "resolvedAt">) {
  const list = getResolutions(dri).filter((e) => e.id !== entry.id);
  list.unshift({ ...entry, resolvedAt: new Date().toISOString() });
  saveResolutions(dri, list);
  return list;
}

export function unresolve(dri: string, id: string) {
  const list = getResolutions(dri).filter((e) => e.id !== id);
  saveResolutions(dri, list);
  return list;
}

export function resolvedIds(dri: string): Set<string> {
  return new Set(getResolutions(dri).map((e) => e.id));
}

export function adhocAlertId(ticketNo: string) {
  return `adhoc:${ticketNo}`;
}
export function fixedAlertId(contractNumber: string, attendanceDate: string) {
  return `fixed:${contractNumber}|${attendanceDate}`;
}
