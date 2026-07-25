import { useEffect, useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { EMPTY_FILTERS, activeCount, type FilterState } from "@/lib/filters";

export type FilterOptions = {
  states: string[];
  zones: string[];
  cities: string[];
  vendors: string[];
  centers: string[];
  facilityTypes: string[];
  statuses: string[];
};

export function FilterButton({
  filters,
  onClick,
}: {
  filters: FilterState;
  onClick: () => void;
}) {
  const count = activeCount(filters);
  return (
    <button
      onClick={onClick}
      className="relative flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold shadow-sm"
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filters
      {count > 0 && (
        <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterSheet({
  open,
  onClose,
  filters,
  onApply,
  options,
  statusLabel = "Status",
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  options: FilterOptions;
  statusLabel?: string;
}) {
  const [draft, setDraft] = useState<FilterState>(filters);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  if (!open) return null;

  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md rounded-t-3xl bg-card p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Filters</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-secondary">
            <X className="mx-auto h-4 w-4" />
          </button>
        </div>

        <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pb-2">
          <Select label="State" value={draft.state} onChange={(v) => set("state", v)} options={options.states} />
          <Select label="Zone" value={draft.zone} onChange={(v) => set("zone", v)} options={options.zones} />
          <Select label="City" value={draft.city} onChange={(v) => set("city", v)} options={options.cities} />
          <Select label="Vendor" value={draft.vendor} onChange={(v) => set("vendor", v)} options={options.vendors} />
          <Select label="Center" value={draft.center} onChange={(v) => set("center", v)} options={options.centers} full />
          <Select
            label="Facility Type"
            value={draft.facilityType}
            onChange={(v) => set("facilityType", v)}
            options={options.facilityTypes}
          />
          <Select
            label={statusLabel}
            value={draft.status}
            onChange={(v) => set("status", v)}
            options={options.statuses}
          />
          <DateInput label="From" value={draft.dateFrom} onChange={(v) => set("dateFrom", v)} />
          <DateInput label="To" value={draft.dateTo} onChange={(v) => set("dateTo", v)} />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setDraft(EMPTY_FILTERS)}
            className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold"
          >
            Reset
          </button>
          <button
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none"
      />
    </label>
  );
}
