import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { jsonResult, requireFleetUser } from "../shared";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_fleet_action",
  title: "Log a follow-up action",
  description:
    "Record a follow-up action against an adhoc ticket or fixed contract (resolved, called driver, called vendor, whatsapp, undo) so it shows up in the app's actioned history.",
  inputSchema: {
    dri: z.string().describe("Fleet DRI the action belongs to."),
    ref: z.string().describe("Ticket number or contract number."),
    kind: z.enum(["adhoc", "fixed"]),
    action: z.enum(["resolved", "called_driver", "called_vendor", "whatsapp", "undo"]),
    label: z.string().optional().describe("Short human label for the record."),
    center: z.string().optional().describe("Centre name."),
    note: z.string().optional().describe("Optional free-text note."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ dri, ref, kind, action, label, center, note }, ctx) => {
    requireFleetUser(ctx);
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase.from("fleet_actions").insert({
      dri,
      ref,
      kind,
      action,
      label: (label ?? ref).slice(0, 200),
      center: (center ?? "").slice(0, 200),
      note: note ? note.slice(0, 500) : null,
    });
    if (error) {
      return { content: [{ type: "text" as const, text: error.message }], isError: true };
    }
    return jsonResult({ ok: true, ref, action });
  },
});
