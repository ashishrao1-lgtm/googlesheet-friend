import { createFileRoute } from "@tanstack/react-router";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/hooks/sync-fleet")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accepted = [process.env["FLEET_SYNC_SECRET"], process.env["FLEET_CRON_TOKEN"]].filter(
          (v): v is string => typeof v === "string" && v.length > 0,
        );
        if (accepted.length === 0) {
          return Response.json({ error: "Sync secret not configured" }, { status: 500 });
        }
        const provided =
          request.headers.get("x-fleet-sync-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!accepted.some((secret) => timingSafeEqual(provided, secret))) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }


        try {
          const { runFleetSync } = await import("@/lib/fleet-sync.server");
          const result = await runFleetSync();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("sync-fleet failed:", err);
          return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
        }
      },
    },
  },
});
