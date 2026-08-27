"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { useEdcFilters, useEdcSummary, useEdcList } from "@/modules/principal/api/edc";

function formatRupees(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PrincipalEdcPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);

  const filters = useEdcFilters();
  const summary = useEdcSummary();
  const list = useEdcList({ q: q || undefined, batch_id: batchId, department_id: departmentId });

  const records = list.data?.records ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Entrepreneurship Development Cell
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Students building ventures through the EDC · open a record to see the full entrepreneurship file
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PrincipalStatCard
          label="Students in EDC"
          icon="rocket_launch"
          loading={summary.isLoading}
          value={summary.data?.students_in_edc ?? "—"}
          sub="Across all departments and batches"
        />
        <PrincipalStatCard
          label="Startups"
          icon="storefront"
          loading={summary.isLoading}
          value={summary.data?.startups_beyond_idea ?? "—"}
          sub="Beyond idea stage"
        />
        <PrincipalStatCard
          label="Registered ventures"
          icon="verified"
          loading={summary.isLoading}
          value={summary.data?.registered_ventures_count ?? "—"}
          footer={
            summary.data?.registered_ventures_count != null
              ? "Registered as a company, LLP or proprietorship"
              : "Registration type isn't tracked in this system yet"
          }
        />
        <PrincipalStatCard
          label="Startups inside college"
          icon="apartment"
          loading={summary.isLoading}
          value={summary.data?.incubated_count ?? "—"}
          footer={
            summary.data?.incubated_count != null
              ? "Seated in the campus incubation centre"
              : "Incubation seating isn't tracked in this system yet"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-4" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <label
          className="flex h-11 min-w-[280px] flex-1 items-center gap-2.5 rounded-xl border px-3.5"
          style={{ borderColor: principalColors.border }}
        >
          <Icon name="search" size={20} style={{ color: principalColors.textFaint }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, register number, venture, domain or stage"
            className="flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: principalColors.heading }}
          />
        </label>
        <select
          value={batchId ?? ""}
          onChange={(e) => setBatchId(e.target.value ? Number(e.target.value) : undefined)}
          className="h-11 rounded-xl border px-3 text-sm"
          style={{ borderColor: principalColors.border, color: principalColors.heading }}
        >
          <option value="">All batches</option>
          {filters.data?.batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name.replace("_", "-")}
            </option>
          ))}
        </select>
        <select
          value={departmentId ?? ""}
          onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
          className="h-11 rounded-xl border px-3 text-sm"
          style={{ borderColor: principalColors.border, color: principalColors.heading }}
        >
          <option value="">All departments</option>
          {filters.data?.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code}
            </option>
          ))}
        </select>
        <span className="text-[13px]" style={{ color: principalColors.textFaint }}>
          {list.isLoading ? "Loading…" : `Showing ${records.length} of ${list.data?.total ?? 0} EDC records`}
        </span>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["STUDENT", "DEPT · BATCH", "VENTURE", "DOMAIN", "ROLE", "STAGE", "FUNDING"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold tracking-wider first:pl-5 last:pr-5"
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <PrincipalTableSkeleton columns={7} />}
              {records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/principal/edc/${r.id}`)}
                    className="cursor-pointer border-t transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]"
                    style={{ borderColor: principalColors.borderMuted }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold" style={{ color: principalColors.heading }}>
                        {r.student.name}
                      </div>
                      <div className="text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textFaint }}>
                        {r.student.register_no ?? "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                      {r.department?.code ?? "—"} · {r.batch?.name.replace("_", "-") ?? "—"}
                    </td>
                    <td className="px-3 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {r.venture}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {r.domain ?? "—"}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.textFaint }}>
                      {r.role ?? "—"}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {r.stage ? (
                        <span
                          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{ color: principalColors.primaryDark, background: principalColors.surfaceTint, borderColor: principalColors.chipBorder }}
                        >
                          {r.stage}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {r.funding_required != null ? formatRupees(r.funding_required) : "—"}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!list.isLoading && records.length === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="rocket_launch" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              No EDC records match that search
            </div>
            <div className="mt-1 text-sm" style={{ color: principalColors.textFaint }}>
              Try a name, a register number, a venture, or a domain.
            </div>
          </div>
        )}

        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          DOMAIN and STAGE are free-text fields entered per student, not standardized lookups.
        </div>
      </div>
    </div>
  );
}
