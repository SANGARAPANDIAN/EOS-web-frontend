"use client";

import { useState } from "react";
import { PageHeader, Card, PendingNotice } from "@/modules/admin/components/ui";
import { cn } from "@/lib/utils/cn";
import { ADMIN_REPORT_CATALOG, type AdminReportEntry } from "@/modules/admin/types/reports";

const DEFAULT_ENTRY = ADMIN_REPORT_CATALOG[0].entries[0];

/**
 * The old console's Reports page is a picker over report endpoints owned by
 * the Hostel, Library and IQAC modules — none of which exist in this
 * codebase yet (a separate migration phase). The catalog itself (every
 * report this console offers, grouped by module) is reproduced faithfully
 * below; selecting an entry shows an honest "not wired up in this console
 * yet" state instead of a broken or fabricated preview/export.
 */
export default function AdminReportsPage() {
  const [selected, setSelected] = useState<AdminReportEntry>(DEFAULT_ENTRY);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Every exportable report across Hostel, Library and IQAC, in one place — PDF or Excel."
      />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-4">
          {ADMIN_REPORT_CATALOG.map((group) => (
            <div key={group.module} className="flex flex-col gap-2">
              <p className="px-1 text-[11px] font-bold tracking-[.09em] text-admin-subtle uppercase">{group.label}</p>
              {group.entries.map((entry) => {
                const active = entry.module === selected.module && entry.key === selected.key;
                return (
                  <button
                    key={`${entry.module}:${entry.key}`}
                    onClick={() => setSelected(entry)}
                    className={cn(
                      "rounded-admin-lg border px-4 py-3 text-left transition-colors",
                      active ? "border-admin-primary bg-admin-tint-strong" : "border-admin-border bg-admin-canvas hover:border-admin-border-hover",
                    )}
                  >
                    <p className="text-sm font-semibold text-admin-ink">{entry.label}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">{entry.description}</p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <Card hoverable={false} className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-sans text-base font-bold text-admin-ink">{selected.label}</h3>
            <span className="rounded-admin-pill bg-admin-tint px-2.5 py-1 text-xs font-semibold text-admin-muted uppercase">
              {selected.module}
            </span>
          </div>
          <PendingNotice
            reason={`This report lives in the ${selected.module === "hostel" ? "Hostel" : selected.module === "library" ? "Library" : "IQAC"} module, which hasn't been migrated into this console yet. Once that module lands here, its existing preview and PDF/Excel export will appear in this panel — nothing here is fabricated in the meantime.`}
            height={260}
          />
        </Card>
      </div>
    </div>
  );
}
