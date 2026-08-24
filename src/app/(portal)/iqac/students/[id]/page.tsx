"use client";

import { useParams, useRouter } from "next/navigation";
import { Badge, EmptyState, type BadgeTone } from "@/components/ui";
import { useStudentsList, type StudentRow } from "@/modules/iqac/api/students";

const FEES_TONE: Record<StudentRow["fees_status"], BadgeTone> = {
  paid: "accent",
  partial: "neutral",
  pending: "danger",
  not_billed: "neutral",
};
const FEES_LABEL: Record<StudentRow["fees_status"], string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
  not_billed: "Not billed",
};
const PLACEMENT_LABEL: Record<StudentRow["placement_status"], string> = {
  placed: "Placed",
  applied: "Applied",
  not_registered: "Not registered",
};
const STATUS_TONE: Record<StudentRow["status"], BadgeTone> = { active: "accent", inactive: "neutral" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">{label}</div>
      <div className="mt-1 text-[15px] font-bold text-ink">{value}</div>
    </div>
  );
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const list = useStudentsList({ status: "all" });

  const student = list.data?.students.find((s) => String(s.id) === params.id);
  const year = student?.semester ? Math.ceil(student.semester / 2) : null;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button type="button" onClick={() => router.push("/iqac/students")} className="w-fit text-[13px] font-bold text-primary hover:underline">
        ← Back to student records
      </button>

      {list.isLoading && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState loading />
        </div>
      )}

      {!list.isLoading && !student && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState message="Student not found." />
        </div>
      )}

      {student && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{student.name}</h1>
              <p className="mt-1 text-[13.5px] text-muted">
                {student.roll_no ?? student.student_id_no} · {student.department?.name ?? "No department on file"}
              </p>
            </div>
            <Badge tone={STATUS_TONE[student.status]}>{student.status === "active" ? "Active" : "Inactive"}</Badge>
          </div>

          <div className="grid grid-cols-4 gap-5 rounded-card border border-border-default bg-surface p-6">
            <Field label="Roll No." value={student.roll_no ?? "—"} />
            <Field label="Register No." value={student.register_no ?? "—"} />
            <Field label="Batch" value={student.batch?.name ?? "—"} />
            <Field label="Department" value={student.department?.code ?? "—"} />
            <Field label="Section" value={student.section ?? "—"} />
            <Field label="Year / Semester" value={year ? `Year ${year} · Semester ${student.semester}` : "—"} />
            <Field label="Mentor" value={student.mentor?.name ?? "Not assigned"} />
            <Field label="Attendance" value={student.attendance_percentage != null ? `${student.attendance_percentage}%` : "Not tracked"} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-card border border-border-default bg-surface p-6">
              <h2 className="text-[15px] font-extrabold text-ink">Fees</h2>
              <div className="mt-3">
                <Badge tone={FEES_TONE[student.fees_status]}>{FEES_LABEL[student.fees_status]}</Badge>
              </div>
            </div>
            <div className="rounded-card border border-border-default bg-surface p-6">
              <h2 className="text-[15px] font-extrabold text-ink">Placement</h2>
              <div className="mt-3 text-[14px] font-bold text-ink">{PLACEMENT_LABEL[student.placement_status]}</div>
            </div>
          </div>

          <p className="text-[12px] text-subtle">CGPA and arrears aren&apos;t shown — neither is trackable in this system.</p>
        </>
      )}
    </div>
  );
}
