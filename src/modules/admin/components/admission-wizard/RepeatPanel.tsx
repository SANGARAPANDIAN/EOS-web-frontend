"use client";

import { Icon } from "@/components/ui/Icon";
import { Button, Input } from "@/modules/admin/components/ui";
import type { Category } from "@/modules/admin/config/admissionWizardSections";

interface RepeatPanelProps {
  spec: NonNullable<Category["repeat"]>;
  marks: string[];
  setMarks: (fn: (m: string[]) => string[]) => void;
}

/** Add/remove-rows editor for the "Identity marks" category — the wizard's only repeating field. */
export function RepeatPanel({ spec, marks, setMarks }: RepeatPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {marks.map((desc, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-admin-muted">
              {spec.rowLabel} {i + 1}
            </span>
            <Input
              value={desc}
              maxLength={spec.fieldMax}
              placeholder={spec.fieldPlaceholder}
              onChange={(e) =>
                setMarks((m) => {
                  const next = [...m];
                  next[i] = e.target.value;
                  return next;
                })
              }
            />
            {marks.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${spec.rowLabel} ${i + 1}`}
                onClick={() => setMarks((m) => m.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
              >
                <Icon name="delete" size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {marks.length < spec.max ? (
          <Button variant="secondary" size="sm" onClick={() => setMarks((m) => [...m, ""])}>
            <Icon name="add" size={16} /> {spec.addLabel}
          </Button>
        ) : (
          <span className="text-xs text-admin-muted">{spec.note}</span>
        )}
      </div>
    </div>
  );
}
