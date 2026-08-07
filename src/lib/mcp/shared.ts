import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";

import { dayKey, parseDate } from "@/lib/dates";

/**
 * Only company accounts may read fleet operations data over MCP. The email
 * claim comes from the verified OAuth token, never from tool input.
 */
const ALLOWED_EMAIL_DOMAIN = "delhivery.com";

export function requireFleetUser(ctx: ToolContext): string {
  if (!ctx.isAuthenticated()) {
    throw new ToolError("Not authenticated. Connect this MCP server and sign in first.");
  }
  const email = (ctx.getUserEmail() ?? "").toLowerCase().trim();
  const domain = (process.env["FLEET_MCP_EMAIL_DOMAIN"] ?? ALLOWED_EMAIL_DOMAIN).toLowerCase();
  if (!email.endsWith("@" + domain)) {
    throw new ToolError(`Access is limited to @${domain} accounts.`);
  }
  return email;
}

export function matchesDri(rowDri: string, dri?: string): boolean {
  if (!dri) return true;
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm(rowDri) === norm(dri);
}

/** Compare a sheet date/time cell against a YYYY-MM-DD day. */
export function matchesDay(cell: string, day?: string): boolean {
  if (!day) return true;
  const d = parseDate(cell);
  return d ? dayKey(d) === day : false;
}

export function contains(haystack: string, needle?: string): boolean {
  if (!needle) return true;
  return (haystack || "").toLowerCase().includes(needle.toLowerCase());
}

export function jsonResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}
