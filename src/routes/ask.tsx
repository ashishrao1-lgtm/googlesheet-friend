import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Sparkles, Send, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { askFleetAI, type AskRef } from "@/lib/ask.functions";
import type { FleetSession } from "@/lib/session";

export const Route = createFileRoute("/ask")({
  head: () => ({
    meta: [
      { title: "Ask AI · Delhivery Intracity Fleet" },
      {
        name: "description",
        content:
          "Ask questions about your fleet data — tickets, contracts, vendor on-time performance — and jump straight to the record.",
      },
      { property: "og:title", content: "Ask AI · Delhivery Intracity Fleet" },
      {
        property: "og:description",
        content:
          "Ask questions about your fleet data and jump straight to the ticket or contract that needs action.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AskRoute,
});

function AskRoute() {
  return <AuthGate>{(s) => <AskPage session={s} />}</AuthGate>;
}

type Turn =
  | { role: "user"; text: string }
  | { role: "ai"; text: string; refs: AskRef[] }
  | { role: "error"; text: string };

const SUGGESTIONS = [
  "Which vendors have the worst on-time % this month?",
  "How many fixed vehicles are yet to mark in today?",
  "Show adhoc tickets still in requested status",
  "What is my reporting breach % and axle app adoption?",
];

export function AskPage({ session }: { session: FleetSession }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (question: string) => askFleetAI({ data: { question, dri: session.dri } }),
    onSuccess: (res) => {
      setTurns((t) =>
        t.concat(
          res.ok
            ? { role: "ai", text: res.answer, refs: res.refs }
            : { role: "error", text: res.error },
        ),
      );
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    onError: () =>
      setTurns((t) => t.concat({ role: "error", text: "Something went wrong. Please try again." })),
  });

  function send(question: string) {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setTurns((t) => t.concat({ role: "user", text: q }));
    setInput("");
    ask.mutate(q);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-40">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/95 px-4 pt-5 pb-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 50%, #3b82f6))",
            }}
          >
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">Ask AI</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              Answers from your AOR data · {session.dri}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-3 px-4 pt-4">
        {turns.length === 0 && (
          <div className="animate-rise rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-sm font-medium">Ask anything about your fleet data</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vendor performance, pending attendance, requested tickets, a specific vehicle or ticket
              number — tap a suggestion to start.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-[11px] font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <TurnBubble key={i} turn={t} />
        ))}

        {ask.isPending && (
          <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading your fleet data…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="fixed inset-x-0 bottom-[68px] z-40 mx-auto max-w-md px-4 pb-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tickets, contracts, vendors…"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || ask.isPending}
            aria-label="Send question"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="animate-rise flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm">
          {turn.text}
        </p>
      </div>
    );
  }

  if (turn.role === "error") {
    return (
      <div className="animate-rise flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{turn.text}</span>
      </div>
    );
  }

  return (
    <div className="animate-rise rounded-2xl rounded-bl-md bg-card p-3.5 shadow-sm">
      <MiniMarkdown text={turn.text} />
      {turn.refs.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open record
          </p>
          {turn.refs.map((r) => (
            <Link
              key={`${r.kind}-${r.id}`}
              to="/vehicle/$id"
              params={{ id: r.id }}
              className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs font-medium transition-colors hover:text-primary active:scale-[0.99]"
            >
              <span className="truncate">
                <span className="text-muted-foreground">
                  {r.kind === "ticket" ? "Ticket " : "Vehicle "}
                </span>
                {r.label}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Lightweight markdown: headings, bullets, bold. Keeps the bundle small.
function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (/^#{1,6}\s/.test(trimmed)) {
          return (
            <p key={i} className="text-sm font-semibold">
              {inline(trimmed.replace(/^#{1,6}\s/, ""))}
            </p>
          );
        }
        if (/^([-*•]|\d+\.)\s/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2 pl-0.5 text-sm">
              <span className="text-primary">•</span>
              <span>{inline(trimmed.replace(/^([-*•]|\d+\.)\s/, ""))}</span>
            </p>
          );
        }
        return <p key={i}>{inline(trimmed)}</p>;
      })}
    </div>
  );
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
