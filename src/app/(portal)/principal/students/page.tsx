"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useInitialQueryParam } from "@/lib/utils/useInitialQueryParam";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import {
  useStudentFilters,
  useStudentsSummary,
  useStudentsList,
  type StudentsFilterPreset,
  type StudentRow,
} from "@/modules/principal/api/students";

const FILTER_PILLS: { key: StudentsFilterPreset; label: string }[] = [
  { key: "all", label: "All students" },
  { key: "attendance_below_75", label: "Attendance < 75%" },
  { key: "fees_pending", label: "Fees pending" },
];

const DISABLED_PILLS = [
  { label: "CGPA 8.5+", reason: "CGPA isn't tracked in this system" },
  { label: "CGPA below 7", reason: "CGPA isn't tracked in this system" },
  { label: "Arrears", reason: "Arrears aren't tracked as a separate concept in this system" },
];

function feesBadge(status: StudentRow["fees_status"]): { label: string; fg: string; bg: string; bd: string } {
  switch (status) {
    case "paid":
      return { label: "Paid", fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
    case "partial":
      return { label: "Partial", fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
    case "pending":
      return { label: "Pending", fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
    default:
      return { label: "—", fg: principalColors.textFaint, bg: principalColors.surfaceMuted, bd: principalColors.borderLight };
  }
}

function placementBadge(status: StudentRow["placement_status"]): { label: string; fg: string; bg: string; bd: string } {
  switch (status) {
    case "placed":
      return { label: "Placed", fg: "#12296B", bg: "#F1F6FE", bd: "#C1D5F5" };
    case "applied":
      return { label: "Applied", fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
    default:
      return { label: "—", fg: principalColors.textFaint, bg: principalColors.surfaceMuted, bd: principalColors.borderLight };
  }
}

function formatRupees(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PrincipalStudentsPage() {
  const initialQ = useInitialQueryParam("q");
  const [q, setQ] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialQ) setQ(initialQ);
  }, [initialQ]);
  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [section, setSection] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<StudentsFilterPreset>("all");

  const filters = useStudentFilters();
  const summary = useStudentsSummary();
  const list = useStudentsList({ q: q || undefined, batch_id: batchId, department_id: departmentId, section, filter });

  const students = list.data?.students ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Students
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          {summary.data ? `${summary.data.on_roll.toLocaleString("en-IN")} on roll · ` : ""}
          search by register number, name or department, then filter by attendance or fee status
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PrincipalStatCard
          label="Students present today"
          icon="groups"
          loading={summary.isLoading}
          value={summary.data?.present_today ?? "—"}
          delta={summary.data?.attendance_percentage_today != null ? `${summary.data.attendance_percentage_today}%` : undefined}
          sub={summary.data ? `mean attendance · of ${summary.data.on_roll.toLocaleString("en-IN")} on roll` : undefined}
          progressPercent={summary.data?.attendance_percentage_today ?? undefined}
          footer={
            summary.data
              ? `${summary.data.absent_today} marked absent · ${summary.data.students_below_threshold} below the 75% threshold`
              : undefined
          }
        />
        <PrincipalStatCard label="Mean CGPA" icon="school" value="—" footer="Not tracked in this system" />
        <PrincipalStatCard
          label="Placements"
          icon="work"
          loading={summary.isLoading}
          value={summary.data?.placement.placed ?? "—"}
          sub={summary.data ? `of ${summary.data.placement.registered} registered candidates` : undefined}
          href="/principal/placements"
        />
        <PrincipalStatCard
          label="Fees pending"
          icon="payments"
          loading={summary.isLoading}
          value={summary.data?.fees.students_pending ?? "—"}
          sub={summary.data ? `${formatRupees(summary.data.fees.total_outstanding)} outstanding` : undefined}
          href="/principal/finance"
        />
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl border p-4" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className="flex h-11 min-w-[280px] flex-1 items-center gap-2.5 rounded-xl border px-3.5"
            style={{ borderColor: principalColors.border }}
          >
            <Icon name="search" size={20} style={{ color: principalColors.textFaint }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, register number or department"
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
          <select
            value={section ?? ""}
            onChange={(e) => setSection(e.target.value || undefined)}
            className="h-11 rounded-xl border px-3 text-sm"
            style={{ borderColor: principalColors.border, color: principalColors.heading }}
          >
            <option value="">All sections</option>
            {filters.data?.sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setFilter(pill.key)}
              className="h-9 rounded-lg border px-3.5 text-sm font-semibold"
              style={
                filter === pill.key
                  ? { background: principalColors.primary, borderColor: principalColors.primary, color: "#FFFFFF" }
                  : { background: principalColors.bg, borderColor: principalColors.border, color: principalColors.body }
              }
            >
              {pill.label}
            </button>
          ))}
          {DISABLED_PILLS.map((pill) => (
            <button
              key={pill.label}
              type="button"
              disabled
              title={pill.reason}
              className="h-9 cursor-not-allowed rounded-lg border px-3.5 text-sm font-semibold opacity-50"
              style={{ background: principalColors.surfaceMuted, borderColor: principalColors.borderLight, color: principalColors.textFaint }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex items-center border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Student register
          </div>
          <span className="ml-auto text-[13px]" style={{ color: principalColors.textFaint }}>
            {list.isLoading ? "Loading…" : `${list.data?.total ?? 0} students`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["STUDENT", "REGISTER NO", "BATCH", "DEPT", "SEC", "SEM", "ATTENDANCE", "CGPA", "FEES", "PLACEMENT"].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                      h === "ATTENDANCE" || h === "CGPA" ? "text-right" : "text-left"
                    }`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.isLoading && <PrincipalTableSkeleton columns={10} />}
              {students.map((s) => {
                const fee = feesBadge(s.fees_status);
                const placement = placementBadge(s.placement_status);
                const attColor =
                  s.attendance_percentage == null
                    ? principalColors.textFaint
                    : s.attendance_percentage < 75
                      ? "#B42318"
                      : principalColors.heading;
                return (
                  <tr key={s.id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {s.name}
                    </td>
                    <td className="px-3 py-3.5" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {s.register_no ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                      {s.batch?.name.replace("_", "-") ?? "—"}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {s.department?.code ?? "—"}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {s.section ?? "—"}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {s.semester ?? "—"}
                    </td>
                    <td
                      className="px-3 py-3.5 text-right tabular-nums"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", color: attColor }}
                    >
                      {s.attendance_percentage != null ? `${s.attendance_percentage}%` : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: principalColors.textFaint }}>
                      —
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <span
                        className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                        style={{ color: fee.fg, background: fee.bg, borderColor: fee.bd }}
                      >
                        {fee.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                        style={{ color: placement.fg, background: placement.bg, borderColor: placement.bd }}
                      >
                        {placement.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!list.isLoading && students.length === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="person_search" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              No student matches that search
            </div>
            <div className="mt-1 text-sm" style={{ color: principalColors.textFaint }}>
              Try a register number, a name, or a department code such as CSE.
            </div>
          </div>
        )}

        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          CGPA isn&apos;t shown above: no table in this system stores it, and it can&apos;t be honestly derived from exam marks
          (internal/external marks aren&apos;t split, so a composite score can&apos;t be recovered). Arrears aren&apos;t tracked as a
          separate concept either — only fee dues, shown under Fees.
        </div>
      </div>
    </div>
  );
}
