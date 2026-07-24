import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, LogOut, Bell, Settings } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile · Fleet Executive" },
      { name: "description", content: "Fleet executive account and preferences." },
      { property: "og:title", content: "Profile · Fleet Executive" },
      { property: "og:description", content: "Fleet executive account and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
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
            FE
          </div>
          <div>
            <div className="text-base font-semibold">Fleet Executive</div>
            <div className="text-xs text-muted-foreground">exec@fleet.local</div>
          </div>
        </div>
      </section>

      <section className="mt-4 px-4">
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-sm">
          <Row icon={<Bell className="h-4 w-4" />} label="Notifications" />
          <Row icon={<Settings className="h-4 w-4" />} label="Preferences" />
          <Row icon={<LogOut className="h-4 w-4" />} label="Sign out" tone="danger" />
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

function Row({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "danger";
}) {
  return (
    <button
      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
      style={{ color: tone === "danger" ? "var(--color-destructive)" : undefined }}
    >
      <span className="flex items-center gap-2 font-medium">
        {icon}
        {label}
      </span>
      <span className="text-muted-foreground">›</span>
    </button>
  );
}
