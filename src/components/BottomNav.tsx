import { Link, useLocation } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Home, MapPin, BarChart3, User, Sparkles } from "lucide-react";

import { getFleetData } from "@/lib/fleet.functions";
import { getSession } from "@/lib/session";
import { computeOpenAlerts } from "@/lib/alerts";

function fleetQueryOptions() {
  return queryOptions({
    queryKey: ["fleet-data"],
    queryFn: () => getFleetData(),
    staleTime: 5 * 60_000,
  });
}

// Home is intentionally centered as a raised FAB — it's the primary action.
// Shows a count badge for total open alerts in the signed-in DRI's AOR.
export function BottomNav() {
  const { pathname } = useLocation();
  const homeActive = pathname === "/";

  // Non-suspense: the cache is primed by each page's loader; this just reads it.
  const { data } = useQuery(fleetQueryOptions());
  let badge = 0;
  const session = getSession();
  if (data && session) {
    const open = computeOpenAlerts(data.fixed, data.adhoc, session.dri);
    badge = Math.min(99, open.adhoc.length + open.fixed.length);
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <ul className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2 pb-2.5">

        <NavItem to="/tracking" label="Tracking" icon={MapPin} active={pathname === "/tracking"} />
        <NavItem to="/performance" label="Performance" icon={BarChart3} active={pathname === "/performance"} />

        {/* Center raised Home FAB */}
        <li className="flex justify-center">
          <Link
            to="/"
            data-active={homeActive}
            aria-label="Home"
            className="group -mt-8 flex flex-col items-center"
          >
            <span
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-lg ring-4 ring-card transition-all duration-200 ease-out group-hover:shadow-xl group-active:scale-95"
            >

              <Home className="h-6 w-6" strokeWidth={2.4} />
              {badge > 0 && (
                <span
                  className="badge-pulse absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-md"
                  style={{ background: "var(--color-destructive)" }}
                >
                  {badge}
                </span>
              )}
            </span>
            <span
              className="mt-1.5 text-[11px] font-semibold tracking-tight transition-colors"
              style={{ color: homeActive ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
            >
              Home
            </span>

          </Link>
        </li>

        <NavItem to="/ask" label="Ask AI" icon={Sparkles} active={pathname === "/ask"} />
        <NavItem to="/profile" label="Profile" icon={User} active={pathname === "/profile"} />
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: "/tracking" | "/performance" | "/profile" | "/ask";
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <li className="flex justify-center">
      <Link
        to={to}
        className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium tracking-tight text-muted-foreground transition-colors duration-200 hover:text-foreground active:scale-95 data-[active=true]:text-foreground"

        data-active={active}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-out"
          style={{
            background: active
              ? "color-mix(in oklch, var(--color-primary) 15%, transparent)"
              : "transparent",
            color: active ? "var(--color-primary)" : undefined,
          }}
        >
          <Icon size={18} />
        </span>
        {label}
      </Link>
    </li>
  );
}
