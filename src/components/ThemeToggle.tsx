import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";

import { applyTheme, getStoredTheme, setTheme, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: SunMoon },
];

/** Segmented light / dark / system control. Persists the user's explicit choice. */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = getStoredTheme();
    setChoice(stored);
    applyTheme(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function pick(next: ThemeChoice) {
    setChoice(next);
    setTheme(next);
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-sm font-medium">Appearance</div>
        <div className="text-xs text-muted-foreground">Choose light, dark or follow device</div>
      </div>
      <div
        role="radiogroup"
        aria-label="Appearance"
        className="flex items-center gap-1 rounded-full bg-secondary p-1"
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = choice === value;
          return (
            <button
              key={value}
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => pick(value)}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95"
              style={{
                background: active ? "var(--color-card)" : "transparent",
                color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
                boxShadow: active ? "var(--shadow-card)" : undefined,
              }}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
