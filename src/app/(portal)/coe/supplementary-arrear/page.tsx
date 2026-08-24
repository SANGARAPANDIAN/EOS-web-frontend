"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, PillTabs, Select, Badge, Button, Input, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import {
  useExamRegistrations,
  useReviewExamRegistration,
  useUpdateFeeStatus,
  useCreateExamRegistration,
  type ExamRegistrationStatus,
} from "@/modules/coe/api/examRegistrations";

const TABS: { key: "all" | ExamRegistrationStatus; label: string }[] = [
  { key: "all", label: "All registrations" },
  { key: "approved", label: "Registered" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Not eligible" },
];

const TONE: Record<ExamRegistrationStatus, BadgeTone> = { approved: "accentDark", pending: "accent", rejected: "danger" };

function studentName(s: { soa_applications: { first_name: string; last_name: string | null } | null }): string | null {
  if (!s.soa_applications) return null;
  return [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ");
}

export default function CoeSupplementaryArrearPage() {
  const exams = useExams();
  const arrearExams = useMemo(() => (exams.data ?? []).filter((e) => e.exam_category === "arrear" || e.exam_category === "supplementary"), [exams.data]);

  const [examId, setExamId] = useState<number | null>(null);
  const [status, setStatus] = useState<"all" | ExamRegistrationStatus>("all");
  const [showRegister, setShowRegister] = useState(false);

  // Registrations for arrear/supplementary exams are rare compared to real
  // marks activity — default to whichever exam has real registrations, and
  // only fall back to the highest id when none do, so the page doesn't land
  // on an exam nobody has touched yet.
  const allExamIds = arrearExams.map((e) => e.id);
  const registrationCounts = useExamRegistrations({});
  const busiestExamId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of registrationCounts.data ?? []) if (allExamIds.includes(r.exam_id)) counts.set(r.exam_id, (counts.get(r.exam_id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [registrationCounts.data, allExamIds]);
  const effectiveExamId = examId ?? busiestExamId ?? [...arrearExams].sort((a, b) => b.id - a.id)[0]?.id ?? null;

  const registrations = useExamRegistrations({ exam_id: effectiveExamId, status: status === "all" ? null : status });
  const rows = registrations.data ?? [];
  const review = useReviewExamRegistration();
  const feeStatus = useUpdateFeeStatus();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Supplementary & Arrear"
        subtitle="Arrear registration, supplementary scheduling and results for real arrear/supplementary exams."
        actions={
          <>
            <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-64">
              {arrearExams.length === 0 && <option value="">No arrear/supplementary exams yet</option>}
              {[...arrearExams].sort((a, b) => b.id - a.id).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.exam_category} · {e.academic_year} · Sem {e.semester}
                </option>
              ))}
            </Select>
            <Button variant="primarySmall" className="w-auto" disabled={!effectiveExamId} onClick={() => setShowRegister(true)}>
              Register student
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Arrear/Supplementary exams" value={arrearExams.length} icon="event_repeat" />
        <StatCard label="Registered" value={rows.filter((r) => r.status === "approved").length} icon="how_to_reg" />
        <StatCard label="Pending" value={rows.filter((r) => r.status === "pending").length} icon="hourglass_empty" />
        <StatCard label="Not eligible" value={rows.filter((r) => r.status === "rejected").length} icon="block" />
      </div>

      <Card>
        <PillTabs options={TABS} value={status} onChange={(k) => setStatus(k as typeof status)} />
      </Card>

      {registrations.isLoading ? (
        <SkeletonTable rows={6} />
      ) : arrearExams.length === 0 ? (
        <Card>
          <p className="text-[13px] text-subtle">No arrear or supplementary exams have been created yet — create one from Exam Management.</p>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Students</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No registrations for this exam yet. Use &quot;Register student&quot; to add one.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[130px]">Department</div>
                <div className="w-[100px]">Fee status</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[190px] text-right">Actions</div>
              </div>
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{studentName(r.students) ?? r.students.register_no ?? r.students.student_id_no}</div>
                    <div className="text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
                  </div>
                  <div className="w-[130px] text-[12.5px] text-ink">
                    {r.students.classes?.departments.code ?? "—"} {r.students.classes?.current_semester ? `· Sem ${r.students.classes.current_semester}` : ""}
                  </div>
                  <div className="w-[100px]">
                    <button
                      type="button"
                      disabled={feeStatus.isPending}
                      onClick={() => feeStatus.mutate({ id: r.id, fee_status: r.fee_status === "paid" ? "unpaid" : "paid" })}
                    >
                      <Badge tone={r.fee_status === "paid" ? "accentDark" : "danger"}>{r.fee_status.toUpperCase()}</Badge>
                    </button>
                  </div>
                  <div className="w-[110px]">
                    <Badge tone={TONE[r.status]}>{r.status.toUpperCase()}</Badge>
                  </div>
                  <div className="flex w-[190px] justify-end gap-2">
                    {r.status === "pending" && (
                      <>
                        <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, status: "rejected" })}>
                          Reject
                        </Button>
                        <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, status: "approved" })}>
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <RegisterStudentModal open={showRegister} onClose={() => setShowRegister(false)} examId={effectiveExamId} />
    </div>
  );
}

function RegisterStudentModal({ open, onClose, examId }: { open: boolean; onClose: () => void; examId: number | null }) {
  const lookup = useLookupStudentByRegisterNo();
  const create = useCreateExamRegistration();
  const [registerNo, setRegisterNo] = useState("");

  function handleClose() {
    setRegisterNo("");
    lookup.reset();
    create.reset();
    onClose();
  }

  function handleRegister() {
    if (!examId || !lookup.data) return;
    create.mutate({ exam_id: examId, student_id: lookup.data.id, fee_status: "unpaid" }, { onSuccess: handleClose });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Register student" subtitle="Look up by register number, then add to this arrear/supplementary exam.">
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Register number</label>
            <Input value={registerNo} onChange={(e) => setRegisterNo(e.target.value)} placeholder="e.g. 21CS042" />
          </div>
          <Button variant="secondary" className="w-auto" disabled={!registerNo.trim() || lookup.isPending} onClick={() => lookup.mutate(registerNo.trim())}>
            {lookup.isPending ? "Looking up…" : "Find"}
          </Button>
        </div>
        {lookup.data && (
          <p className="text-[12.5px] font-semibold text-primary">
            Found: {lookup.data.name ?? lookup.data.register_no} · {lookup.data.department_code ?? "—"} · Sem {lookup.data.semester ?? "—"}
          </p>
        )}
        {lookup.isError && <p className="text-[12px] text-danger-fg">{isNotFound(lookup.error) ? "No student found with this register number." : (lookup.error as Error).message}</p>}
        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!lookup.data || !examId || create.isPending} onClick={handleRegister}>
            {create.isPending ? "Registering…" : "Register"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
