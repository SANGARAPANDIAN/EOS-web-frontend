export function MonthlyBars({ data, formatValue }: { data: { month: string; value: number | null }[]; formatValue: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value ?? 0), 1);
  return (
    <div className="flex h-[150px] items-end justify-between gap-2.5">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[11px] font-bold text-subtle">{d.value != null ? formatValue(d.value) : "—"}</span>
          <div
            className="w-full max-w-9 rounded-t-[8px] bg-primary"
            style={{ height: `${d.value != null ? Math.max(4, (d.value / max) * 110) : 2}px` }}
          />
          <span className="text-[11px] font-bold text-subtle">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

/** Breadcrumb trail for a top-level list page — matches the design's `page.crumbList` exactly (last segment bold/navy, earlier ones muted). */
export function PageCrumbs({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((label, i) => (
        <span key={label} className="flex items-center gap-2">
          <span className={i === items.length - 1 ? "text-[13px] font-extrabold text-primary" : "text-[13px] font-semibold text-subtle"}>{label}</span>
          {i < items.length - 1 && <span className="text-[12px] text-border-default">/</span>}
        </span>
      ))}
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="hover-lift rounded-card border border-border-default bg-surface p-[18px_20px]">
      <div className="text-[13px] font-bold text-muted">{label}</div>
      <div className="mt-2 text-[26px] font-extrabold text-ink">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-subtle">{sub}</div>}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterBarFooter({
  rangeStart,
  rangeEnd,
  total,
  onClear,
  clickable = true,
}: {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onClear: () => void;
  /** Set false for a list with no row-click detail view — omits the "Select any row..." hint. */
  clickable?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-divider pt-4">
      <span className="text-[12.5px] text-subtle">
        Showing {rangeStart}–{rangeEnd} of {total} records{clickable ? " · Select any row to open the full profile" : ""}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="h-9 rounded-[9px] border border-border-default bg-surface px-3.5 text-[12.5px] font-bold text-ink hover:bg-surface-tint"
      >
        Clear filters
      </button>
    </div>
  );
}

export function Pager({ page, pageCount, onPrev, onNext }: { page: number; pageCount: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <button
        type="button"
        disabled={page === 0}
        onClick={onPrev}
        className="h-9 rounded-[9px] border border-border-default bg-surface px-3.5 text-[12.5px] font-bold text-ink disabled:opacity-40 hover:bg-surface-tint"
      >
        Previous
      </button>
      <span className="text-[12.5px] text-muted">
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        disabled={page >= pageCount - 1}
        onClick={onNext}
        className="h-9 rounded-[9px] border border-border-default bg-surface px-3.5 text-[12.5px] font-bold text-ink disabled:opacity-40 hover:bg-surface-tint"
      >
        Next
      </button>
    </div>
  );
}
