import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getFleetData, type AdhocRow, type FixedRow } from "./fleet.functions";
import { parseDate } from "./dates";

const askSchema = z.object({
  question: z.string().trim().min(2).max(500),
  dri: z.string().trim().min(1).max(120),
});

export type AskRef = { kind: "vehicle" | "ticket"; id: string; label: string };
export type AskResult =
  | { ok: true; answer: string; refs: AskRef[] }
  | { ok: false; error: string };

function norm(v: string) {
  return (v || "").trim().toLowerCase();
}

function isOnTime(v: string) {
  return norm(v).replace(/[\s_-]/g, "") === "ontime";
}

function isMarked(v: string) {
  return norm(v).includes("marked");
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

function latestDateKey(rows: { d: string }[]): string | null {
  let best: Date | null = null;
  for (const r of rows) {
    const d = parseDate(r.d);
    if (d && (!best || d > best)) best = d;
  }
  return best ? best.toISOString().slice(0, 10) : null;
}

function dayKey(v: string): string | null {
  const d = parseDate(v);
  return d ? d.toISOString().slice(0, 10) : null;
}

function buildDigest(fixed: FixedRow[], adhoc: AdhocRow[], question: string) {
  const latestFixedDay = latestDateKey(fixed.map((r) => ({ d: r.attendanceDate })));
  const latestAdhocDay = latestDateKey(adhoc.map((r) => ({ d: r.creationTime })));

  // Fixed vendor performance
  const fixedVendor = new Map<string, { total: number; onTime: number }>();
  for (const r of fixed) {
    const key = r.vendor || "Unknown";
    const s = fixedVendor.get(key) ?? { total: 0, onTime: 0 };
    s.total += 1;
    if (isOnTime(r.status)) s.onTime += 1;
    fixedVendor.set(key, s);
  }
  const fixedVendorPerf = [...fixedVendor.entries()]
    .map(([vendor, s]) => ({ vendor, total: s.total, onTimePct: pct(s.onTime, s.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 40);

  // Adhoc vendor performance (reporting breach + axle app)
  const adhocVendor = new Map<string, { total: number; delayed: number; axle: number }>();
  for (const r of adhoc) {
    const key = r.vendor || "Unknown";
    const s = adhocVendor.get(key) ?? { total: 0, delayed: 0, axle: 0 };
    s.total += 1;
    if (norm(r.ontimePlacement) === "delayed") s.delayed += 1;
    if (norm(r.bidOrigin).includes("axle")) s.axle += 1;
    adhocVendor.set(key, s);
  }
  const adhocVendorPerf = [...adhocVendor.entries()]
    .map(([vendor, s]) => ({
      vendor,
      tickets: s.total,
      breachPct: pct(s.delayed, s.total),
      axleAppPct: pct(s.axle, s.total),
    }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 40);

  // Daily fixed on-time trend (last 14 days present)
  const byDay = new Map<string, { total: number; onTime: number }>();
  for (const r of fixed) {
    const k = dayKey(r.attendanceDate);
    if (!k) continue;
    const s = byDay.get(k) ?? { total: 0, onTime: 0 };
    s.total += 1;
    if (isOnTime(r.status)) s.onTime += 1;
    byDay.set(k, s);
  }
  const dailyFixedOnTime = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 14)
    .map(([day, s]) => ({ day, total: s.total, onTimePct: pct(s.onTime, s.total) }));

  const requested = adhoc
    .filter((r) => norm(r.ticketStatus).includes("request"))
    .slice(0, 40)
    .map((r) => ({
      ticketNo: r.ticketNo,
      center: r.center,
      city: r.city,
      vendor: r.vendor,
      reportingTime: r.reportingTime,
      vehicleType: r.vehicleType,
      status: r.ticketStatus,
    }));

  const confirmedNotArrived = adhoc
    .filter((r) => norm(r.ticketStatus).replace(/[\s_]/g, "") === "truckconfirmed")
    .slice(0, 40)
    .map((r) => ({
      ticketNo: r.ticketNo,
      vehicle: r.vehicle,
      center: r.center,
      vendor: r.vendor,
      driverPhone: r.driverPhone,
      reportingTime: r.reportingTime,
    }));

  const missingAttendance = fixed
    .filter((r) => !isMarked(r.attendanceStatus))
    .filter((r) => !latestFixedDay || dayKey(r.attendanceDate) === latestFixedDay)
    .slice(0, 60)
    .map((r) => ({
      vehicle: r.vehicle,
      contractNumber: r.contractNumber,
      center: r.center,
      city: r.city,
      vendor: r.vendor,
      reportingTime: r.reportingTime,
    }));

  // Deterministic entity lookup from the question text
  const tokens = question
    .split(/[^A-Za-z0-9]+/)
    .filter((t) => t.length >= 4)
    .map((t) => t.toLowerCase())
    .slice(0, 6);

  const matchedFixed = tokens.length
    ? fixed
        .filter((r) => tokens.some((t) => norm(r.vehicle).includes(t) || norm(r.contractNumber).includes(t)))
        .slice(0, 10)
    : [];
  const matchedAdhoc = tokens.length
    ? adhoc
        .filter((r) =>
          tokens.some(
            (t) =>
              norm(r.ticketNo).includes(t) ||
              norm(r.indentId).includes(t) ||
              norm(r.vehicle).includes(t),
          ),
        )
        .slice(0, 10)
    : [];

  return {
    scope: {
      latestFixedDay,
      latestAdhocDay,
      fixedRows: fixed.length,
      adhocRows: adhoc.length,
    },
    totals: {
      fixedOnTimePct: pct(fixed.filter((r) => isOnTime(r.status)).length, fixed.length),
      adhocReportingBreachPct: pct(
        adhoc.filter((r) => norm(r.ontimePlacement) === "delayed").length,
        adhoc.length,
      ),
      axleAppPct: pct(adhoc.filter((r) => norm(r.bidOrigin).includes("axle")).length, adhoc.length),
      requestedTickets: adhoc.filter((r) => norm(r.ticketStatus).includes("request")).length,
      truckConfirmed: confirmedNotArrived.length,
      missingAttendanceLatestDay: fixed.filter(
        (r) =>
          !isMarked(r.attendanceStatus) &&
          (!latestFixedDay || dayKey(r.attendanceDate) === latestFixedDay),
      ).length,
    },
    dailyFixedOnTime,
    fixedVendorPerf,
    adhocVendorPerf,
    requested,
    confirmedNotArrived,
    missingAttendance,
    matchedFixed,
    matchedAdhoc,
  };
}

const SYSTEM = `You are the in-app fleet analyst for the Delhivery Intracity Fleet executive app.
You answer questions about the signed-in Fleet DRI's own area of responsibility (AOR) only, using ONLY the JSON context provided.

Rules:
- Be concise and mobile-friendly: short sentences, compact markdown, use bullets and bold numbers.
- Always quote real numbers from the context. Never invent vehicles, tickets, vendors, centers or percentages.
- If the context does not contain the answer, say so and suggest what filter/tab to check.
- Definitions: Fixed on-time % = status "On-time" / total attendance rows. Adhoc reporting breach % = ontime_placement "Delayed" / total tickets. Axle app % = bid_origin containing "axle" / total tickets. "Missing attendance" = attendance not marked for the latest data day.
- When you mention specific vehicles, contracts or tickets, add them to "refs" so the user can tap through to the detail screen.

Reply as strict JSON only, matching:
{"answer": "markdown string", "refs": [{"kind": "vehicle" | "ticket", "id": "string", "label": "string"}]}
Max 6 refs. ids must be exact values from the context (vehicle number or ticket number).`;

export const askFleetAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data }): Promise<AskResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI is not configured for this app yet." };

    let fixed: FixedRow[] = [];
    let adhoc: AdhocRow[] = [];
    try {
      const payload = await getFleetData();
      const target = norm(data.dri);
      fixed = payload.fixed.filter((r) => norm(r.fleetDri) === target);
      adhoc = payload.adhoc.filter((r) => norm(r.fleetDri) === target);
    } catch (err) {
      console.error("[ask] fleet data load failed", err);
      return { ok: false, error: "Could not load fleet data right now. Please retry in a minute." };
    }

    if (fixed.length === 0 && adhoc.length === 0) {
      return {
        ok: false,
        error: `No rows found in your AOR for "${data.dri}". Try logging in with the exact DRI name from the dataset.`,
      };
    }

    const digest = buildDigest(fixed, adhoc, data.question);

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `Signed-in Fleet DRI: ${data.dri}\n\nQuestion: ${data.question}\n\nContext JSON:\n${JSON.stringify(digest)}`,
            },
          ],
        }),
      });
    } catch (err) {
      console.error("[ask] gateway request failed", err);
      return { ok: false, error: "Could not reach the AI service. Please try again." };
    }

    if (res.status === 429) {
      return { ok: false, error: "Too many requests right now — please retry in a moment." };
    }
    if (res.status === 402) {
      return { ok: false, error: "AI credits are exhausted. Please add credits to continue." };
    }
    if (!res.ok) {
      console.error("[ask] gateway error", res.status, await res.text());
      return { ok: false, error: "The AI service returned an error. Please try again." };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = body.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = JSON.parse(raw) as { answer?: string; refs?: AskRef[] };
      const refs = (parsed.refs ?? [])
        .filter((r) => r && typeof r.id === "string" && r.id.trim())
        .slice(0, 6)
        .map((r) => ({
          kind: r.kind === "ticket" ? ("ticket" as const) : ("vehicle" as const),
          id: r.id.trim(),
          label: (r.label || r.id).trim(),
        }));
      return { ok: true, answer: parsed.answer?.trim() || raw, refs };
    } catch {
      return { ok: true, answer: raw || "No answer produced. Please rephrase your question.", refs: [] };
    }
  });
