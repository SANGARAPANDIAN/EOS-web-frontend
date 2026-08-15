"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { useLibrarySummary, useLibraryBooks, type LibraryStatusFilter } from "@/modules/principal/api/facilities";

const TABS: { key: LibraryStatusFilter; label: string }[] = [
  { key: "all", label: "All titles" },
  { key: "available", label: "Available in college" },
  { key: "partial", label: "Partly borrowed" },
  { key: "out", label: "All copies out" },
];

function statusBadge(status: string): { fg: string; bg: string; bd: string } {
  if (status === "available") return { fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  if (status === "partial") return { fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
  return { fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
}

export default function PrincipalLibraryPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LibraryStatusFilter>("all");
  const summary = useLibrarySummary();
  const books = useLibraryBooks(status, q);

  const list = books.data?.books ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Link
        href="/principal/facilities"
        className="flex h-10 w-fit items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
        style={{ borderColor: principalColors.border, color: principalColors.body }}
      >
        <Icon name="arrow_back" size={18} />
        Campus &amp; facilities
      </Link>

      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Library
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Central library catalogue · copies held, borrowed and available on shelf
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PrincipalStatCard label="Total books" icon="menu_book" loading={summary.isLoading} value={summary.data?.total_copies ?? "—"} sub={summary.data ? `${summary.data.distinct_titles} distinct titles catalogued` : undefined} />
        <PrincipalStatCard label="Borrowed" icon="bookmark" loading={summary.isLoading} value={summary.data?.borrowed ?? "—"} sub="Copies currently issued to students and faculty" />
        <PrincipalStatCard label="E-resources" icon="cloud" loading={summary.isLoading} value={summary.data?.e_resources_count ?? "—"} sub="E-journals, e-books and video courses catalogued" />
        <PrincipalStatCard
          label="Available now"
          icon="check_circle"
          loading={summary.isLoading}
          value={summary.data ? summary.data.total_copies - summary.data.borrowed : "—"}
          sub="Copies on shelf right now"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-4" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <label className="flex h-11 min-w-[260px] flex-1 items-center gap-2.5 rounded-xl border px-3.5" style={{ borderColor: principalColors.border }}>
          <Icon name="search" size={20} style={{ color: principalColors.textFaint }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, author, category or accession number"
            className="flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: principalColors.heading }}
          />
        </label>
        <span className="shrink-0 text-[13px]" style={{ color: principalColors.textFaint }}>
          {books.isLoading ? "Loading…" : `${list.length} of ${books.data?.total ?? 0} titles`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatus(tab.key)}
            className="h-9 rounded-lg px-3.5 text-sm font-semibold"
            style={status === tab.key ? { background: principalColors.primary, color: "#FFFFFF" } : { background: principalColors.bg, border: `1px solid ${principalColors.border}`, color: principalColors.body }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["TITLE", "AUTHOR", "ACCESSION", "COPIES", "BORROWED", "STATUS"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${["COPIES", "BORROWED"].includes(h) ? "text-right" : "text-left"}`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.isLoading && <PrincipalTableSkeleton columns={6} />}
              {list.map((b) => {
                const badge = statusBadge(b.status);
                return (
                  <tr key={b.id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {b.title}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                      {b.author ?? "—"}
                    </td>
                    <td className="px-3 py-3.5 font-mono" style={{ color: principalColors.textFaint }}>
                      {b.accession}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {b.total_copies}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {b.borrowed}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
                        {b.status === "available" ? "Available" : b.status === "partial" ? "Partly borrowed" : "All copies out"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!books.isLoading && list.length === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="menu_book" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              No titles match that search
            </div>
          </div>
        )}
        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          &quot;Footfalls today&quot; isn&apos;t shown: no gate/visit-log exists for the library in this system.
        </div>
      </div>
    </div>
  );
}
