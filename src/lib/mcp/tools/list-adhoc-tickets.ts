import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { getFleetPayload } from "@/lib/fleet-data.server";
import { contains, jsonResult, matchesDay, matchesDri, requireFleetUser } from "../shared";

export default defineTool({
  name: "list_adhoc_tickets",
  title: "Adhoc tickets",
  description:
    "List adhoc placement tickets with vendor, centre, reporting time, driver/vendor phone numbers and on-time placement status. Filter by fleet DRI, ticket status (e.g. 'requested', 'truck confirmed'), reporting day and centre.",
  inputSchema: {
    dri: z.string().optional().describe("Fleet DRI name."),
    status: z.string().optional().describe("Ticket status substring, e.g. 'requested' or 'confirmed'."),
    date: z.string().optional().describe("Reporting day as YYYY-MM-DD."),
    center: z.string().optional().describe("Centre name substring."),
    pendingArrivalOnly: z
      .boolean()
      .optional()
      .describe("Only tickets where the vehicle has not yet been marked in."),
    limit: z.number().int().optional().describe("Max rows to return (default 50, cap 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ dri, status, date, center, pendingArrivalOnly, limit }, ctx) => {
    requireFleetUser(ctx);
    const { adhoc, fetchedAt } = await getFleetPayload();
    const cap = Math.min(Math.max(limit ?? 50, 1), 200);

    const rows = adhoc.filter(
      (r) =>
        matchesDri(r.fleetDri, dri) &&
        contains(r.ticketStatus, status) &&
        contains(r.center, center) &&
        matchesDay(r.reportingTime || r.creationTime, date) &&
        (!pendingArrivalOnly || !r.attendanceInTime.trim()),
    );

    return jsonResult({
      total: rows.length,
      returned: Math.min(rows.length, cap),
      dataFetchedAt: fetchedAt,
      rows: rows.slice(0, cap).map((r) => ({
        ticketNo: r.ticketNo,
        indentId: r.indentId,
        status: r.ticketStatus,
        vendor: r.vendor,
        center: r.center,
        city: r.city,
        vehicleType: r.vehicleType,
        vehicle: r.vehicle,
        driverPhone: r.driverPhone,
        vendorPhone: r.spPhone,
        reportingTime: r.reportingTime,
        attendanceInTime: r.attendanceInTime,
        ontimePlacement: r.ontimePlacement,
        bidOrigin: r.bidOrigin,
        fleetDri: r.fleetDri,
      })),
    });
  },
});
