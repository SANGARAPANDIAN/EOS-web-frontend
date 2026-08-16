"use client";

import { Icon } from "@/components/ui/Icon";
import { Checkbox, Input, Select, Textarea } from "@/modules/admin/components/ui";
import { vkey } from "@/modules/admin/lib/admission-wizard";
import type { FieldSpec } from "@/modules/admin/config/admissionWizardSections";

const ERROR_CLASS = "border-admin-danger-border focus:border-admin-danger";

interface FieldRowProps {
  categoryId: string;
  field: FieldSpec;
  value: string;
  error?: string;
  lookupOptions?: Array<{ value: string; label: string }>;
  onChange: (val: string, clears?: string[]) => void;
  wide?: boolean;
}

/** Renders a single FieldSpec as a control — disabled/readonly/bool/select/lookup/textarea, or a plain text-family Input. */
export function FieldRow({ categoryId, field, value, error, lookupOptions, onChange, wide }: FieldRowProps) {
  if (field.type === "disabled") {
    return (
      <div className={wide ? "sm:col-span-2" : undefined}>
        <label className="text-sm font-medium text-admin-border-hover">{field.label}</label>
        <div
          className="mt-1.5 flex items-start gap-2 rounded-admin-md border border-dashed border-admin-border bg-admin-tint px-3 py-2 text-xs text-admin-muted"
          title={field.disabledReason}
        >
          <Icon name="warning" size={14} className="mt-0.5 shrink-0" />
          <span>{field.disabledReason}</span>
        </div>
      </div>
    );
  }

  if (field.type === "readonly") {
    return (
      <div className={wide ? "sm:col-span-2" : undefined}>
        <label className="text-sm font-medium text-admin-ink">{field.label}</label>
        <div className="mt-1.5 rounded-admin-control border border-admin-divider bg-admin-tint px-3 py-2 text-sm text-admin-body">
          {field.readonlyValue}
        </div>
        {field.hint && <p className="mt-1 text-xs text-admin-muted">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === "bool") {
    return (
      <label className="flex items-start gap-2.5 sm:col-span-2">
        <Checkbox checked={value === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "false")} className="mt-0.5" />
        <span className="text-sm text-admin-body">{field.label}</span>
      </label>
    );
  }

  const id = `f-${vkey(categoryId, field.key)}`;

  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="text-sm font-medium text-admin-ink">
        {field.label}
        {field.required && <span className="ml-0.5 text-admin-danger">*</span>}
      </label>
      <div className="mt-1.5">
        {field.type === "textarea" ? (
          <Textarea
            id={id}
            rows={3}
            value={value}
            maxLength={field.max}
            onChange={(e) => onChange(e.target.value)}
            className={error ? ERROR_CLASS : undefined}
          />
        ) : field.type === "select" ? (
          <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full ${error ? ERROR_CLASS : ""}`}>
            <option value="">Select {field.label.toLowerCase()}</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        ) : field.type === "lookup" ? (
          <Select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value, field.key === "department" ? ["course"] : [])}
            className={`w-full ${error ? ERROR_CLASS : ""}`}
          >
            <option value="">
              {(lookupOptions ?? []).length ? `Select ${field.label.toLowerCase()}` : "Nothing to choose from yet"}
            </option>
            {(lookupOptions ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            id={id}
            type={
              field.type === "date"
                ? "date"
                : field.type === "email"
                  ? "email"
                  : field.type === "tel"
                    ? "tel"
                    : field.type === "password"
                      ? "password"
                      : "text"
            }
            value={value}
            maxLength={field.type === "text" || field.type === "password" ? field.max : undefined}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={field.type === "password" ? "new-password" : undefined}
            className={error ? ERROR_CLASS : undefined}
          />
        )}
      </div>
      {field.hint && !error && <p className="mt-1 text-xs text-admin-muted">{field.hint}</p>}
      {error && <p className="mt-1 text-xs text-admin-danger">{error}</p>}
    </div>
  );
}
