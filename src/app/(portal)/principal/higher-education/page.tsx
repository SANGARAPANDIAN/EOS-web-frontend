"use client";

import { Fragment, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import {
  useHigherEducationFilters,
  useHigherEducationSummary,
  useHigherEducationList,
} from "@/modules/principal/api/higher-education";

function countryList(countries: string[]): string {
  if (countries.length === 0) return "no countries on file yet";
  if (countries.length <= 5) return countries.join(", ");
  return `${countries.slice(0, 5).join(", ")} and ${countries.length - 5} more`;
}

export default function PrincipalHigherEducationPage() {
  const [q, setQ] = useState("");
  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filters = useHigherEducationFilters();
  const summary = useHigherEducationSummary();
  const list = useHigherEducationList({ q: q || undefined, batch_id: batchId, department_id: departmentId });

  const records = list.data?.records ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Higher education
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Students who progressed to postgraduate study · open a record to see the full note on file
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <PrincipalStatCard
          label="Total higher education"
          icon="school"
          loading={summary.isLoading}
          value={summary.data?.total ?? "—"}
          sub={summary.data ? `${summary.data.within_india} within India · ${summary.data.overseas} overseas` : undefined}
          footer={
            summary.data?.confirmed_admission_count != null
              ? `${summary.data.confirmed_admission_count} already hold a confirmed admission`
              : "Admission status (confirmed vs. interested) isn't tracked in this system yet"
          }
        />
        <PrincipalStatCard
          label="Studying abroad"
          icon="flight_takeoff"
          loading={summary.isLoading}
          value={summary.data?.overseas ?? "—"}
          sub={summary.data ? `Across ${summary.data.countries_count} countr${summary.data.countries_count === 1 ? "y" : "ies"}` : undefined}
          footer={summary.data ? countryList(summary.data.countries) : undefined}
        />
        <PrincipalStatCard
          label="Scholarship count"
          icon="savings"
          loading={summary.isLoading}
          value={summary.data?.scholarship_count ?? "—"}
          footer={
            summary.data?.scholarship_count != null
              ? "Students holding a scholarship or assistantship"
              : "Not tracked in this system yet"
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
            placeholder="Search by name, register number, university, programme or country"
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
      </div>

      <p className="text-[13px]" style={{ color: principalColors.textFaint }}>
        {list.isLoading ? "Loading…" : `Showing ${records.length} of ${list.data?.total ?? 0} higher-education records`}
      </p>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["STUDENT", "DEPT · BATCH", "PROGRAMME", "UNIVERSITY", "COUNTRY", "SCHOLARSHIP"].map((h) => (
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
              {list.isLoading && <PrincipalTableSkeleton columns={6} />}
              {records.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="cursor-pointer border-t"
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
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {r.programme}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {r.university ?? "—"}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      <span className="inline-flex items-center gap-1.5">
                        {r.is_abroad && <Icon name="flight_takeoff" size={14} style={{ color: principalColors.primary }} />}
                        {r.country}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: principalColors.body }}>
                      {r.is_scholarship == null ? (
                        <span style={{ color: principalColors.textFaint }}>—</span>
                      ) : r.is_scholarship ? (
                        <span
                          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{ color: principalColors.primaryDark, background: principalColors.surfaceTint, borderColor: principalColors.chipBorder }}
                        >
                          {r.scholarship_name ?? "Scholarship"}
                        </span>
                      ) : (
                        <span style={{ color: principalColors.textFaint }}>No</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr style={{ borderColor: principalColors.borderMuted }} className="border-t">
                      <td colSpan={6} className="px-5 py-3 text-sm" style={{ background: principalColors.surfaceMuted, color: principalColors.body }}>
                        {r.admission_status && (
                          <div className="mb-1">
                            <span className="font-semibold">Admission status: </span>
                            <span className="capitalize">{r.admission_status}</span>
                          </div>
                        )}
                        {r.remarks ? (
                          <>
                            <span className="font-semibold">Note: </span>
                            {r.remarks}
                          </>
                        ) : (
                          <span style={{ color: principalColors.textFaint }}>No additional notes on file.</span>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {!list.isLoading && records.length === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="school" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              No higher-education records match that search
            </div>
            <div className="mt-1 text-sm" style={{ color: principalColors.textFaint }}>
              Try a name, a register number, a university, or a country.
            </div>
          </div>
        )}

        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          Country/university/programme are free-text fields entered per student, not standardized lookups.
        </div>
      </div>
    </div>
  );
}
