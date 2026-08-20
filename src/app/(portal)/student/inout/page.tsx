"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Textarea, DataTable, EmptyState } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useMyCampusOutings, useCreateCampusOuting, type CampusOuting } from "@/modules/student/api/campusOutings";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "apply" | "history";

// Same status set as the academic Leave tab - a campus outing goes through
// the same Advisor (Faculty mentor) -> HoD chain, just on its own table
// (campus_outing_requests, not student_leaves - see prisma/README.md).
// warden_approved is never actually produced here; included only so
// CampusOutingStatus's full union always has a label.
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  faculty_approved: "Faculty approved",
  hod_approved: "HOD approved",
  rejected: "Rejected",
  warden_approved: "Approved",
};

export default function InOutPage() {
  const [tab, setTab] = useState<Tab>("apply");
  const outings = useMyCampusOutings();
  const createOuting = useCreateCampusOuting();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createOuting.mutateAsync({
        from_date: fromDate,
        to_date: toDate,
        start_time: startTime,
        return_time: returnTime || undefined,
        reason: reason || undefined,
      });
      setSuccess(true);
      setFromDate("");
      setToDate("");
      setStartTime("");
      setReturnTime("");
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const columns: DataTableColumn<CampusOuting>[] = [
    { key: "from", header: "From", width: "1fr", render: (r) => formatDisplayDate(r.from_date) },
    { key: "out", header: "Out", width: "0.8fr", render: (r) => r.start_time },
    { key: "to", header: "To", width: "1fr", render: (r) => formatDisplayDate(r.to_date) },
    { key: "in", header: "In", width: "0.8fr", render: (r) => r.return_time ?? "—" },
    { key: "reason", header: "Reason", width: "1.5fr", render: (r) => r.reason ?? "—" },
    { key: "approver", header: "Approved by", width: "1.3fr", render: (r) => r.approved_by_hod ?? r.approved_by_faculty ?? "—" },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">In / out</h1>
          <p className="mt-1 text-[13.5px] text-muted">Requests are routed to your class advisor, then the HoD</p>
        </div>
        <SegmentedTabs
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "apply" ? (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Out date</label>
                <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Out time</label>
                <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Return date</label>
                <Input type="date" required value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Return time (optional)</label>
                <Input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
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
            {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Outing request submitted to your class advisor.</div>}

            <Button type="submit" disabled={!fromDate || !toDate || !startTime || createOuting.isPending}>
              {createOuting.isPending ? "Submitting…" : "Submit outing request"}
            </Button>
          </form>
        </Card>
      ) : outings.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <DataTable columns={columns} data={outings.data?.data ?? []} rowKey={(r) => r.id} emptyMessage="No outing requests yet." />
      )}
    </div>
  );
}
