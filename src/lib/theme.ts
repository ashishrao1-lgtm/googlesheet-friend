export type ThemeChoice = "light" | "dark" | "system";

const KEY = "fleet-theme";

export function getStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = choice === "dark" || (choice === "system" && systemPrefersDark());
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(choice: ThemeChoice) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, choice);
  applyTheme(choice);
}

// Inlined in the document head so the correct palette paints before hydration.
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem('${KEY}')||'system';var d=c==='dark'||(c==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
