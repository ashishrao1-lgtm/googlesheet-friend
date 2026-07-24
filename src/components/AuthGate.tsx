import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getSession, type FleetSession } from "@/lib/session";

export function AuthGate({ children }: { children: (session: FleetSession) => ReactNode }) {
  const navigate = useNavigate();
  const [session, setSessionState] = useState<FleetSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/login" });
      return;
    }
    setSessionState(s);
    setReady(true);
  }, [navigate]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-xs text-muted-foreground">Loading…</div>
      </div>
    );
  }
  return <>{children(session)}</>;
}
