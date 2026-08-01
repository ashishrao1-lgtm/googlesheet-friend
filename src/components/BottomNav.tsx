import { Link, useLocation } from "@tanstack/react-router";
import { Home, MapPin, BarChart3, User } from "lucide-react";

// Home is intentionally centered as a raised FAB — it's the primary action.
export function BottomNav() {
  const { pathname } = useLocation();
  const homeActive = pathname === "/";
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
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-4 ring-card transition-all duration-200 ease-out group-hover:shadow-xl group-active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 55%, var(--color-info, #3b82f6)))",
                color: "var(--color-primary-foreground)",
              }}
            >
              <Home className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <span
              className="mt-1.5 text-[11px] font-semibold tracking-tight transition-colors"
              style={{ color: homeActive ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
            >
              Home
            </span>

          </Link>
        </li>

        <NavItem to="/profile" label="Profile" icon={User} active={pathname === "/profile"} />
        <li aria-hidden />
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
  to: "/tracking" | "/performance" | "/profile";
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <li className="flex justify-center">
      <Link
        to={to}
        className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium text-muted-foreground data-[active=true]:text-foreground"
        data-active={active}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
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
