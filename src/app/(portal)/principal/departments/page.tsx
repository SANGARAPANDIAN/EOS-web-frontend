"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import { PrincipalTableSkeleton } from "@/modules/principal/components/PrincipalTableSkeleton";
import { useInitialQueryParam } from "@/lib/utils/useInitialQueryParam";
import {
  useDepartmentsList,
  useDepartmentDetail,
  useDepartmentSections,
  useAssignHod,
  type DepartmentCard,
} from "@/modules/principal/api/departments";
import { useFacultyList } from "@/modules/principal/api/faculty";

function formatRupees(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function abbrev(code: string): string {
  return code.slice(0, 2).toUpperCase();
}

function DepartmentTile({ dept, onOpen }: { dept: DepartmentCard; onOpen: () => void }) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-5 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold"
          style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
        >
          {abbrev(dept.code)}
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold" style={{ color: principalColors.heading }}>
            {dept.code}
          </div>
          <div className="truncate text-[13px]" style={{ color: dept.hod ? principalColors.textFaint : principalColors.textSubtle }}>
            {dept.hod ? `${dept.hod.name} · HoD` : "No HoD assigned"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            Students
          </div>
          <div className="font-mono text-base" style={{ color: principalColors.heading }}>
            {dept.students_count.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            Faculty
          </div>
          <div className="font-mono text-base" style={{ color: principalColors.heading }}>
            {dept.faculty_count}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            Attendance
          </div>
          <div className="font-mono text-base" style={{ color: principalColors.heading }}>
            {dept.attendance_percentage != null ? `${dept.attendance_percentage}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            Placement
          </div>
          <div className="font-mono text-base" style={{ color: principalColors.primaryDark }}>
            {dept.placement_percentage != null ? `${dept.placement_percentage}%` : "—"}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: principalColors.primary }}
      >
        Open department
        <Icon name="chevron_right" size={16} />
      </button>
    </div>
  );
}

function AssignHodPanel({ departmentId, currentFacultyId }: { departmentId: number; currentFacultyId: number | null }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(currentFacultyId ? String(currentFacultyId) : "");
  const facultyOptions = useFacultyList({ department_id: departmentId });
  const assignHod = useAssignHod(departmentId);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg border px-3.5 text-sm font-semibold"
        style={{ borderColor: principalColors.border, color: principalColors.primary }}
      >
        {currentFacultyId ? "Change HoD" : "Assign HoD"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="h-9 rounded-lg border px-2.5 text-sm"
        style={{ borderColor: principalColors.border, color: principalColors.heading }}
      >
        <option value="">Select faculty…</option>
        {facultyOptions.data?.faculty.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} · {f.designation}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selected || assignHod.isPending}
        onClick={() => assignHod.mutate(Number(selected), { onSuccess: () => setOpen(false) })}
        className="h-9 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: principalColors.primary }}
      >
        Save
      </button>
      {currentFacultyId != null && (
        <button
          type="button"
          disabled={assignHod.isPending}
          onClick={() => assignHod.mutate(null, { onSuccess: () => setOpen(false) })}
          className="h-9 rounded-lg border px-3 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: "#B42318" }}
        >
          Clear
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-9 rounded-lg px-2 text-sm"
        style={{ color: principalColors.textFaint }}
      >
        Cancel
      </button>
    </div>
  );
}

function DepartmentDetailView({ departmentId, onBack }: { departmentId: number; onBack: () => void }) {
  const detail = useDepartmentDetail(departmentId);
  const sections = useDepartmentSections(departmentId);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
          style={{ borderColor: principalColors.border, color: principalColors.body }}
        >
          <Icon name="arrow_back" size={18} />
          All departments
        </button>
        <div className="text-[13px]" style={{ color: principalColors.textFaint }}>
          Departments &amp; HoDs · {detail.data?.code ?? "…"}
        </div>
      </div>

      {detail.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="grid h-14 w-14 place-items-center rounded-2xl text-lg font-extrabold"
                style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
              >
                {abbrev(detail.data.code)}
              </div>
              <div>
                <h1
                  className="text-[30px] font-extrabold tracking-tight"
                  style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
                >
                  {detail.data.name}
                </h1>
                <p className="mt-1 text-[15px]" style={{ color: principalColors.textFaint }}>
                  {detail.data.code} · {detail.data.hod ? `${detail.data.hod.name} · HoD` : "No HoD assigned"} ·{" "}
                  {detail.data.students_count.toLocaleString("en-IN")} students · {detail.data.faculty_count} faculty
                </p>
              </div>
            </div>
            <AssignHodPanel departmentId={departmentId} currentFacultyId={detail.data.hod?.faculty_id ?? null} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PrincipalStatCard
              label="Students"
              icon="groups"
              loading={detail.isLoading}
              value={detail.data.students_count.toLocaleString("en-IN")}
              sub={
                detail.data.students.attendance_percentage != null
                  ? `${detail.data.students.attendance_percentage}% mean attendance · semester to date`
                  : "no attendance recorded yet"
              }
              progressPercent={detail.data.students.attendance_percentage ?? undefined}
              footer={`${detail.data.students.sections_count} sections`}
            />
            <PrincipalStatCard
              label="Faculty"
              icon="badge"
              loading={detail.isLoading}
              value={detail.data.faculty_count}
              sub={
                detail.data.faculty.reporting_rate_today != null
                  ? `${detail.data.faculty.reporting_rate_today}% reporting rate · faculty on roll`
                  : "no attendance marked today"
              }
              progressPercent={detail.data.faculty.reporting_rate_today ?? undefined}
              footer={`${detail.data.faculty.on_leave_today} on approved leave today`}
            />
            <PrincipalStatCard
              label="Mean CGPA"
              icon="school"
              loading={detail.isLoading}
              value="—"
              sub={
                detail.data.placement.percentage != null
                  ? `${detail.data.placement.placed} placed · ${detail.data.placement.percentage}% placement`
                  : undefined
              }
            />
            <PrincipalStatCard
              label="Fees pending"
              icon="payments"
              loading={detail.isLoading}
              value={formatRupees(detail.data.fees_pending_total)}
              sub="across all sections"
            />
          </div>
        </>
      )}

      <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            Sections
          </div>
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            Class advisor, delivery and outcome figures for every section
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["SECTION", "CLASS ADVISOR", "CONTACT", "STUDENT ATT.", "FACULTY ATT.", "MEAN CGPA", "PLACED", "FEES"].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold tracking-wider first:pl-5 last:pr-5 ${
                      ["STUDENT ATT.", "FACULTY ATT.", "MEAN CGPA", "PLACED", "FEES"].includes(h) ? "text-right" : "text-left"
                    }`}
                    style={{ color: principalColors.textFaint }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.isLoading && <PrincipalTableSkeleton columns={8} />}
              {sections.data?.map((s) => (
                <tr key={s.id} className="border-t transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                    {s.section} {s.semester != null ? `· Sem ${s.semester}` : ""}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5" style={{ color: principalColors.body }}>
                    {s.advisor?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-xs" style={{ color: principalColors.textFaint }}>
                    {s.advisor ? (
                      <>
                        <div>{s.advisor.email}</div>
                        <div>{s.advisor.phone ?? "—"}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.student_attendance_percentage != null ? `${s.student_attendance_percentage}%` : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.faculty_attendance_percentage != null ? `${s.faculty_attendance_percentage}%` : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ color: principalColors.textFaint }}>
                    —
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.placed} / {s.total_students}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.body }}>
                    {s.fees_pending_amount > 0 ? formatRupees(s.fees_pending_amount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-5 py-3.5 text-xs" style={{ borderColor: principalColors.borderLight, color: principalColors.textSubtle }}>
          MEAN CGPA isn&apos;t shown: no table in this system stores it, and it can&apos;t be honestly derived from exam
          marks. FACULTY ATT. is the class advisor&apos;s own attendance this term, not every faculty member who
          teaches the section.
        </div>
      </div>
    </div>
  );
}

export default function PrincipalDepartmentsPage() {
  const initialId = useInitialQueryParam("id");
  const [openDepartmentId, setOpenDepartmentId] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialId) setOpenDepartmentId(Number(initialId));
  }, [initialId]);
  const departments = useDepartmentsList();

  if (openDepartmentId != null) {
    return <DepartmentDetailView departmentId={openDepartmentId} onBack={() => setOpenDepartmentId(null)} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Departments &amp; HoDs
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          {departments.data ? `${departments.data.length} departments` : "Loading…"} · open a department to see its
          sections and class advisors
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {departments.data?.map((dept) => (
          <DepartmentTile key={dept.id} dept={dept} onOpen={() => setOpenDepartmentId(dept.id)} />
        ))}
      </div>
    </div>
  );
}
