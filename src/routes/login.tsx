import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { verifyLogin } from "@/lib/auth.functions";
import { getSession, setSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Delhivery Intracity Fleet" },
      {
        name: "description",
        content: "Delhivery Intracity Fleet — Fleet Ops Monitoring Portal sign in.",
      },
      { property: "og:title", content: "Sign in · Delhivery Intracity Fleet" },
      {
        property: "og:description",
        content: "Delhivery Intracity Fleet — Fleet Ops Monitoring Portal sign in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [dri, setDri] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/" });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await verifyLogin({ data: { dri, password } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSession(dri);
      navigate({ to: "/" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: "oklch(0.18 0.03 260)" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Delhivery Intracity{" "}
            <span style={{ color: "oklch(0.62 0.24 25)" }}>Fleet</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">Fleet Ops Monitoring Portal</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-6 shadow-2xl"
        >
          <h2 className="text-lg font-bold text-slate-900">Sign In</h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your credentials to access your area dashboard
          </p>

          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Username
            </span>
            <input
              value={dri}
              onChange={(e) => setDri(e.target.value)}
              placeholder="e.g. suraj.singh"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
              required
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
              required
            />
          </label>

          {error && (
            <p className="mt-3 text-xs font-medium text-[color:var(--color-destructive)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "oklch(0.58 0.22 25)" }}
          >
            {submitting ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}
