import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { jsonResult, requireFleetUser } from "../shared";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_fleet_actions",
  title: "Follow-up action history",
  description:
    "Read the logged follow-up actions (resolved, calls, whatsapp) for a fleet DRI, newest first. Optionally filter to one ticket or contract reference.",
  inputSchema: {
    dri: z.string().describe("Fleet DRI name."),
    ref: z.string().optional().describe("Ticket or contract number to filter on."),
    limit: z.number().int().optional().describe("Max rows (default 50, cap 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ dri, ref, limit }, ctx) => {
    requireFleetUser(ctx);
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("fleet_actions")
      .select("id,dri,ref,kind,action,label,center,note,created_at")
      .eq("dri", dri)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (ref) q = q.eq("ref", ref);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text" as const, text: error.message }], isError: true };
    }
    return jsonResult({ total: data?.length ?? 0, actions: data ?? [] });
  },
});
