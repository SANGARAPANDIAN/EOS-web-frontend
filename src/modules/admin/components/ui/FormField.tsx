import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + error/hint row, pairs with react-hook-form-registered Input/Select/Textarea/DatePicker. */
export function FormField({ label, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-bold text-admin-primary">{label}</div>
      {children}
      {error ? (
        <div className="mt-1.5 text-[13px] text-admin-danger">{error}</div>
      ) : hint ? (
        <div className="mt-1.5 text-[13px] text-admin-muted">{hint}</div>
      ) : null}
    </div>
  );
}
