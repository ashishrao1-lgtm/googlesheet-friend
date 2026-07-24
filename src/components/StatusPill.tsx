import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const toneStyles: Record<Tone, string> = {
  success: "bg-[color-mix(in_oklch,var(--color-success)_16%,transparent)] text-[color:var(--color-success)]",
  warning: "bg-[color-mix(in_oklch,var(--color-warning)_20%,transparent)] text-[oklch(0.45_0.14_65)]",
  danger: "bg-[color-mix(in_oklch,var(--color-destructive)_14%,transparent)] text-[color:var(--color-destructive)]",
  info: "bg-[color-mix(in_oklch,var(--color-info)_14%,transparent)] text-[color:var(--color-info)]",
  muted: "bg-muted text-muted-foreground",
};

export function StatusPill({
  tone = "muted",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneStyles[tone]}`}
    >
      {children}
    </span>
  );
}

export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (s.includes("on-time") || s.includes("completed") || s.includes("marked")) return "success";
  if (s.includes("delay")) return "warning";
  if (s.includes("cancel") || s.includes("fail") || s.includes("miss")) return "danger";
  if (s.includes("open") || s.includes("progress") || s.includes("assigned")) return "info";
  return "muted";
}
