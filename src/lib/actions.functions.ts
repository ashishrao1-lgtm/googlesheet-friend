import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

// Shared publishable-key client factory (anon-level access; the fleet_actions
// table mirrors the feedback table's open insert/select pattern).
function makeClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export type FleetAction = {
  id: string;
  dri: string;
  ref: string;
  kind: "adhoc" | "fixed";
  action: "resolved" | "called_driver" | "called_vendor" | "whatsapp" | "undo";
  label: string;
  center: string;
  note: string | null;
  created_at: string;
};

const actionSchema = z.object({
  dri: z.string().trim().min(1).max(120),
  ref: z.string().trim().min(1).max(120),
  kind: z.enum(["adhoc", "fixed"]),
  action: z.enum(["resolved", "called_driver", "called_vendor", "whatsapp", "undo"]),
  label: z.string().trim().max(200),
  center: z.string().trim().max(200),
  note: z.string().trim().max(500).optional(),
});

export const logAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => actionSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = makeClient();
    const { error } = await supabase.from("fleet_actions").insert({
      dri: data.dri,
      ref: data.ref,
      kind: data.kind,
      action: data.action,
      label: data.label,
      center: data.center,
      note: data.note ?? null,
    });
    if (error) {
      console.error("[fleet_actions] insert failed", error);
      return { ok: false as const, error: "Could not log action." };
    }
    return { ok: true as const };
  });

const listSchema = z.object({
  dri: z.string().trim().min(1).max(120),
  ref: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(200).default(60),
});

export const listActions = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = makeClient();
    let q = supabase
      .from("fleet_actions")
      .select("id,dri,ref,kind,action,label,center,note,created_at")
      .eq("dri", data.dri)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.ref) q = q.eq("ref", data.ref);
    const { data: rows, error } = await q;
    if (error) {
      console.error("[fleet_actions] select failed", error);
      return { ok: false as const, error: "Could not load actions.", actions: [] as FleetAction[] };
    }
    return { ok: true as const, actions: (rows ?? []) as unknown as FleetAction[] };
  });
