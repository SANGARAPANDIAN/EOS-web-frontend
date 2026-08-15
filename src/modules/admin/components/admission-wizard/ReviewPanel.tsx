import { Icon } from "@/components/ui/Icon";
import { Button } from "@/modules/admin/components/ui";
import { categoryStats } from "@/modules/admin/lib/admission-wizard";
import type { Category } from "@/modules/admin/config/admissionWizardSections";

interface ReviewPanelProps {
  dataCategories: Category[];
  values: Record<string, string>;
  marks: string[];
  saved: Set<string>;
  onJump: (i: number) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

/** Final "Review & confirm" category body — per-category saved/unsaved grid, an outstanding-required-fields list, and the Perfect Entry submit action. */
export function ReviewPanel({ dataCategories, values, marks, saved, onJump, onConfirm, isSubmitting }: ReviewPanelProps) {
  const outstanding: string[] = [];
  dataCategories.forEach((cat) => {
    if (cat.repeat || cat.disabledStub) return;
    categoryStats(cat, values, marks).missingRequired.forEach((f) => outstanding.push(`${cat.label} — ${f.label}`));
  });
  const unsaved = dataCategories.filter((c) => !c.disabledStub && !saved.has(c.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {dataCategories.map((cat, i) => {
          const isSaved = saved.has(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onJump(i)}
              className={`flex items-center gap-2.5 rounded-admin-md border px-3 py-2 text-left text-sm ${
                isSaved ? "border-admin-success-border bg-admin-success-bg" : "border-admin-border bg-admin-canvas hover:bg-admin-tint"
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-admin-pill text-xs font-bold ${
                  isSaved ? "bg-admin-success-bg text-admin-success-fg" : "bg-admin-tint text-admin-muted"
                }`}
              >
                {isSaved ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-admin-ink">{cat.label}</span>
                <span className="block text-xs text-admin-subtle">{isSaved ? "saved" : "not saved"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {outstanding.length > 0 && (
        <div className="rounded-admin-md border border-admin-danger-border bg-admin-danger-bg p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-admin-danger-fg">
            <Icon name="warning" size={16} /> Required fields still empty ({outstanding.length})
          </div>
          <ul className="mt-2 list-inside list-disc text-sm text-admin-danger-fg">
            {outstanding.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-admin-md border border-admin-border bg-admin-tint p-4">
        <div className="font-bold text-admin-ink">Complete the profile</div>
        <p className="mt-1 text-sm text-admin-muted">
          Writes the student record from this already-confirmed application. Categories shown disabled above
          (Document checklist, Online profiles, and any field marked &ldquo;Not available&rdquo;) are not written by
          the current backend.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="primary" onClick={onConfirm} disabled={outstanding.length > 0 || isSubmitting}>
            <Icon name="how_to_reg" size={18} /> {isSubmitting ? "Completing…" : "Complete profile"}
          </Button>
        </div>
        {(outstanding.length > 0 || unsaved.length > 0) && (
          <p className="mt-2 text-xs text-admin-muted">
            {unsaved.length > 0 && `${unsaved.length} categor${unsaved.length === 1 ? "y" : "ies"} not saved yet. `}
            {outstanding.length > 0 && `${outstanding.length} required field(s) empty.`}
          </p>
        )}
      </div>
    </div>
  );
}
