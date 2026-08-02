import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, MessageSquarePlus, X } from "lucide-react";

import { submitFeedback } from "@/lib/feedback.functions";

type Category = "issue" | "idea" | "other";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "issue", label: "Report an issue" },
  { value: "idea", label: "Suggest an improvement" },
  { value: "other", label: "Something else" },
];

export function FeedbackSheet({ reporterName }: { reporterName: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("issue");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const send = useServerFn(submitFeedback);

  function close() {
    setOpen(false);
    setStatus("idle");
    setError(null);
    setMessage("");
    setCategory("issue");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError("Please add a few more details (at least 5 characters).");
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const res = await send({
        data: {
          reporterName,
          category,
          message: message.trim(),
          page: typeof window === "undefined" ? undefined : window.location.pathname,
        },
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("idle");
        setError(res.error);
      }
    } catch {
      setStatus("idle");
      setError("Network issue — please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]"
      >
        <MessageSquarePlus className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
        Send feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-0 pb-0 backdrop-blur-sm">
          <div
            className="animate-rise w-full max-w-md rounded-t-3xl bg-card p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Send feedback</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Report an issue or suggest an improvement — it reaches the fleet product team.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close feedback form"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === "sent" ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="h-9 w-9" style={{ color: "var(--color-success, #16a34a)" }} />
                <div className="text-sm font-semibold">Thanks — feedback received</div>
                <p className="text-xs text-muted-foreground">
                  We review every submission and will follow up if needed.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        data-active={category === c.value}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors data-[active=true]:border-transparent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback-message" className="text-xs font-medium text-muted-foreground">
                    Details
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                    rows={5}
                    maxLength={2000}
                    placeholder="What happened, or what would make this easier?"
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <div className="mt-1 text-right text-[11px] text-muted-foreground">
                    {message.length}/2000
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-medium" style={{ color: "var(--color-destructive)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
                >
                  {status === "sending" ? "Sending…" : "Submit feedback"}
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Submitted as {reporterName}
                </p>
              </form>
            )}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      )}
    </>
  );
}
