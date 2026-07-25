export type FleetSession = {
  dri: string;
  loginAt: string;
  previousLoginAt: string | null;
};

const KEY = "fleet-exec-session";

export function getSession(): FleetSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FleetSession;
  } catch {
    return null;
  }
}

export function setSession(dri: string): FleetSession {
  const prev = getSession();
  const s: FleetSession = {
    dri: dri.trim(),
    loginAt: new Date().toISOString(),
    previousLoginAt: prev?.loginAt ?? null,
  };
  window.localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function driMatches(rowDri: string, sessionDri: string): boolean {
  return (rowDri || "").trim().toLowerCase() === (sessionDri || "").trim().toLowerCase();
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
