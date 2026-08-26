"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonFilterBar, SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import { downloadCsv } from "@/lib/utils/csv";
import { currencyShort } from "@/modules/admin/lib/format";
import {
  useExamRegistrations,
  useExamRegistrationStats,
  useReviewExamRegistration,
  useUpdateFeeStatus,
  useCreateExamRegistration,
  type ExamRegistration,
  type ExamRegistrationStatus,
  type ExamRegistrationFeeStatus,
} from "@/modules/coe/api/examRegistrations";

// Design's tabs are All registrations / Pending approval / Fee pending /
// Rejected — "fee pending" (unpaid or partial) replaces an "Approved" tab,
// since approved-but-unpaid is the state COE actually needs to chase here.
type TabKey = "all" | "pending" | "fee_pending" | "rejected";

const STATUS_TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All registrations" },
  { key: "pending", label: "Pending approval" },
  { key: "fee_pending", label: "Fee pending" },
  { key: "rejected", label: "Rejected" },
];

const FEE_TONE: Record<ExamRegistrationFeeStatus, BadgeTone> = { paid: "accentDark", unpaid: "danger", partial: "accent" };
const STATUS_TONE: Record<ExamRegistrationStatus, BadgeTone> = { approved: "accentDark", pending: "accent", rejected: "danger" };
const FEE_CYCLE: Record<ExamRegistrationFeeStatus, ExamRegistrationFeeStatus> = { paid: "unpaid", unpaid: "partial", partial: "paid" };
const YEAR_OPTIONS = [1, 2, 3, 4] as const;
function yearOfSemester(semester: number | null | undefined): number | null {
  return semester ? Math.ceil(semester / 2) : null;
}

