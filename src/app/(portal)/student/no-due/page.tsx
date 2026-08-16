"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Select, Textarea, EmptyState, DataTable, Icon } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useMyClearanceRequests,
  useCreateClearanceRequest,
  useExamsList,
  type ClearanceRequest,
  type ClearanceType,
} from "@/modules/student/api/hallTicketClearance";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";
import { useMyAcademicClearance, type AcademicClearanceSubject } from "@/modules/student/api/academicClearance";
import { useLibraryDuesSummary } from "@/modules/student/api/library";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const CLEARANCE_TYPE_LABEL: Record<ClearanceType, string> = {
  fee_due: "Fee due exception",
  no_due: "General no-due",
  library_due: "Library due exception",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1);

// Established hover language for card-like elements in this app (matches
// bonafide/page.tsx's option cards and timetable/page.tsx's day cards) —
// a border-color shift, no shadow-lift convention exists here.
const CARD_HOVER = "transition-colors hover:border-border-accent";

function Tick({ state }: { state: boolean | undefined }) {
  if (state === undefined) return <span className="text-subtle">—</span>;
  return state ? <Icon name="check" size={18} className="text-primary" /> : null;
}

export default function NoDuePage() {
  const requests = useMyClearanceRequests();
  const exams = useExamsList();
  const createRequest = useCreateClearanceRequest();

  const [examId, setExamId] = useState<number | "">("");
  const [clearanceType, setClearanceType] = useState<ClearanceType | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (examId === "" || clearanceType === "") return;
    setError(null);
    try {
      await createRequest.mutateAsync({ exam_id: examId, clearance_type: clearanceType, reason: reason || undefined });
      setSuccess(true);
      setExamId("");
      setClearanceType("");
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const columns: DataTableColumn<ClearanceRequest>[] = [
    { key: "exam", header: "Exam", width: "1.8fr", render: (r) => `${r.exam.type} · ${r.exam.academic_year} Sem ${r.exam.semester}` },
    { key: "type", header: "Type", width: "1.3fr", render: (r) => <Badge tone="accent">{CLEARANCE_TYPE_LABEL[r.clearance_type]}</Badge> },
    { key: "applied", header: "Applied", width: "1fr", render: (r) => formatDisplayDate(r.requested_at) },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.effective_status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.effective_status]}</Badge>,
    },
  ];

  // ── Academic clearance (subjects × assignments × attendance × status) ──
  const academicCalendar = useMyAcademicCalendar();
  const [semesterOverride, setSemesterOverride] = useState<number | null>(null);
  const semester = semesterOverride ?? academicCalendar.data?.semester ?? null;
  const clearance = useMyAcademicClearance(semester);

  const maxAssignments = useMemo(
    () => Math.max(0, ...(clearance.data?.subjects.map((s) => s.assignments.length) ?? [0])),
    [clearance.data],
  );

  const clearanceColumns: DataTableColumn<AcademicClearanceSubject>[] = useMemo(() => {
    const cols: DataTableColumn<AcademicClearanceSubject>[] = [
      {
        key: "subject",
        header: "Subject",
        width: "1.6fr",
        render: (s) => (
          <div>
            <div className="font-bold text-ink">{s.subject_name}</div>
            <div className="text-[11px] text-muted">{s.subject_code}</div>
          </div>
        ),
      },
    ];
    for (let i = 0; i < maxAssignments; i++) {
      cols.push({
        key: `assignment-${i}`,
        header: `Assignment ${i + 1}`,
        width: "0.9fr",
        align: "center",
        render: (s) => <Tick state={i < s.assignments.length ? s.assignments[i].is_submitted : undefined} />,
      });
    }
    cols.push({
      key: "attendance",
      header: "Attendance",
      width: "0.9fr",
      align: "center",
      render: (s) => <Tick state={s.attendance_cleared} />,
    });
    cols.push({
      key: "status",
      header: "Status",
      width: "0.9fr",
      align: "center",
      render: (s) => <Tick state={s.cleared} />,
    });
    return cols;
  }, [maxAssignments]);

  // ── Library ──
  const libraryDues = useLibraryDuesSummary();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">No due / hall-ticket clearance</h1>

      <Card className={CARD_HOVER}>
        <h2 className="mb-3 text-[15px] font-bold text-ink">Request a clearance exception</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Exam</label>
              <Select required value={examId} onChange={(e) => setExamId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select an exam</option>
                {exams.data?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.academic_year} · Semester {e.semester}
                    {e.title ? ` · ${e.title}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Clearance type</label>
              <Select required value={clearanceType} onChange={(e) => setClearanceType(e.target.value as ClearanceType)}>
                <option value="">Select a type</option>
                {Object.entries(CLEARANCE_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold text-muted">Reason</label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
          </div>

          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Clearance request submitted for HOD review.</div>}

          <Button type="submit" disabled={examId === "" || clearanceType === "" || createRequest.isPending}>
            {createRequest.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </form>
      </Card>

      {requests.isLoading ? (
        <Card className={CARD_HOVER}>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={requests.data?.data ?? []}
          rowKey={(r) => r.id}
          emptyMessage="No clearance requests yet."
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink">Academic clearance</h2>
        <Select
          value={semester ?? ""}
          onChange={(e) => setSemesterOverride(Number(e.target.value))}
          className="w-auto"
        >
          {SEMESTERS.map((n) => (
            <option key={n} value={n}>
              Semester {n}
            </option>
          ))}
        </Select>
      </div>

      {clearance.isLoading ? (
        <Card className={CARD_HOVER}>
          <EmptyState message="Loading…" />
        </Card>
      ) : !clearance.data || clearance.data.subjects.length === 0 ? (
        <Card className={CARD_HOVER}>
          <EmptyState message="No subjects found for this semester." />
        </Card>
      ) : (
        <DataTable
          columns={clearanceColumns}
          data={clearance.data.subjects}
          rowKey={(s) => s.subject_id}
          emptyMessage="No subjects found for this semester."
        />
      )}

      <h2 className="text-[18px] font-bold text-ink">Library</h2>
      <Card className={CARD_HOVER}>
        {libraryDues.isLoading ? (
          <EmptyState message="Loading…" />
        ) : libraryDues.data && libraryDues.data.total_due > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-icon-chip">
              <Icon name="local_library" size={20} className="text-primary" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-ink">
                ₹{libraryDues.data.total_due.toLocaleString("en-IN")} outstanding
              </div>
              <div className="text-[12px] text-muted">
                {libraryDues.data.overdue_count} overdue · {libraryDues.data.unpaid_fine_count} unpaid fine(s)
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] font-semibold text-primary-dark">
            <Icon name="check_circle" size={18} />
            No outstanding library dues.
          </div>
        )}
      </Card>
    </div>
  );
}
