"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ADMIN_NAV } from "@/modules/admin/nav";

interface AdminTopbarProps {
  onOpenMobileNav: () => void;
}

/**
 * Search box doubles as a lightweight "jump to page" — filters the nav's
 * flat item list by label and navigates to the first match on Enter. Not the
 * reference's full command palette (out of scope for this phase), but real
 * behavior instead of decorative dead chrome.
 */
export function AdminTopbar({ onOpenMobileNav }: AdminTopbarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = ADMIN_NAV.flatMap((g) => g.items).find((item) => item.label.toLowerCase().includes(q));
    if (match) {
      router.push(match.href);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-admin-border bg-admin-canvas/92 px-7 py-3 backdrop-blur-[8px]">
      <button
        onClick={onOpenMobileNav}
        aria-label="Open menu"
        className="text-admin-body hover:text-admin-ink lg:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      <form onSubmit={handleSubmit} className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-admin-control border border-admin-border bg-admin-canvas px-3 has-[input:focus]:border-admin-primary">
        <Icon name="search" size={19} className="text-admin-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to a page — students, reports, admissions…"
          className="min-w-0 flex-1 border-0 bg-transparent font-sans text-sm text-admin-ink outline-none placeholder:text-admin-muted"
        />
      </form>

      <div className="flex-1" />

      <div className="flex items-center gap-2 rounded-admin-pill border border-admin-border bg-admin-tint-strong px-3.5 py-2 text-[13px] font-semibold text-admin-primary-deep">
        <Icon name="verified_user" size={17} />
        Admin · Institution
      </div>
    </header>
  );
}
