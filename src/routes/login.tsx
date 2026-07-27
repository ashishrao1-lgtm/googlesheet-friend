import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { listDris, verifyLogin } from "@/lib/auth.functions";
import { getSession, setSession } from "@/lib/session";
import loginHero from "@/assets/login-hero.jpg";

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

function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function LoginPage() {
  const navigate = useNavigate();
  const [dri, setDri] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dris, setDris] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/" });
  }, [navigate]);

  useEffect(() => {
    listDris()
      .then((r) => setDris(r.dris ?? []))
      .catch(() => setDris([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = normalize(dri);
    if (!q) return dris.slice(0, 8);
    return dris
      .filter((d) => normalize(d).includes(q))
      .slice(0, 8);
  }, [dri, dris]);

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
      setSession(res.dri || dri);
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

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-900">Sign In</h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your credentials to access your area dashboard
          </p>

          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Username
            </span>
            <div className="relative">
              <input
                value={dri}
                onChange={(e) => setDri(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Start typing your name…"
                autoComplete="off"
                list="dri-list"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
                required
              />
              <datalist id="dri-list">
                {dris.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              {focused && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDri(d);
                        setFocused(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {dris.length > 0 && (
              <p className="mt-1 text-[10px] text-slate-400">
                {dris.length} names in roster · pick yours from suggestions
              </p>
            )}
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
