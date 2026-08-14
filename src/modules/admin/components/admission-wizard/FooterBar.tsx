import { Button } from "@/modules/admin/components/ui";
import type { CategoryStats } from "@/modules/admin/lib/admission-wizard";
import type { Category } from "@/modules/admin/config/admissionWizardSections";

interface FooterBarProps {
  current: number;
  category: Category;
  stats: CategoryStats;
  saved: boolean;
  onBack: () => void;
  onSkip: () => void;
  onSave: () => void;
  isLast: boolean;
}

/** Back / Skip / Save-and-continue action row under each non-review category panel. */
export function FooterBar({ current, category, stats, saved, onBack, onSkip, onSave, isLast }: FooterBarProps) {
  const isFirst = current === 0;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-admin-divider px-5 py-4">
      <span className="text-xs text-admin-muted">
        {saved
          ? "Saved"
          : stats.missingRequired.length
            ? `${stats.missingRequired.length} required field(s) to fill`
            : "Nothing required is missing"}
      </span>
      <div className="flex gap-2">
        {!isFirst && (
          <Button variant="text" onClick={onBack}>
            Back
          </Button>
        )}
        {!category.disabledStub && (
          <Button variant="text" onClick={onSkip} title="Leaves this category unsaved — the review step will list it.">
            Skip for now
          </Button>
        )}
        <Button variant="primary" onClick={onSave}>
          {isLast ? "Save" : saved ? "Save changes & continue" : "Save & continue"}
        </Button>
      </div>
    </div>
  );
}
