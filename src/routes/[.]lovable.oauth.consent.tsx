import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

// The supabase.auth.oauth namespace is beta; keep a narrow local typing.
type OAuthDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the Supabase client reads its session from localStorage.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: ({ search }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return { needsAuth: true as const, details: null };
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return {
      needsAuth: false as const,
      details: data,
      email: sessionData.session.user.email ?? "",
    };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Shell>
      <p className="text-sm text-destructive">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-5">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
        {children}
      </div>
    </main>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (!("redirected" in result && result.redirected)) onDone();
  }

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Sign in to continue</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in with your company account to authorize this connection.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={google}
        className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
      >
        Continue with Google
      </button>
      <form onSubmit={signIn} className="space-y-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@delhivery.com"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

function Consent() {
  const loaded = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (reload > 0) window.location.reload();
  }, [reload]);


  if (loaded.needsAuth) {
    return (
      <Shell>
        <SignIn onDone={() => setReload((n) => n + 1)} />
      </Shell>
    );
  }

  const clientName = loaded.details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Connect {clientName} to Intracity Fleet
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as {loaded.email || "your account"}.
        </p>
      </div>
      <p className="text-sm text-foreground">
        {clientName} will be able to call this app's fleet tools while you are signed in — reading
        pending attendance, adhoc tickets, vendor performance, and writing follow-up actions.
      </p>
      {loaded.details?.client?.redirect_uri && (
        <p className="text-[11px] text-muted-foreground">
          Redirects to {loaded.details.client.redirect_uri}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        This does not bypass this app's permissions or backend policies.
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground disabled:opacity-60"
        >
          Cancel connection
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Working…" : "Approve"}
        </button>
      </div>
    </Shell>
  );
}
