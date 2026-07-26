import { createServerFn } from "@tanstack/react-start";
import { getFleetData } from "./fleet.functions";

const DEFAULT_PASSWORD = "Delhivery@4321";

function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function getCanonicalDris(): Promise<string[]> {
  const data = await getFleetData();
  const set = new Set<string>();
  for (const r of data.fixed) if (r.fleetDri?.trim()) set.add(r.fleetDri.trim());
  for (const r of data.adhoc) if (r.fleetDri?.trim()) set.add(r.fleetDri.trim());
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export const listDris = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return { ok: true as const, dris: await getCanonicalDris() };
  } catch {
    return { ok: true as const, dris: [] as string[] };
  }
});

export const verifyLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { dri: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.FLEET_APP_PASSWORD || DEFAULT_PASSWORD;
    if (!data.dri.trim()) {
      return { ok: false as const, error: "Please enter your name." };
    }
    if (data.password !== expected) {
      return { ok: false as const, error: "Incorrect password." };
    }

    let dris: string[] = [];
    try {
      dris = await getCanonicalDris();
    } catch {
      // If sheet fetch fails, fall back to accepting typed name.
      return { ok: true as const, dri: data.dri.trim() };
    }

    const target = normalize(data.dri);
    const match = dris.find((d) => normalize(d) === target);
    if (!match) {
      return {
        ok: false as const,
        error:
          "Name not found in fleet roster. Please pick your name from suggestions (e.g. 'Ajaydev K J').",
      };
    }
    return { ok: true as const, dri: match };
  });
