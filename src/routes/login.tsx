import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Truck } from "lucide-react";

import { getFleetData } from "@/lib/fleet.functions";
import { verifyLogin } from "@/lib/auth.functions";
import { getSession, setSession } from "@/lib/session";

function fleetQueryOptions() {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => getFleetData(),
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Fleet Executive" },
      {
        name: "description",
        content: "Fleet Executive sign in — access your assigned vehicle compliance dashboard.",
      },
      { property: "og:title", content: "Sign in · Fleet Executive" },
      {
        property: "og:description",
        content: "Fleet Executive sign in — access your assigned vehicle compliance dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQueryOptions()),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(fleetQueryOptions());
  const dris = useMemo(() => {
    const s = new Set<string>();
    data.fixed.forEach((r) => r.fleetDri && s.add(r.fleetDri));
    data.adhoc.forEach((r) => r.fleetDri && s.add(r.fleetDri));
    return Array.from(s).sort();
  }, [data]);

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-surface px-6">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Truck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold">Fleet Executive</h1>
        <p className="text-xs text-muted-foreground">
          Sign in to view your AOR compliance dashboard.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-card p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your name (Fleet DRI)
          </span>
          <input
            list="dri-options"
            value={dri}
            onChange={(e) => setDri(e.target.value)}
            placeholder="Start typing your name"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            required
          />
          <datalist id="dri-options">
            {dris.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            required
          />
        </label>

        {error && (
          <p className="text-xs font-medium text-[color:var(--color-destructive)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="pt-1 text-center text-[11px] text-muted-foreground">
          {dris.length} executives configured
        </p>
      </form>
    </div>
  );
}
