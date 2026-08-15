import type { Category } from "@/modules/admin/config/admissionWizardSections";

interface ProgressBarProps {
  current: number;
  categories: Category[];
  dataCategoryCount: number;
  saved: Set<string>;
  isSavingDraft: boolean;
}

/** Top strip showing which category is open and how many of the data categories have been saved overall. */
export function ProgressBar({ current, categories, dataCategoryCount, saved, isSavingDraft }: ProgressBarProps) {
  const pct = Math.round((saved.size / dataCategoryCount) * 100);
  const cat = categories[current];
  return (
    <div className="mt-4 rounded-admin-card border border-admin-border bg-admin-canvas px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-admin-muted">
              {current + 1} / {categories.length}
            </span>
            <span className="text-sm font-bold text-admin-ink">{cat.label}</span>
            <span className="text-xs text-admin-subtle">{cat.table}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full max-w-xs rounded-admin-pill bg-admin-tint-deep">
            <div className="h-1.5 rounded-admin-pill bg-admin-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-admin-muted">
          {isSavingDraft && <span>Saving progress…</span>}
          <span>
            <span className="font-bold text-admin-body">{saved.size}</span> / {dataCategoryCount} categories saved
          </span>
        </div>
      </div>
    </div>
  );
}
