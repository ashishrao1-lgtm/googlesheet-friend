import { createServerFn } from "@tanstack/react-start";

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

async function fetchRanges(ranges: string[]) {
  const apiKey = process.env.LOVABLE_API_KEY!;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY!;
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${qs}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as {
    valueRanges: { values?: string[][] }[];
  };
  return data.valueRanges.map((v) => v.values ?? []);
}

const LIMIT = 800;

export const getFleetData = createServerFn({ method: "GET" }).handler(async () => {
  const [fixed, adhoc] = await fetchRanges([
    `Fixed Compliance!A2:R${LIMIT + 1}`,
    `Adhoc Compliance!A2:AG${LIMIT + 1}`,
  ]);

  const fixedRows: FixedRow[] = fixed.map((r) => ({
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

  const adhocRows: AdhocRow[] = adhoc.map((r) => ({
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

  return { fixed: fixedRows, adhoc: adhocRows, fetchedAt: new Date().toISOString() };
});