function studentName(s: { soa_applications: { first_name: string; last_name: string | null } | null }): string | null {
  if (!s.soa_applications) return null;
  return [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ");
}

export default function CoeExamRegistrationPage() {
  const exams = useExams();
  const departments = useDepartments();

  const [examId, setExamId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [year, setYear] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ExamRegistrationStatus>("all");
  const [search, setSearch] = useState("");

  // Defaulting to the highest-id exam often lands on one with zero real
  // registrations yet (freshly created exams sort last). Default instead to
  // whichever exam actually has the most registrations, so the page shows
  // real data without the user having to know which exam to pick first.
  const allRegistrations = useExamRegistrations({});
  const busiestExamId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of allRegistrations.data ?? []) counts.set(r.exam_id, (counts.get(r.exam_id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [allRegistrations.data]);
  const effectiveExamId = examId ?? busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;

  const stats = useExamRegistrationStats(effectiveExamId);
  const registrations = useExamRegistrations({
    exam_id: effectiveExamId,
    department_id: departmentId,
    search,
  });
  const review = useReviewExamRegistration();
  const updateFee = useUpdateFeeStatus();

  const rows = useMemo(() => {
    let list = registrations.data ?? [];
    if (tab === "pending") list = list.filter((r) => r.status === "pending");
    else if (tab === "fee_pending") list = list.filter((r) => r.fee_status !== "paid");
    else if (tab === "rejected") list = list.filter((r) => r.status === "rejected");
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (year != null) list = list.filter((r) => yearOfSemester(r.students.classes?.current_semester) === year);
    return list;
  }, [registrations.data, tab, statusFilter, year]);
  const tabCounts = useMemo(() => {
    const all = registrations.data ?? [];
    return {
      all: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      fee_pending: all.filter((r) => r.fee_status !== "paid").length,
      rejected: all.filter((r) => r.status === "rejected").length,
    };
  }, [registrations.data]);
  const examOptions = useMemo(() => [...(exams.data ?? [])].sort((a, b) => b.id - a.id), [exams.data]);
  const [showRegister, setShowRegister] = useState(false);
  const [viewing, setViewing] = useState<ExamRegistration | null>(null);

  function handlePrintOne(r: ExamRegistration) {
    setViewing(r);
    setTimeout(() => window.print(), 200);
  }

  function handleExport() {
    downloadCsv(
      "exam-registrations",
      [
        { header: "Register no", value: (r: ExamRegistration) => r.students.register_no ?? r.students.student_id_no },
        { header: "Name", value: (r: ExamRegistration) => studentName(r.students) ?? "" },
        { header: "Department", value: (r: ExamRegistration) => r.students.classes?.departments.code ?? "" },
        { header: "Semester", value: (r: ExamRegistration) => r.students.classes?.current_semester ?? "" },
        { header: "Courses", value: (r: ExamRegistration) => r.courses_count },
        { header: "Arrears", value: (r: ExamRegistration) => r.arrears_count },
        { header: "Fee status", value: (r: ExamRegistration) => r.fee_status },
        { header: "Status", value: (r: ExamRegistration) => r.status },
      ],
      rows,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Exam Registration"
        subtitle="Student-wise registration, course selection, fee status and approvals for the current cycle."
        actions={
          <>
            <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-56">
              {examOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.exam_category} · {e.academic_year} · Sem {e.semester}
                </option>
              ))}
            </Select>
            <Button variant="secondary" className="w-auto" disabled={rows.length === 0} onClick={handleExport}>
              Export
            </Button>
            <Button variant="primarySmall" className="w-auto" disabled={!effectiveExamId} onClick={() => setShowRegister(true)}>
              + Register student
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Registered students" value={stats.data?.registered ?? (stats.isLoading ? "…" : 0)} icon="how_to_reg" />
        <StatCard
          label="Eligible students"
          value={stats.data?.eligible ?? (stats.isLoading ? "…" : 0)}
          icon="verified"
          sub={stats.data && stats.data.registered > 0 ? `${Math.round((stats.data.eligible / stats.data.registered) * 100)}% of registered` : undefined}
        />
        <StatCard
          label="Pending registrations"
          value={stats.data?.pending_registrations ?? (stats.isLoading ? "…" : 0)}
          icon="hourglass_empty"
          sub={stats.data?.registration_window_closes_in_days != null ? `${stats.data.registration_window_closes_in_days} days to window close` : undefined}
        />
        <StatCard
          label="Fee not paid"
          value={stats.data?.fee_not_paid ?? (stats.isLoading ? "…" : 0)}
          icon="payments"
          sub={stats.data?.fee_outstanding_amount != null ? `${currencyShort(stats.data.fee_outstanding_amount)} outstanding` : undefined}
        />
      </div>

      {departments.isLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <div className="flex flex-col gap-3">
            <PillTabs
              options={STATUS_TABS.map((t) => ({ ...t, label: `${t.label} (${tabCounts[t.key]})` }))}
              value={tab}
              onChange={(k) => setTab(k as TabKey)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <SearchBar placeholder="Search roll number or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
              <Select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[140px]">
                <option value="">All departments</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </Select>
              <Select value={year ?? ""} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[110px]">
                <option value="">All years</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-auto min-w-[130px]">
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {registrations.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Registrations</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No registrations match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[140px]">Department</div>
                <div className="w-[80px]">Courses</div>
                <div className="w-[80px]">Arrears</div>
                <div className="w-[100px]">Fee</div>
                <div className="w-[100px]">Status</div>
                <div className="w-[260px] text-right">Actions</div>
              </div>
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{studentName(r.students) ?? r.students.register_no ?? r.students.student_id_no}</div>
                    <div className="text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
                  </div>
                  <div className="w-[140px] text-[12.5px] text-ink">
                    {r.students.classes?.departments.code ?? "—"} · {r.students.classes?.current_semester ? `Sem ${r.students.classes.current_semester}` : "—"}
                  </div>
                  <div className="w-[80px] text-[12.5px] text-ink">{r.courses_count}</div>
                  <div className="w-[80px] text-[12.5px] text-ink">{r.arrears_count}</div>
                  <div className="w-[100px]">
                    <button
                      type="button"
                      className="cursor-pointer"
                      title="Click to update fee status"
                      onClick={() => updateFee.mutate({ id: r.id, fee_status: FEE_CYCLE[r.fee_status] })}
                    >
                      <Badge tone={FEE_TONE[r.fee_status]}>{r.fee_status.toUpperCase()}</Badge>
                    </button>
                  </div>
                  <div className="w-[100px]">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status.toUpperCase()}</Badge>
                  </div>
                  <div className="flex w-[260px] shrink-0 items-center justify-end gap-2">
                    <button type="button" className="text-[12px] font-bold text-primary hover:underline" onClick={() => setViewing(r)}>
                      View
                    </button>
                    <button type="button" className="text-[12px] font-bold text-primary hover:underline" onClick={() => handlePrintOne(r)}>
                      Print
                    </button>
                    {r.status === "pending" && (
                      <>
                        <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, status: "approved" })}>
                          Approve
                        </Button>
                        <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, status: "rejected" })}>
                          Reject
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
      <ViewRegistrationModal row={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function ViewRegistrationModal({ row, onClose }: { row: ExamRegistration | null; onClose: () => void }) {
  return (
    <Modal open={row != null} onClose={onClose} title="Registration details" subtitle={row ? row.students.register_no ?? row.students.student_id_no : undefined}>
      {row && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[15px] font-extrabold text-ink">{studentName(row.students) ?? row.students.register_no}</div>
            <div className="text-[12.5px] text-muted">
              {row.students.classes?.departments.code ?? "—"} · {row.students.classes?.current_semester ? `Semester ${row.students.classes.current_semester}` : "—"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-input border border-border-default p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Exam</div>
              <div className="mt-1 text-[13.5px] font-bold text-ink">{row.exams.exam_category} · {row.exams.academic_year} · Sem {row.exams.semester}</div>
            </div>
            <div className="rounded-input border border-border-default p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Registered on</div>
              <div className="mt-1 text-[13.5px] font-bold text-ink">{new Date(row.registered_at).toLocaleDateString()}</div>
            </div>
            <div className="rounded-input border border-border-default p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Courses</div>
              <div className="mt-1 text-[13.5px] font-bold text-ink">{row.courses_count}</div>
            </div>
            <div className="rounded-input border border-border-default p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Arrears</div>
              <div className="mt-1 text-[13.5px] font-bold text-ink">{row.arrears_count}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={FEE_TONE[row.fee_status]}>{row.fee_status.toUpperCase()}</Badge>
            <Badge tone={STATUS_TONE[row.status]}>{row.status.toUpperCase()}</Badge>
            {row.approved_at && <span className="text-[12px] text-muted">Reviewed {new Date(row.approved_at).toLocaleDateString()}</span>}
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" className="w-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
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
    create.mutate({ exam_id: examId, student_id: lookup.data.id }, { onSuccess: handleClose });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Register student" subtitle="Look up by register number, then add to this exam.">
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
