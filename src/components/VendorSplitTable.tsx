export type VendorRow = {
  vendor: string;
  total: number;
  onTime: number;
  delayed: number;
  absent?: number;
};

export function VendorSplitTable({ rows, title }: { rows: VendorRow[]; title: string }) {
  if (rows.length === 0) {
    return (
      <div className="mt-2 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        No vendor data.
      </div>
    );
  }
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-[1.6fr_.5fr_.6fr_.6fr_.9fr] bg-secondary px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <div>{title}</div>
        <div className="text-right">Total</div>
        <div className="text-right text-[color:var(--color-success)]">On-time</div>
        <div className="text-right text-[oklch(0.55_0.16_65)]">Delayed</div>
        <div className="text-right">Compliance</div>
      </div>
      <div className="divide-y divide-border bg-card">
        {sorted.map((r) => {
          const pct = r.total === 0 ? 0 : Math.round((r.onTime / r.total) * 100);
          const color =
            pct >= 85 ? "var(--color-success)" : pct >= 65 ? "oklch(0.72 0.16 75)" : "var(--color-destructive)";
          return (
            <div
              key={r.vendor}
              className="grid grid-cols-[1.6fr_.5fr_.6fr_.6fr_.9fr] items-center px-2 py-2 text-[11px]"
            >
              <div className="truncate font-medium">{r.vendor || "—"}</div>
              <div className="text-right tabular-nums">{r.total}</div>
              <div className="text-right tabular-nums text-[color:var(--color-success)]">{r.onTime}</div>
              <div className="text-right tabular-nums text-[oklch(0.55_0.16_65)]">{r.delayed}</div>
              <div className="flex items-center justify-end gap-1.5">
                <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                  <div className="h-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="w-8 text-right font-semibold tabular-nums" style={{ color }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
