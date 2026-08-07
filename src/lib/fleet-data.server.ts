// Server-only Google Sheets fleet loader. Shared by the app's server functions
// and by the MCP tools so both read exactly the same data window.
import { dayKey, parseDate } from "./dates";

const SPREADSHEET_ID = "1WdOikE2Q0XbZxlIv6V0nLLpZJyoc3SNBmjeei2VFFC0";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

export type FixedRow = {
  contractCode: string;
  contractNumber: string;
  vehicle: string;
  vendor: string;
  center: string;
  city: string;
  state: string;
  zone: string;
  facilityType: string;
  contractHrs: string;
  contractDays: string;
  attendanceDate: string;
  reportingTime: string;
  reportedAt: string;
  status: string;
  attendanceStatus: string;
  startDate: string;
  fleetDri: string;
};

export type AdhocRow = {
  indentId: string;
  ticketNo: string;
  lob: string;
  duration: string;
  vehicle: string;
  driverPhone: string;
  spPhone: string;
  center: string;
  facilityType: string;
  dr: string;
  sdr: string;
  vehicleType: string;
  state: string;
  city: string;
  zone: string;
  creationTime: string;
  reportingTime: string;
  attendanceInTime: string;
  vendor: string;
  ticketStatus: string;
  creationBucket: string;
  reason: string;
  targetPrice: string;
  bidAmount: string;
  bidOrigin: string;
  fleetDri: string;
  ontimePlacement: string;
};

export type FleetPayload = {
  fixed: FixedRow[];
  adhoc: AdhocRow[];
  fetchedAt: string;
  /** Earliest reporting day present in the loaded window (YYYY-MM-DD), for coverage hints. */
  coverageFrom: string | null;
};

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]!}`,
    "X-Connection-Api-Key": process.env["GOOGLE_SHEETS_API_KEY"]!,
  };
}

type SheetMeta = { title: string; rowCount: number };

async function getSheetsMeta(): Promise<SheetMeta[]> {
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties(title,gridProperties))`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Sheets meta ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    sheets: { properties: { title: string; gridProperties: { rowCount: number } } }[];
  };
  return data.sheets.map((s) => ({
    title: s.properties.title,
    rowCount: s.properties.gridProperties.rowCount,
  }));
}

async function fetchRanges(ranges: string[]) {
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Sheets error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { valueRanges: { values?: string[][] }[] };
  return data.valueRanges.map((v) => v.values ?? []);
}

// Fetch the most recent rows from the tail of each sheet.
const FIXED_TAIL = 45000;
const ADHOC_TAIL = 9000;

// Module-level cache to survive across requests on the same worker instance.
// Sheets API has a 60 req/min per-project limit shared across all users, so we
// must not hit it on every page load.
const CACHE_TTL_MS = 60_000;
let cache: { data: FleetPayload; expires: number } | null = null;
let inflight: Promise<FleetPayload> | null = null;

async function loadFleetData(): Promise<FleetPayload> {
  const meta = await getSheetsMeta();
  const fixedMeta = meta.find((m) => m.title === "Fixed Compliance");
  const adhocMeta = meta.find((m) => m.title === "Adhoc Compliance");
  if (!fixedMeta || !adhocMeta) throw new Error("Sheet tabs not found");

  const fixedStart = Math.max(2, fixedMeta.rowCount - FIXED_TAIL + 1);
  const adhocStart = Math.max(2, adhocMeta.rowCount - ADHOC_TAIL + 1);

  const [fixed, adhoc] = await fetchRanges([
    `Fixed Compliance!A${fixedStart}:R${fixedMeta.rowCount}`,
    `Adhoc Compliance!A${adhocStart}:AG${adhocMeta.rowCount}`,
  ]);

  const fixedRows: FixedRow[] = fixed
    .filter((r) => r[1] || r[2])
    .map((r) => ({
      contractCode: r[0] ?? "",
      contractNumber: r[1] ?? "",
      vehicle: r[2] ?? "",
      vendor: r[3] ?? "",
      center: r[4] ?? "",
      city: r[5] ?? "",
      state: r[6] ?? "",
      zone: r[7] ?? "",
      facilityType: r[8] ?? "",
      contractHrs: r[9] ?? "",
      contractDays: r[10] ?? "",
      attendanceDate: r[11] ?? "",
      reportingTime: r[12] ?? "",
      reportedAt: r[13] ?? "",
      status: r[14] ?? "",
      attendanceStatus: r[15] ?? "",
      startDate: r[16] ?? "",
      fleetDri: r[17] ?? "",
    }));

  const adhocRows: AdhocRow[] = adhoc
    .filter((r) => r[1] || r[0])
    .map((r) => ({
      indentId: r[0] ?? "",
      ticketNo: r[1] ?? "",
      lob: r[2] ?? "",
      duration: r[3] ?? "",
      vehicle: r[4] ?? "",
      driverPhone: r[5] ?? "",
      spPhone: r[6] ?? "",
      center: r[7] ?? "",
      facilityType: r[8] ?? "",
      dr: r[9] ?? "",
      sdr: r[10] ?? "",
      vehicleType: r[11] ?? "",
      state: r[12] ?? "",
      city: r[13] ?? "",
      zone: r[14] ?? "",
      creationTime: r[15] ?? "",
      reportingTime: r[16] ?? "",
      attendanceInTime: r[17] ?? "",
      vendor: r[18] ?? "",
      ticketStatus: r[19] ?? "",
      creationBucket: r[20] ?? "",
      reason: r[21] ?? "",
      targetPrice: r[22] ?? "",
      bidAmount: r[23] ?? "",
      bidOrigin: r[24] ?? "",
      fleetDri: r[27] ?? "",
      ontimePlacement: r[28] ?? "",
    }));

  let earliest: Date | null = null;
  for (const r of fixedRows) {
    const d = parseDate(r.reportingTime || r.attendanceDate);
    if (d && (!earliest || d < earliest)) earliest = d;
  }

  return {
    fixed: fixedRows,
    adhoc: adhocRows,
    fetchedAt: new Date().toISOString(),
    coverageFrom: earliest ? dayKey(earliest) : null,
  };
}

export async function getFleetPayload(): Promise<FleetPayload> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await loadFleetData();
      cache = { data, expires: Date.now() + CACHE_TTL_MS };
      return data;
    } catch (err) {
      // On rate-limit or transient errors, serve stale cache if we have it.
      if (cache) {
        console.warn("getFleetPayload failed, serving stale cache:", (err as Error).message);
        return cache.data;
      }
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
