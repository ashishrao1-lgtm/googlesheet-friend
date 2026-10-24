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
  nep: string;
  unionArea: string;
  fleetDri: string;
  ontimePlacement: string;
  acceptanceDiff: string;
  bidReceivedTime: string;
  updatedBy: string;
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

// Column widths: Fixed = A:R (18), Adhoc = A:AD (30).
const FIXED_COLS = 18;
const ADHOC_COLS = 30;

const colLetter = (n: number) => {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Header-name based mapping, so future sheet column reorders don't silently
// corrupt the data (the adhoc tab was restructured before and broke the app).
const FIXED_FIELD_HEADERS: Record<keyof FixedRow, string> = {
  contractCode: "contract code",
  contractNumber: "contract number",
  vehicle: "attendance vehicle",
  vendor: "vendor name",
  center: "center name",
  city: "city",
  state: "state",
  zone: "zone",
  facilityType: "facility type",
  contractHrs: "contract hrs",
  contractDays: "contract days",
  attendanceDate: "attendance date",
  reportingTime: "reporting time",
  reportedAt: "reported at",
  status: "status",
  attendanceStatus: "attendance_status",
  startDate: "start_date",
  fleetDri: "fleet_dr_is",
};

const ADHOC_FIELD_HEADERS: Record<keyof AdhocRow, string> = {
  indentId: "indent_id",
  ticketNo: "ticket_no",
  lob: "lob",
  duration: "ticket_duration",
  vehicle: "vehicle_no",
  driverPhone: "driver_phone",
  spPhone: "sp_phone",
  center: "center_name",
  facilityType: "facility_type",
  vehicleType: "vehicle_type",
  state: "state",
  city: "city",
  zone: "zone",
  creationTime: "creation_time",
  reportingTime: "reporting_time",
  attendanceInTime: "attendance_in_time",
  vendor: "vendor_name",
  ticketStatus: "ticket_status",
  creationBucket: "tkt_creation_bucket",
  reason: "ticket_reason",
  targetPrice: "target_price",
  bidAmount: "bid_amount",
  bidOrigin: "bid_origin",
  nep: "nep",
  unionArea: "union_area",
  fleetDri: "fleet_dr_is",
  ontimePlacement: "ontime_placement",
  acceptanceDiff: "acceptance_diff",
  bidReceivedTime: "bid_received_time",
  updatedBy: "updated_by",
};

const normHeader = (h: string) =>
  (h || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function headerIndexMap(headers: string[]): Map<string, number> {
  const m = new Map<string, number>();
  headers.forEach((h, i) => {
    const key = normHeader(h);
    if (key && !m.has(key)) m.set(key, i);
  });
  return m;
}

/** Maps one sheet row to a typed object using the header index map. */
function mapRow<T extends Record<string, string>>(
  row: string[],
  idx: Map<string, number>,
  fields: Record<string, string>,
): T {
  const out: Record<string, string> = {};
  for (const [field, header] of Object.entries(fields)) {
    const i = idx.get(normHeader(header));
    out[field] = i != null && i < row.length ? (row[i] ?? "") : "";
  }
  return out as T;
}

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

  const [fixed, adhoc, fixedHeaders, adhocHeaders] = await fetchRanges([
    `Fixed Compliance!A${fixedStart}:${colLetter(FIXED_COLS)}${fixedMeta.rowCount}`,
    `Adhoc Compliance!A${adhocStart}:${colLetter(ADHOC_COLS)}${adhocMeta.rowCount}`,
    `Fixed Compliance!A1:${colLetter(FIXED_COLS)}1`,
    `Adhoc Compliance!A1:${colLetter(ADHOC_COLS)}1`,
  ]);

  const fixedIdx = headerIndexMap(fixedHeaders[0] ?? []);
  const adhocIdx = headerIndexMap(adhocHeaders[0] ?? []);

  const fixedRows: FixedRow[] = fixed
    .filter((r) => r[1] || r[2])
    .map((r) => mapRow<FixedRow>(r, fixedIdx, FIXED_FIELD_HEADERS));

  const adhocRows: AdhocRow[] = adhoc
    .filter((r) => r[1] || r[0])
    .map((r) => mapRow<AdhocRow>(r, adhocIdx, ADHOC_FIELD_HEADERS));

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
