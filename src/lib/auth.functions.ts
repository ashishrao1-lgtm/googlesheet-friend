import { createServerFn } from "@tanstack/react-start";

const DEFAULT_PASSWORD = "Delhivery@4321";
const SPREADSHEET_ID = "1WdOikE2Q0XbZxlIv6V0nLLpZJyoc3SNBmjeei2VFFC0";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const LIMIT = 800;

function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function fetchDriColumns(): Promise<string[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey || !connKey) return [];
  const ranges = [
    `Fixed Compliance!R2:R${LIMIT + 1}`,
    `Adhoc Compliance!AB2:AB${LIMIT + 1}`,
  ];
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${qs}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { valueRanges: { values?: string[][] }[] };
  const set = new Set<string>();
  for (const vr of data.valueRanges) {
    for (const row of vr.values ?? []) {
      const v = (row[0] ?? "").trim();
      if (v) set.add(v);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export const listDris = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return { ok: true as const, dris: await fetchDriColumns() };
  } catch {
    return { ok: true as const, dris: [] as string[] };
  }
});

export const verifyLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { dri: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.FLEET_APP_PASSWORD || DEFAULT_PASSWORD;
    if (!data.dri.trim()) {
      return { ok: false as const, error: "Please enter your name.", dri: "" };
    }
    if (data.password !== expected) {
      return { ok: false as const, error: "Incorrect password.", dri: "" };
    }

    let dris: string[] = [];
    try {
      dris = await fetchDriColumns();
    } catch {
      return { ok: true as const, dri: data.dri.trim(), error: "" };
    }

    if (dris.length === 0) {
      return { ok: true as const, dri: data.dri.trim(), error: "" };
    }

    const target = normalize(data.dri);
    const match = dris.find((d) => normalize(d) === target);
    if (!match) {
      return {
        ok: false as const,
        error:
          "Name not found in fleet roster. Pick your name from the suggestions (e.g. 'Ajaydev K J').",
        dri: "",
      };
    }
    return { ok: true as const, dri: match, error: "" };
  });
