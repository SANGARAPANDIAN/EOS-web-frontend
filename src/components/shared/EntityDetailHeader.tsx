import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export interface EntityDetailField {
  label: string;
  value: ReactNode;
}

interface EntityDetailHeaderProps {
  /** The Avatar/ProfilePhoto (plus any caption under it, e.g. a code) — callers own their own avatar markup since it varies per entity. */
  avatar: ReactNode;
  title: string;
  badge?: ReactNode;
  /** Primary action(s), e.g. an Edit button — rendered as their own cluster on the right of the title row, not squeezed in next to the name/badge. */
  actions?: ReactNode;
  subtitle?: ReactNode;
  fields: EntityDetailField[];
  /** Extra content rendered below the fields grid, still inside the same card (e.g. a status-dependent action row). */
  children?: ReactNode;
}

/**
 * The "identity card" at the top of a detail page — avatar, name + status
 * badge, primary action(s), a subtitle line, and a small key/value grid.
 * Used to be hand-rolled independently per page (HR's faculty detail,
 * sports-admin's trial/athlete/coach details) with the action button
 * crammed into the same inline flex row as the name and badge, which
 * crowds awkwardly once the name runs long. Actions now get their own
 * cluster on the right of the row (wrapping onto their own line on narrow
 * viewports instead of squeezing against the badge).
 */
export function EntityDetailHeader({ avatar, title, badge, actions, subtitle, fields, children }: EntityDetailHeaderProps) {
  return (
    <Card className="flex gap-6 p-6">
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-extrabold tracking-[-.02em] text-ink">{title}</h1>
            {badge}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {subtitle && <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p>}
        {fields.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {fields.map((f) => (
              <div key={f.label} className="rounded-card-sm border border-border-default bg-surface-muted p-3">
                <div className="text-[10px] font-extrabold tracking-[.07em] text-subtle uppercase">{f.label}</div>
                <div className="mt-1 truncate text-[14.5px] font-bold text-ink">{f.value}</div>
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </Card>
  );
}
