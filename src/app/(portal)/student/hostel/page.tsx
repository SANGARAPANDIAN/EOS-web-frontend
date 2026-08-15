"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Select, Textarea, EmptyState, Icon, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useMyHostelRoom,
  useMyHostelOutings,
  useCreateHostelOuting,
  useCreateHostelComplaint,
  useCreateMessFeedback,
  type HostelOuting,
  type HostelComplaintCategory,
} from "@/modules/student/api/hostel";
import { useMyLeaves, useCreateLeave, type LeaveRow } from "@/modules/student/api/leave";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "outing" | "leave" | "complaints" | "mess";

const COMPLAINT_CATEGORIES: HostelComplaintCategory[] = ["plumbing", "electrical", "carpentry", "network", "mess", "facilities", "other"];

const RATING_LABELS = ["Needs improvement", "Satisfactory", "Good", "Very good", "Excellent"];

const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", warden_approved: "Approved", rejected: "Rejected" };

function OutingSection() {
  const outings = useMyHostelOutings();
  const createOuting = useCreateHostelOuting();

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

  const columns: DataTableColumn<HostelOuting>[] = [
    { key: "from", header: "From", width: "1fr", render: (r) => formatDisplayDate(r.from_date) },
    { key: "out", header: "Out", width: "0.8fr", render: (r) => r.start_time },
    { key: "to", header: "To", width: "1fr", render: (r) => formatDisplayDate(r.to_date) },
    { key: "in", header: "In", width: "0.8fr", render: (r) => r.return_time ?? "—" },
    { key: "reason", header: "Reason", width: "1.5fr", render: (r) => r.reason ?? "—" },
    { key: "approver", header: "Approved by", width: "1.3fr", render: (r) => r.approved_by_warden ?? "—" },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 text-[15px] font-bold text-ink">Apply for an outing</h2>
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
          {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Outing request submitted for warden review.</div>}

          <Button type="submit" disabled={!fromDate || !toDate || !startTime || createOuting.isPending}>
            {createOuting.isPending ? "Submitting…" : "Submit outing request"}
          </Button>
        </form>
      </Card>

      {outings.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <DataTable columns={columns} data={outings.data?.data ?? []} rowKey={(r) => r.id} emptyMessage="No outing requests yet." />
      )}
    </div>
  );
}

function HostelLeaveSection() {
  // routed_to_warden: true — same /me/leaves table the academic Leave tab
  // uses, but this always sets routed_to_warden so it skips Faculty/HoD and
  // goes straight to the Warden (see prisma/README.md). Scoped to
  // routed_to_warden: true here so a leave applied from the academic tab
  // never shows up in this list.
  const leaves = useMyLeaves(true);
  const createLeave = useCreateLeave();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createLeave.mutateAsync({ from_date: fromDate, to_date: toDate, reason: reason || undefined, routed_to_warden: true });
      setSuccess(true);
      setFromDate("");
      setToDate("");
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const columns: DataTableColumn<LeaveRow>[] = [
    { key: "from", header: "From", width: "1fr", render: (r) => formatDisplayDate(r.from_date) },
    { key: "to", header: "To", width: "1fr", render: (r) => formatDisplayDate(r.to_date) },
    { key: "reason", header: "Reason", width: "1.8fr", render: (r) => r.reason ?? "—" },
    { key: "approver", header: "Approved by", width: "1.3fr", render: (r) => r.approved_by_warden ?? "—" },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-[15px] font-bold text-ink">Apply for hostel leave</h2>
        <p className="mb-3 text-[12.5px] text-muted">Goes straight to the Warden for approval — not through your class advisor or HoD.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">From date</label>
              <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">To date</label>
              <Input type="date" required value={toDate} onChange={(e) => setToDate(e.target.value)} />
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
          {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Hostel leave request submitted for warden review.</div>}

          <Button type="submit" disabled={!fromDate || !toDate || createLeave.isPending}>
            {createLeave.isPending ? "Submitting…" : "Submit hostel leave request"}
          </Button>
        </form>
      </Card>

      {leaves.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <DataTable columns={columns} data={leaves.data?.data ?? []} rowKey={(r) => r.id} emptyMessage="No hostel leave requests yet." />
      )}
    </div>
  );
}

function ComplaintForm() {
  const createComplaint = useCreateHostelComplaint();
  const [category, setCategory] = useState<HostelComplaintCategory | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (category === "") return;
    setError(null);
    try {
      await createComplaint.mutateAsync({ category, title, description: description || undefined });
      setSuccess(true);
      setCategory("");
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold text-muted">Category</label>
            <Select required value={category} onChange={(e) => setCategory(e.target.value as HostelComplaintCategory)}>
              <option value="">Select a category</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold text-muted">Title</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Brief summary" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Description</label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
        </div>

        {error && (
          <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
            {error}
          </div>
        )}
        {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Complaint submitted.</div>}

        <Button type="submit" disabled={category === "" || !title.trim() || createComplaint.isPending}>
          {createComplaint.isPending ? "Submitting…" : "Submit complaint"}
        </Button>
      </form>
    </Card>
  );
}

function MessFeedbackForm() {
  const createFeedback = useCreateMessFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!rating) return;
    setError(null);
    try {
      await createFeedback.mutateAsync({ rating, comment: comment || undefined });
      setSuccess(true);
      setRating(null);
      setComment("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11.5px] font-bold text-muted">How was the mess food?</label>
          <div className="flex flex-wrap gap-2">
            {RATING_LABELS.map((label, i) => {
              const value = i + 1;
              const active = rating === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`rounded-[9px] border px-3 py-2 text-[12.5px] font-bold transition-colors ${
                    active ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-body hover:bg-nav-hover"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-bold text-muted">Comments</label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" />
        </div>

        {error && (
          <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
            {error}
          </div>
        )}
        {success && <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary-dark">Feedback submitted, thank you.</div>}

        <Button onClick={handleSubmit} disabled={!rating || createFeedback.isPending} className="self-start">
          {createFeedback.isPending ? "Submitting…" : "Submit feedback"}
        </Button>
      </div>
    </Card>
  );
}

export default function HostelPage() {
  const room = useMyHostelRoom();
  const [tab, setTab] = useState<Tab>("outing");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Hostel</h1>

      {room.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !room.data?.is_hostel_resident ? (
        <Card>
          <EmptyState message="You are not currently assigned a hostel room." />
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-[10px] bg-icon-chip">
              <Icon name="apartment" size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-ink">
                {room.data.hostel_name} · Room {room.data.room_number}
              </div>
              <div className="text-[12.5px] text-muted">
                {room.data.room_type_name} {room.data.mess_type && `· ${room.data.mess_type} mess`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {room.data?.is_hostel_resident && (
        <>
          <SegmentedTabs
            options={[
              { key: "outing", label: "Outing" },
              { key: "leave", label: "Leave" },
              { key: "complaints", label: "Complaints" },
              { key: "mess", label: "Mess feedback" },
            ]}
            value={tab}
            onChange={(k) => setTab(k as Tab)}
            className="self-start"
          />
          {tab === "outing" && <OutingSection />}
          {tab === "leave" && <HostelLeaveSection />}
          {tab === "complaints" && <ComplaintForm />}
          {tab === "mess" && <MessFeedbackForm />}
        </>
      )}
    </div>
  );
}
