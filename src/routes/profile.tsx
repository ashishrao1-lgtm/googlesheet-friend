import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronLeft, LogOut, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { FeedbackSheet } from "@/components/FeedbackSheet";
import { ThemeToggle } from "@/components/ThemeToggle";


import { clearSession, formatDateTime, type FleetSession } from "@/lib/session";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile · Fleet Executive" },
      { name: "description", content: "Fleet executive account and session details." },
      { property: "og:title", content: "Profile · Fleet Executive" },
      { property: "og:description", content: "Fleet executive account and session details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return <AuthGate>{(s) => <ProfilePage session={s} />}</AuthGate>;
}

function ProfilePage({ session }: { session: FleetSession }) {
  const navigate = useNavigate();
  function signOut() {
    clearSession();
    navigate({ to: "/login" });
  }

  const initials = session.dri
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-surface/95 px-4 pt-4 pb-3 backdrop-blur">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-base font-semibold">Profile</h1>
      </div>

      <section className="px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {initials || <UserIcon className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{session.dri}</div>
            <div className="text-xs text-muted-foreground">Fleet DRI</div>
          </div>
        </div>
      </section>

      <section className="mt-4 px-4">
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
          <InfoRow label="Signed in at" value={formatDateTime(session.loginAt)} />
          <InfoRow
            label="Previous login"
            value={session.previousLoginAt ? formatDateTime(session.previousLoginAt) : "First session"}
          />
        </div>
      </section>

      <section className="mt-4 px-4">
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
          <ThemeToggle />
          <NotificationToggle />
        </div>
      </section>


      <section className="mt-4 space-y-3 px-4">
        <FeedbackSheet reporterName={session.dri} />
        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-semibold shadow-sm"
          style={{ color: "var(--color-destructive)" }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </section>


      <BottomNav />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
    setEnabled(localStorage.getItem("fleet-alerts") === "on" && Notification.permission === "granted");
  }, []);

  async function toggle() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      const next = !enabled;
      setEnabled(next);
      localStorage.setItem("fleet-alerts", next ? "on" : "off");
    } else {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "granted") {
        setEnabled(true);
        localStorage.setItem("fleet-alerts", "on");
      } else {
        setEnabled(false);
        localStorage.setItem("fleet-alerts", "off");
      }
    }
  }

  if (typeof Notification === "undefined") {
    return (
      <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
        <span>Push alerts not supported on this device.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <div className="flex items-center gap-2.5">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="font-medium">Enable alerts</div>
          <div className="text-[11px] text-muted-foreground">
            {permission === "granted" && enabled ? "On · browser notifications active"
              : permission === "denied" ? "Blocked in browser settings"
              : "Get notified about new tickets & attendance"}
          </div>
        </div>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: enabled ? "var(--color-primary)" : "var(--color-muted)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
          style={{ left: enabled ? "calc(100% - 1.375rem)" : "0.125rem" }}
        />
      </button>
    </div>
  );
}
