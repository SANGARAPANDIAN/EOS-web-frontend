"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { useInitialQueryParam } from "@/lib/utils/useInitialQueryParam";
import {
  useFacultyFilters,
  useFacultySummary,
  useFacultyDepartmentStrength,
  useFacultyList,
} from "@/modules/principal/api/faculty";

function formatRupees(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PrincipalFacultyPage() {
  const initialQ = useInitialQueryParam("q");
  const [q, setQ] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialQ) setQ(initialQ);
  }, [initialQ]);
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);

  const filters = useFacultyFilters();
  const summary = useFacultySummary();
  const deptStrength = useFacultyDepartmentStrength();
  const list = useFacultyList({ q: q || undefined, department_id: departmentId });

  const faculty = list.data?.faculty ?? [];
  const onDutyPct =
    summary.data && summary.data.on_duty.total_active > 0
      ? Math.round((summary.data.on_duty.reported_today / summary.data.on_duty.total_active) * 1000) / 10
      : undefined;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Faculty &amp; staff
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          {summary.data
            ? `${(summary.data.teaching_total + summary.data.non_teaching_total).toLocaleString("en-IN")} employees · ${summary.data.teaching_total} teaching, ${summary.data.non_teaching_total} non-teaching`
            : "Loading…"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PrincipalStatCard
          label="On duty today"
          icon="badge"
          loading={summary.isLoading}
          value={summary.data?.on_duty.reported_today ?? "—"}
          delta={onDutyPct != null ? `${onDutyPct}%` : undefined}
          sub={summary.data ? `reporting rate · of ${summary.data.on_duty.total_active} employees` : undefined}
          progressPercent={onDutyPct}
          footer={summary.data ? `${summary.data.on_duty.on_leave_today} on approved leave today` : undefined}
        />
        <PrincipalStatCard
          label="Leave requests"
          icon="event_busy"
          loading={summary.isLoading}
          value={summary.data?.leave_requests_pending ?? "—"}
          sub="awaiting HoD or HR"
        />
        <PrincipalStatCard
          label="Appraisals closed"
          icon="fact_check"
          loading={summary.isLoading}
          value={summary.data ? `${summary.data.appraisals.closed} / ${summary.data.appraisals.total}` : "—"}
          sub={summary.data ? `of ${summary.data.appraisals.total} appraisal requests on file` : undefined}
        />
        <PrincipalStatCard
          label="Payroll this month"
          icon="payments"
          loading={summary.isLoading}
          value={summary.data ? formatRupees(summary.data.payroll.processed_amount) : "—"}
          sub={
            summary.data
              ? `${summary.data.payroll.processed_count} of ${summary.data.payroll.total_count} disbursed for ${summary.data.payroll.month_label}`
              : undefined
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
            placeholder="Search faculty by name, ID or designation"
            className="flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: principalColors.heading }}
          />
        </label>
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

      <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex items-center border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Faculty register
          </div>
          <span className="ml-auto text-[13px]" style={{ color: principalColors.textFaint }}>
            {list.isLoading ? "Loading…" : `${list.data?.total ?? 0} faculty`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["FACULTY ID", "NAME", "DESIGNATION", "DEPT", "QUALIFICATION", "EXP", "CLASSES", "ATTENDANCE", "EMAIL", "PHONE"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                      h === "EXP" || h === "CLASSES" || h === "ATTENDANCE" ? "text-right" : "text-left"
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
              {faculty.map((f) => {
                const attColor =
                  f.attendance_percentage == null
                    ? principalColors.textFaint
                    : f.attendance_percentage < 75
                      ? "#B42318"
                      : principalColors.heading;
                return (
                  <tr key={f.id} className="border-t transition-colors hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                    <td
                      className="whitespace-nowrap px-5 py-3.5 font-semibold"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.primary }}
                    >
                      #{f.id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                      {f.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                      {f.designation}
                    </td>
                    <td className="px-3 py-3.5" style={{ color: principalColors.body }}>
                      {f.department?.code ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                      {f.qualification ?? "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {f.experience_years != null ? `${f.experience_years} yrs` : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {f.classes_count}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: attColor }}>
                      {f.attendance_percentage != null ? `${f.attendance_percentage}%` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                      {f.email}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                      {f.phone ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!list.isLoading && faculty.length === 0 && (
          <div className="px-5 py-11 text-center">
            <Icon name="person_search" size={38} style={{ color: principalColors.borderLight }} />
            <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              No faculty matches that search
            </div>
            <div className="mt-1 text-sm" style={{ color: principalColors.textFaint }}>
              Try a name, an ID, or a designation such as Professor.
            </div>
          </div>
        )}

        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          FACULTY ID is this system&apos;s internal record number, not an institution-issued employee code — no such
          code exists in this database. EXP is tenure at this institution computed from date of joining, plus any
          prior-institution years on file; it shows &quot;—&quot; where date of joining isn&apos;t recorded.
        </div>
      </div>

      <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Department-wise strength
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["DEPARTMENT", "TEACHING", "SUPPORT", "AVG WORKLOAD", "ATTENDANCE"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                      h === "DEPARTMENT" ? "text-left" : "text-right"
                    }`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptStrength.isLoading && <PrincipalTableSkeleton columns={5} />}
              {deptStrength.data?.departments.map((d) => (
                <tr key={d.department.id} className="border-t transition-colors hover:bg-[rgba(13,30,79,0.03)]" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {d.department.code}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {d.teaching}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {d.support}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {d.avg_workload_hours != null ? `${d.avg_workload_hours} hrs` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {d.attendance_percentage != null ? `${d.attendance_percentage}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {deptStrength.data && deptStrength.data.support_unassigned > 0 && (
          <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
            {deptStrength.data.support_unassigned} support staff aren&apos;t assigned to any department and aren&apos;t
            counted above.
          </div>
        )}
      </div>
    </div>
  );
}
