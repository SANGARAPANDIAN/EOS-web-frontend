"use client";

import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/modules/admin/components/ui";
import { avatarTint, formatCurrency, formatDate, initials } from "@/modules/admin/lib/students-format";
import type {
  ClassMentor,
  StudentAttendanceSummary,
  StudentCertificate,
  StudentFeeWorkspace,
  StudentListItem,
  StudentSubject,
} from "@/modules/admin/api/students";
import type { CertificateType } from "@/modules/admin/api/admissions";
import { DlGrid, MetricTile, Stub } from "@/modules/admin/components/student-detail/shared";

export function OverviewSection({
  student,
  feeWorkspace,
  mentor,
  attendanceSummary,
  subjects,
  certificateTypes,
  certificates,
}: {
  student: StudentListItem;
  feeWorkspace: StudentFeeWorkspace | undefined;
  mentor: ClassMentor | null | undefined;
  attendanceSummary: StudentAttendanceSummary | undefined;
  subjects: StudentSubject[] | undefined;
  certificateTypes: CertificateType[] | undefined;
  certificates: StudentCertificate[] | undefined;
}) {
  const tint = avatarTint(student.id);
  const residence = student.student_type === "hosteller" ? "Hosteller" : "Day scholar";
  const fee = feeWorkspace?.fee_summary;
  const feeTone = !fee ? undefined : fee.due_status === "paid" ? "success" : fee.due_status === "partial" ? "warning" : "danger";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricTile
          label="Attendance"
          value={attendanceSummary ? `${attendanceSummary.overall.percentage}%` : "—"}
          note={attendanceSummary ? `${attendanceSummary.overall.present} of ${attendanceSummary.overall.total_days} sessions` : "Loading…"}
          tone={!attendanceSummary ? "muted" : attendanceSummary.overall.percentage >= 75 ? "success" : "danger"}
        />
        <MetricTile label="CGPA" value="—" note="No marks/grades aggregate yet" />
        <MetricTile
          label="Credits"
          value={subjects ? String(subjects.reduce((sum, s) => sum + (s.credits ?? 0), 0)) : "—"}
          note="This semester's registered subjects"
          tone={subjects?.length ? "success" : "muted"}
        />
        <MetricTile label="Arrears" value="—" note="No arrears aggregate yet" />
        <MetricTile
          label="Fee status"
          value={fee ? formatCurrency(fee.total_paid) : "—"}
          note={fee ? (Number(fee.total_outstanding) > 0 ? `${formatCurrency(fee.total_outstanding)} outstanding` : "Fully settled") : "Loading…"}
          tone={feeTone}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="At a glance">
            <DlGrid
              pairs={[
                ["Programme", student.course?.name ?? null],
                ["Department", student.department?.name ?? null],
                ["Section", student.class?.section ? `Section ${student.class.section}` : null],
                ["Batch", student.batch?.name ?? null],
                ["Admission quota", student.quota?.name ?? null],
                ["Residence", residence],
                ["Admission date", student.admission_date ? formatDate(student.admission_date) : null],
                ["Semester / Year", student.class?.current_semester ? `Semester ${student.class.current_semester}` : null],
                ["Admission type", null],
                ["Class advisor", mentor ? `${mentor.faculty.first_name} ${mentor.faculty.last_name}` : null],
                ["Expected graduation", null],
              ]}
            />
          </SectionCard>

          <SectionCard title="Attendance trend" actions={<span className="text-xs text-admin-subtle">Last 7 months</span>}>
            <Stub message="No monthly attendance aggregate endpoint yet — only raw per-session records exist." />
          </SectionCard>

          <SectionCard title="Recent activity">
            <Stub message="Not available — no activity feed exists yet." />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Attention required">
            {fee && fee.due_status !== "paid" && Number(fee.total_outstanding) > 0 ? (
              <div
                className={`flex items-start gap-3 rounded-admin-md border p-3 text-sm ${
                  fee.due_status === "pending"
                    ? "border-admin-danger-border bg-admin-danger-bg text-admin-danger-fg"
                    : "border-admin-warning-border bg-admin-warning-bg text-admin-warning-fg"
                }`}
              >
                <Icon name="account_balance_wallet" size={17} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Fees outstanding</p>
                  <p className="mt-0.5">{formatCurrency(fee.total_outstanding)} due.</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-admin-muted">No alerts.</p>
            )}
          </SectionCard>

          <SectionCard title="Photo & documents">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-admin-muted">Photo</span>
                {student.photo_url ? (
                  <span className="flex items-center gap-1.5 font-medium text-admin-success-fg">
                    <Icon name="check" size={15} />
                    Uploaded{student.photo_uploaded_at ? ` · ${formatDate(student.photo_uploaded_at)}` : ""}
                  </span>
                ) : (
                  <span className="text-admin-subtle">Not uploaded</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-admin-muted">Documents</span>
                {certificateTypes && certificates ? (
                  (() => {
                    const collected = certificates.filter((c) => c.is_available).length;
                    const verified = certificates.filter((c) => c.verified_at).length;
                    return (
                      <span className="font-medium text-admin-body">
                        {collected} of {certificateTypes.length} collected
                        {verified > 0 ? ` · ${verified} verified` : ""}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-admin-subtle">Loading…</span>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Class advisor">
            {mentor ? (
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-admin-pill text-sm font-semibold"
                  style={{ background: tint.bg, color: tint.fg }}
                >
                  {initials(mentor.faculty.first_name, mentor.faculty.last_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-admin-ink">
                    {mentor.faculty.first_name} {mentor.faculty.last_name}
                  </p>
                  <p className="truncate text-xs text-admin-muted">
                    {mentor.faculty.designation ?? "Faculty"} · {mentor.academic_year}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-admin-muted">No mentor assigned for this class.</p>
            )}
          </SectionCard>

          <SectionCard title="Open requests">
            <Stub message="No unified student-requests endpoint exists yet." />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
