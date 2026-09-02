"use client";

import { Badge } from "@/components/ui";

export interface CertificateStatusItem {
  id: number;
  name: string;
  is_available: boolean;
  file_url?: string | null;
}

/**
 * Shared certificate/document checklist grid — one card per certificate
 * type, a status pill derived purely from is_available. Only two states
 * exist: Received / Not received — no separate "verified" status. Used
 * identically by every role's read-only student-profile certificates
 * section (Faculty, HoD, Principal, Secretary) so the status vocabulary
 * and layout stay in one place instead of being copy-pasted per role with
 * drifting wording.
 */
export function CertificateStatusGrid({ items }: { items: CertificateStatusItem[] }) {
  if (items.length === 0) {
    return <div className="p-6 text-center text-[13px] font-semibold text-subtle">No certificate types configured.</div>;
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      {items.map((item) => (
        <div key={item.id} className="rounded-[12px] border border-divider bg-surface-tint px-4 py-3.5">
          <div className="text-[13.5px] font-bold text-ink">{item.name}</div>
          <Badge tone={item.is_available ? "accent" : "neutral"} className="mt-2">
            {item.is_available ? "Received" : "Not received"}
          </Badge>
          {item.is_available && item.file_url && (
            <a
              href={item.file_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-[11.5px] font-bold text-primary hover:underline"
            >
              View →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
