"use client";

import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, SearchBar, Select, type BadgeTone } from "@/components/ui";
import {
  useComplaints,
  useUpdateComplaint,
  type Complaint,
  type ComplaintCategory,
  type ComplaintStatus,
} from "@/modules/hostel-warden/api/complaints";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatDayAndTime } from "@/lib/utils/date";

const STATUS_OPTIONS: { value: "all" | ComplaintStatus; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "escalated", label: "Escalated" },
];

const CATEGORY_OPTIONS: { value: "all" | ComplaintCategory; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "carpentry", label: "Carpentry" },
  { value: "network", label: "Network" },
  { value: "mess", label: "Mess" },
  { value: "facilities", label: "Facilities" },
  { value: "other", label: "Other" },
];

const STATUS_TONE: Record<ComplaintStatus, BadgeTone> = {
  open: "danger",
  in_progress: "accentDark",
  resolved: "accent",
  escalated: "danger",
};
const STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  escalated: "Escalated",
};
const NEXT_ACTION: Partial<Record<ComplaintStatus, { label: string; next: ComplaintStatus }>> = {
  open: { label: "Assign", next: "in_progress" },
  in_progress: { label: "Mark resolved", next: "resolved" },
};

export default function ComplaintsPage() {
  const complaints = useComplaints({ page_size: 100 });
  const update = useUpdateComplaint();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ComplaintStatus>("all");
  const [category, setCategory] = useState<"all" | ComplaintCategory>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = complaints.data?.data ?? [];

  const filtered = rows.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (category !== "all" && c.category !== category) return false;
    if (search && !`${c.title} ${c.room_number ?? ""} ${c.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const now = Date.now();
  const stats = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = rows.filter((c) => new Date(c.created_at) >= startOfMonth);
    return {
      raised: thisMonth.length,
      resolved: thisMonth.filter((c) => c.status === "resolved").length,
      openBeyond48h: rows.filter((c) => c.status !== "resolved" && now - new Date(c.created_at).getTime() > 48 * 60 * 60 * 1000).length,
      escalated: rows.filter((c) => c.status === "escalated").length,
    };
  }, [rows, now]);

  function advance(c: Complaint) {
    const action = NEXT_ACTION[c.status];
    if (!action) return;
    update.mutate({ id: c.id, status: action.next });
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Complaints</h1>
        <p className="mt-1 text-[13px] text-muted">Maintenance and mess issues raised by residents.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar className="min-w-[260px] flex-1" placeholder="Complaint, room or category" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="w-auto shrink-0" value={status} onChange={(e) => setStatus(e.target.value as "all" | ComplaintStatus)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select className="w-auto shrink-0" value={category} onChange={(e) => setCategory(e.target.value as "all" | ComplaintCategory)}>
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 items-start">
        {complaints.isLoading ? (
          <EmptyState message="Loading…" />
        ) : filtered.length === 0 ? (
          <EmptyState message="No complaints in this view." />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15.5px] font-bold text-ink">{c.title}</div>
                    <div className="mt-1 text-[13px] text-muted">
                      <button type="button" onClick={() => setSelectedId(c.student.id)} className="font-bold text-primary hover:underline">
                        {c.student.name}
                      </button>{" "}
                      · {c.category} · {c.room_number ?? "—"} · raised {formatDayAndTime(c.created_at)}
                    </div>
                    {c.description && <div className="mt-2 text-[13.5px] text-body">{c.description}</div>}
                  </div>
                  <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </div>
                {NEXT_ACTION[c.status] && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => advance(c)}
                      disabled={update.isPending}
                      className="rounded-[7px] bg-primary px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
                    >
                      {NEXT_ACTION[c.status]!.label}
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <Card>
          <h2 className="mb-3 text-[15px] font-extrabold text-ink">This month</h2>
          <div className="flex flex-col gap-2.5 text-[13.5px]">
            <div className="flex justify-between border-b border-divider pb-2.5">
              <span className="text-muted">Raised</span>
              <span className="font-bold text-ink">{stats.raised}</span>
            </div>
            <div className="flex justify-between border-b border-divider pb-2.5">
              <span className="text-muted">Resolved</span>
              <span className="font-bold text-ink">{stats.resolved}</span>
            </div>
            <div className="flex justify-between border-b border-divider pb-2.5">
              <span className="text-muted">Open beyond 48 hrs</span>
              <span className="font-bold text-ink">{stats.openBeyond48h}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Escalated</span>
              <span className="font-bold text-ink">{stats.escalated}</span>
            </div>
          </div>
        </Card>
      </div>

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
