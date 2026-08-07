import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { getFleetPayload } from "@/lib/fleet-data.server";
import { jsonResult, matchesDay, matchesDri, requireFleetUser } from "../shared";

export default defineTool({
  name: "vendor_ontime_performance",
  title: "Vendor on-time performance",
  description:
    "Vendor-level on-time compliance. For 'fixed' it is count(status = On-time) / total contracts. For 'adhoc' it is 1 - (delayed ontime_placement / total tickets), plus the Axle-app bid share.",
  inputSchema: {
    kind: z.enum(["fixed", "adhoc"]).describe("Which dataset to summarise."),
    dri: z.string().optional().describe("Fleet DRI name."),
    date: z.string().optional().describe("Reporting day as YYYY-MM-DD."),
    vendor: z.string().optional().describe("Vendor name substring."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, dri, date, vendor }, ctx) => {
    requireFleetUser(ctx);
    const data = await getFleetPayload();
    const vendorFilter = (v: string) =>
      !vendor || (v || "").toLowerCase().includes(vendor.toLowerCase());

    type Agg = { vendor: string; total: number; ontime: number; axleApp: number };
    const map = new Map<string, Agg>();
    const bump = (name: string, ontime: boolean, axleApp = false) => {
      const key = name.trim() || "(blank)";
      const agg = map.get(key) ?? { vendor: key, total: 0, ontime: 0, axleApp: 0 };
      agg.total += 1;
      if (ontime) agg.ontime += 1;
      if (axleApp) agg.axleApp += 1;
      map.set(key, agg);
    };

    if (kind === "fixed") {
      for (const r of data.fixed) {
        if (!matchesDri(r.fleetDri, dri)) continue;
        if (!matchesDay(r.reportingTime || r.attendanceDate, date)) continue;
        if (!vendorFilter(r.vendor)) continue;
        bump(r.vendor, /on[\s-]?time/i.test(r.status));
      }
    } else {
      for (const r of data.adhoc) {
        if (!matchesDri(r.fleetDri, dri)) continue;
        if (!matchesDay(r.reportingTime || r.creationTime, date)) continue;
        if (!vendorFilter(r.vendor)) continue;
        bump(r.vendor, !/delayed/i.test(r.ontimePlacement), /axle/i.test(r.bidOrigin));
      }
    }

    const rows = Array.from(map.values())
      .map((a) => ({
        vendor: a.vendor,
        total: a.total,
        ontime: a.ontime,
        ontimePct: a.total ? Math.round((a.ontime / a.total) * 1000) / 10 : 0,
        ...(kind === "adhoc"
          ? { axleAppPct: a.total ? Math.round((a.axleApp / a.total) * 1000) / 10 : 0 }
          : {}),
      }))
      .sort((a, b) => b.total - a.total);

    const total = rows.reduce((s, r) => s + r.total, 0);
    const ontime = rows.reduce((s, r) => s + r.ontime, 0);

    return jsonResult({
      kind,
      dataFetchedAt: data.fetchedAt,
      overall: {
        total,
        ontime,
        ontimePct: total ? Math.round((ontime / total) * 1000) / 10 : 0,
      },
      vendors: rows,
    });
  },
});
