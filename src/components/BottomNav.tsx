import { Link, useLocation } from "@tanstack/react-router";
import { Home, MapPin, BarChart3, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tracking", label: "Tracking", icon: MapPin },
  { to: "/performance", label: "Performance", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex justify-center">
              <Link
                to={to}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium text-muted-foreground data-[active=true]:text-foreground"
                data-active={active}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                  style={{
                    background: active ? "var(--color-primary)" : "transparent",
                    color: active ? "var(--color-primary-foreground)" : undefined,
                  }}
                >
                  <Icon className="h-4.5 w-4.5" size={18} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
