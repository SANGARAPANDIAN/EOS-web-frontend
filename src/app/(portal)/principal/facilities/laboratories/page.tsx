"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { useLaboratories } from "@/modules/principal/api/facilities";

export default function PrincipalLaboratoriesPage() {
  const [q, setQ] = useState("");
  const laboratories = useLaboratories();
  const labs = laboratories.data?.labs ?? [];
  const filtered = q ? labs.filter((l) => [l.block, l.room_number, l.department_in_charge].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())) : labs;

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
          Laboratories
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Venue details and department in-charge for every lab
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border p-4" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border px-3.5" style={{ borderColor: principalColors.border }}>
          <Icon name="search" size={20} style={{ color: principalColors.textFaint }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search room number, block or department"
            className="flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: principalColors.heading }}
          />
        </label>
        <span className="shrink-0 text-[13px]" style={{ color: principalColors.textFaint }}>
          {laboratories.isLoading ? "Loading…" : `${filtered.length} of ${labs.length} labs`}
        </span>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        {laboratories.data && !laboratories.data.tracked ? (
          <div className="px-5 py-14 text-center">
            <Icon name="science" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Laboratory tracking isn&apos;t set up yet
            </div>
            <div className="mx-auto mt-1 max-w-md text-sm" style={{ color: principalColors.textFaint }}>
              Labs and their department in-charge aren&apos;t recorded in this system yet.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr style={{ background: principalColors.surfaceMuted }}>
                  {["BLOCK", "ROOM NUMBER", "CAPACITY", "DEPARTMENT IN CHARGE"].map((h) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${h === "CAPACITY" ? "text-right" : "text-left"}`}
                      style={{ color: principalColors.textFaint }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {laboratories.isLoading && <PrincipalTableSkeleton columns={4} />}
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t transition-colors hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {l.block ?? "—"}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {l.room_number}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {l.capacity ?? "—"}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: principalColors.textFaint }}>
                      {l.department_in_charge ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
