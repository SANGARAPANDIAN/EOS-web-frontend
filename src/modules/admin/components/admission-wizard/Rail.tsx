"use client";

import { Icon } from "@/components/ui/Icon";
import { categoryStats } from "@/modules/admin/lib/admission-wizard";
import { CATEGORY_ICONS } from "@/modules/admin/components/admission-wizard/icons";
import type { Category } from "@/modules/admin/config/admissionWizardSections";

interface RailProps {
  categories: Category[];
  current: number;
  values: Record<string, string>;
  marks: string[];
  saved: Set<string>;
  certificateTypeIds: number[];
  onSelect: (i: number) => void;
}

/** Left-hand category navigator — numbered/checked step chips plus a live "N of M filled" line per category. */
export function Rail({ categories, current, values, marks, saved, certificateTypeIds, onSelect }: RailProps) {
  return (
    <nav className="h-fit rounded-admin-card border border-admin-border bg-admin-canvas p-2">
      {categories.map((cat, i) => {
        const isSaved = saved.has(cat.id);
        const isCurrent = i === current;
        const stats = categoryStats(cat, values, marks, certificateTypeIds);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(i)}
            className={`flex w-full items-center gap-2.5 rounded-admin-md px-2.5 py-2 text-left text-sm transition-colors ${
              isCurrent ? "bg-admin-tint-strong text-admin-primary-deep" : "text-admin-body hover:bg-admin-tint"
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-admin-pill text-xs font-bold ${
                isSaved
                  ? "bg-admin-success-bg text-admin-success-fg"
                  : isCurrent
                    ? "bg-admin-tint-deep text-admin-primary-deep"
                    : "bg-admin-tint text-admin-muted"
              }`}
            >
              {isSaved ? <Icon name="check" size={14} /> : cat.review ? <Icon name={CATEGORY_ICONS[cat.id] ?? "help"} size={14} /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{cat.label}</span>
              <span className="block truncate text-xs text-admin-subtle">
                {cat.review ? "final step" : isSaved ? "saved" : stats.total ? `${stats.filled} of ${stats.total} filled` : "optional"}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
