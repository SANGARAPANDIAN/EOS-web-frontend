"use client";

import { useState } from "react";
import { Card, Badge, Button, Select, Textarea, EmptyState, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useMyClearanceRequests,
  useCreateClearanceRequest,
  useExamsList,
  type ClearanceRequest,
  type ClearanceType,
} from "@/modules/student/api/hallTicketClearance";
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

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">No due / hall-ticket clearance</h1>

      <Card className="max-w-[560px]">
        <h2 className="mb-3 text-[15px] font-bold text-ink">Request a clearance exception</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <Card>
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
    </div>
  );
}
