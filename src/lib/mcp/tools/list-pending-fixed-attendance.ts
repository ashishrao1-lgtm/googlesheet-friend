import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { getFleetPayload } from "@/lib/fleet-data.server";
import { contains, jsonResult, matchesDay, matchesDri, requireFleetUser } from "../shared";

export default defineTool({
  name: "list_pending_fixed_attendance",
  title: "Fixed contracts pending attendance",
  description:
    "List fixed-vehicle contracts whose attendance is still not marked in (vehicle not yet reported at the centre). Filter by fleet DRI, reporting day (YYYY-MM-DD) and centre.",
  inputSchema: {
    dri: z.string().optional().describe("Fleet DRI name, e.g. 'Ajaydev K J'."),
    date: z.string().optional().describe("Reporting day as YYYY-MM-DD. Defaults to all loaded days."),
    center: z.string().optional().describe("Centre name substring."),
    limit: z.number().int().optional().describe("Max rows to return (default 50, cap 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ dri, date, center, limit }, ctx) => {
    requireFleetUser(ctx);
    const { fixed, fetchedAt, coverageFrom } = await getFleetPayload();
    const cap = Math.min(Math.max(limit ?? 50, 1), 200);

    const pending = fixed.filter(
      (r) =>
        !r.reportedAt.trim() &&
        !/present|reported|marked/i.test(r.attendanceStatus) &&
        matchesDri(r.fleetDri, dri) &&
        matchesDay(r.reportingTime || r.attendanceDate, date) &&
        contains(r.center, center),
    );

    return jsonResult({
      total: pending.length,
      returned: Math.min(pending.length, cap),
      dataFetchedAt: fetchedAt,
      coverageFrom,
      rows: pending.slice(0, cap).map((r) => ({
        contractNumber: r.contractNumber,
        vehicle: r.vehicle,
        vendor: r.vendor,
        center: r.center,
        city: r.city,
        reportingTime: r.reportingTime,
        attendanceStatus: r.attendanceStatus,
        status: r.status,
        fleetDri: r.fleetDri,
      })),
    });
  },
});
