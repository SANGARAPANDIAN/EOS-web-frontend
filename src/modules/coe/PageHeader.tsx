"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface CoePageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned action buttons (e.g. Export / + New) — the new design puts these in the header band itself, not a separate row. */
  actions?: ReactNode;
  /** Shows a back arrow to the left of the title that links here — for detail pages reached by drilling into a parent list (e.g. a bundle's Mark Entry Sheet opened from Exam Valuation). */
  backHref?: string;
}

/**
 * COE's own title row — title/subtitle on the left, optional action buttons
 * on the right, flush on the page background (no card/tint box) — matching
 * every other page's header treatment. Search and the notification bell
 * live once in the shared Topbar (see CoeShell), not repeated per page.
 */
export function CoePageHeader({ title, subtitle, actions, backHref }: CoePageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex size-9 shrink-0 items-center justify-center rounded-input border border-border-default text-ink hover:bg-surface-subtle"
            aria-label="Back"
          >
            <Icon name="arrow_back" size={18} />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-.02em] text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
