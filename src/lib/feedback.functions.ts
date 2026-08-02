import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

const feedbackSchema = z.object({
  reporterName: z.string().trim().min(1).max(120),
  category: z.enum(["issue", "idea", "other"]),
  message: z.string().trim().min(5, "Please add a few more details").max(2000),
  page: z.string().trim().max(200).optional(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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

    const { error } = await supabase.from("feedback").insert({
      reporter_name: data.reporterName,
      category: data.category,
      message: data.message,
      page: data.page ?? null,
    });

    if (error) {
      console.error("[feedback] insert failed", error);
      return { ok: false as const, error: "Could not save your feedback. Please try again." };
    }
    return { ok: true as const };
  });
