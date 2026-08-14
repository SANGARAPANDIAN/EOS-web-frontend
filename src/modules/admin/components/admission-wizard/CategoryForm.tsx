"use client";

import { FieldRow } from "@/modules/admin/components/admission-wizard/FieldRow";
import { isFieldVisible, isGroupVisible, vkey, type LookupOptions } from "@/modules/admin/lib/admission-wizard";
import type { Category } from "@/modules/admin/config/admissionWizardSections";

interface CategoryFormProps {
  category: Category;
  values: Record<string, string>;
  errors: Record<string, string>;
  lookupOptions: LookupOptions;
  setValue: (categoryId: string, fieldKey: string, val: string, clears?: string[]) => void;
}

/** Generic field-grid renderer for a category's groups — the wizard's main body for every category that isn't a repeat/checklist/disabled/review special case. */
export function CategoryForm({ category, values, errors, lookupOptions, setValue }: CategoryFormProps) {
  return (
    <div className="flex flex-col gap-6">
      {(category.groups ?? [])
        .filter((g) => isGroupVisible(category, g, values))
        .map((group, gi) => (
          <div key={gi}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-admin-body">{group.label}</h3>
              {group.copyFromPrefix && (
                <button
                  type="button"
                  className="text-xs font-semibold text-admin-primary hover:text-admin-primary-dark"
                  onClick={() => {
                    group.fields.forEach((f) => {
                      if (!f.key.startsWith(group.copyFromPrefix!.to)) return;
                      const fromKey = group.copyFromPrefix!.from + f.key.slice(group.copyFromPrefix!.to.length);
                      const v = values[vkey(category.id, fromKey)] ?? "";
                      setValue(category.id, f.key, v);
                    });
                  }}
                >
                  {group.copyFromPrefix.label}
                </button>
              )}
            </div>
            {group.hint && <p className="mb-3 text-xs text-admin-muted">{group.hint}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.fields
                .filter((f) => isFieldVisible(category, f, values))
                .map((field) => (
                  <FieldRow
                    key={field.key}
                    categoryId={category.id}
                    field={field}
                    value={values[vkey(category.id, field.key)] ?? field.defaultValue ?? ""}
                    error={errors[vkey(category.id, field.key)]}
                    lookupOptions={field.lookup ? lookupOptions[field.lookup] : field.key === "department" ? lookupOptions.department : undefined}
                    onChange={(val, clears) => setValue(category.id, field.key, val, clears)}
                    wide={field.type === "textarea" || field.type === "bool"}
                  />
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
