"use client";

import { useState } from "react";
import { Avatar, Badge, Button, Card, EmptyState, Icon, Input, Modal, PillTabs, Select, SkeletonRows } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useApproveAppraisalRequest,
  useAppraisalRequest,
  useAppraisalRequests,
  useRejectAppraisalRequest,
  useScoreAppraisalRequest,
  type AppraisalRequest,
  type AppraisalRequestStatus,
} from "@/modules/hr/api/appraisalRequests";
import { formatDisplayDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";
import { AppraisalAttachmentsList } from "@/components/shared/AppraisalAttachmentsList";

const CURRENT_YEAR = new Date().getFullYear();
/** Last five academic years, newest first — same "YYYY-YYYY" free-text convention the criteria library writes. */
const ACADEMIC_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const startYear = CURRENT_YEAR - i;
  return `${startYear}-${startYear + 1}`;
});

const STATUS_LABEL: Record<AppraisalRequestStatus, string> = {
  submitted: "Submitted",
  hod_reviewed: "HOD reviewed",
  hr_scored: "HR scored",
  management_approved: "Approved",
  rejected: "Rejected",
};

/**
 * hod_reviewed / hr_scored are the two states where HR owes an action —
 * flagged with the more attention-grabbing tones. submitted (still with
 * HOD), management_approved and rejected are all terminal-from-HR's-view,
 * so they share the calmer neutral/accent tones instead.
 */
const STATUS_TONE: Record<AppraisalRequestStatus, BadgeTone> = {
  submitted: "neutral",
  hod_reviewed: "accentDark",
  hr_scored: "danger",
  management_approved: "accent",
  rejected: "neutral",
};

function facultyName(f: { prefix?: string | null; first_name: string; last_name: string }): string {
  return [f.prefix, f.first_name, f.last_name].filter(Boolean).join(" ");
}

function scoreSummary(r: AppraisalRequest): string {
  if (r.entries.length === 0) return "No criteria entries";
  const scored = r.entries.filter((e) => e.score !== null).length;
  return `${scored}/${r.entries.length} criteria scored`;
}

interface AppraisalDetailContentProps {
  request: AppraisalRequest;
  onDone: () => void;
}

function AppraisalDetailContent({ request, onDone }: AppraisalDetailContentProps) {
  const scoreRequest = useScoreAppraisalRequest();
  const approveRequest = useApproveAppraisalRequest();
  const rejectRequest = useRejectAppraisalRequest();

  const canScore = request.status === "hod_reviewed";
  const canDecide = request.status === "hr_scored";

  const [scores, setScores] = useState<Record<number, string>>(() =>
    Object.fromEntries(request.entries.map((e) => [e.id, e.score != null ? String(e.score) : ""])),
  );
  const [error, setError] = useState<string | null>(null);

  function scoreValid(entryId: number, maxScore: number): boolean {
    const raw = scores[entryId];
    if (raw === undefined || raw.trim() === "") return false;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= maxScore;
  }

  const allValid = request.entries.length > 0 && request.entries.every((e) => scoreValid(e.id, e.criteria.max_score));
  const isPending = scoreRequest.isPending || approveRequest.isPending || rejectRequest.isPending;

  async function submitScores() {
    if (!allValid) {
      setError("Enter a valid score (0 up to the max) for every criterion.");
      return;
    }
    setError(null);
    try {
      await scoreRequest.mutateAsync({
        id: request.id,
        entries: request.entries.map((e) => ({ entry_id: e.id, score: Number(scores[e.id]) })),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit scores.");
    }
  }

  async function decide(action: "approve" | "reject") {
    setError(null);
    try {
      if (action === "approve") await approveRequest.mutateAsync(request.id);
      else await rejectRequest.mutateAsync(request.id);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this review.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Badge tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
        <span className="text-[12.5px] text-muted">Submitted {formatDisplayDate(request.created_at)}</span>
      </div>

      <div className="flex flex-col">
        {request.entries.length === 0 ? (
          <EmptyState message="No criteria entries on this submission." />
        ) : (
          request.entries.map((entry) => {
            const touched = scores[entry.id] !== undefined && scores[entry.id] !== "";
            const valid = scoreValid(entry.id, entry.criteria.max_score);
            return (
              <div key={entry.id} className="border-t border-divider py-3.5 first:border-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-ink">{entry.criteria.name}</div>
                    <div className="mt-0.5 text-[12px] text-subtle">
                      {entry.criteria.division.name} · Max {entry.criteria.max_score}
                    </div>
                  </div>
                  {!canScore && (
                    <span className="shrink-0 text-[13.5px] font-bold text-ink">
                      {entry.score ?? "—"} / {entry.criteria.max_score}
                    </span>
                  )}
                </div>
                {entry.description && <p className="mt-1.5 text-[12.5px] text-body">{entry.description}</p>}
                {canScore && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={entry.criteria.max_score}
                      value={scores[entry.id] ?? ""}
                      onChange={(e) => setScores((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                      className={cn("w-24", touched && !valid && "border-danger-border")}
                    />
                    <span className="text-[12.5px] text-subtle">/ {entry.criteria.max_score}</span>
                    {touched && !valid && (
                      <span className="text-[12px] font-semibold text-danger-fg">0–{entry.criteria.max_score} only</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-divider pt-3.5">
        <div className="mb-2 text-[12px] font-bold tracking-[.05em] text-muted uppercase">Supporting documents</div>
        <AppraisalAttachmentsList attachments={request.attachments} />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-divider pt-3.5 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-muted">HOD reviewer</span>
          <span className="font-semibold text-ink">{request.hod_reviewer?.email ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">HOD reviewed on</span>
          <span className="font-semibold text-ink">
            {request.hod_reviewed_at ? formatDisplayDate(request.hod_reviewed_at) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Management approver</span>
          <span className="font-semibold text-ink">{request.management_approver?.email ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Approved on</span>
          <span className="font-semibold text-ink">
            {request.management_approved_at ? formatDisplayDate(request.management_approved_at) : "—"}
          </span>
        </div>
      </div>

      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

      {(canScore || canDecide) && (
        <div className="mt-1 flex justify-end gap-2.5 border-t border-divider pt-5">
          {canScore && (
            <Button variant="primarySmall" className="w-auto px-6" disabled={!allValid || isPending} onClick={submitScores}>
              {scoreRequest.isPending ? "Submitting…" : "Submit scores"}
            </Button>
          )}
          {canDecide && (
            <>
              <Button variant="secondary" className="w-auto" disabled={isPending} onClick={() => decide("reject")}>
                Reject
              </Button>
              <Button variant="primarySmall" className="w-auto px-6" disabled={isPending} onClick={() => decide("approve")}>
                {approveRequest.isPending ? "Approving…" : "Approve"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface AppraisalDetailModalProps {
  requestId: number | null;
  onClose: () => void;
}

function AppraisalDetailModal({ requestId, onClose }: AppraisalDetailModalProps) {
  const detail = useAppraisalRequest(requestId);
  const r = detail.data;

  return (
    <Modal
      open={requestId !== null}
      onClose={onClose}
      title={r ? facultyName(r.faculty) : "Employee review"}
      subtitle={r ? `${r.faculty.designation} · AY ${r.academic_year}` : undefined}
    >
      {!r ? (
        <EmptyState loading={detail.isLoading} message="Could not load this request." size={30} />
      ) : (
        <AppraisalDetailContent key={r.id} request={r} onDone={onClose} />
      )}
    </Modal>
  );
}

export default function HrEmployeeReviewsPage() {
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AppraisalRequestStatus>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const requests = useAppraisalRequests({
    academic_year: academicYearFilter !== "all" ? academicYearFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const rows = requests.data?.data ?? [];
  const meta = requests.data?.meta;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Appraisal requests</h1>
        <p className="mt-1 text-[13px] text-muted">
          Appraisal requests approved by an HoD · score once reviewed, then approve or reject
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <PillTabs
          value={statusFilter}
          onChange={(k) => {
            setStatusFilter(k as typeof statusFilter);
            setPage(1);
          }}
          options={[
            { key: "all", label: "All" },
            { key: "submitted", label: "Submitted" },
            { key: "hod_reviewed", label: "HOD reviewed" },
            { key: "hr_scored", label: "HR scored" },
            { key: "management_approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ]}
        />

        <Select
          value={academicYearFilter}
          onChange={(e) => {
            setAcademicYearFilter(e.target.value);
            setPage(1);
          }}
          className="w-[160px] shrink-0"
        >
          <option value="all">All years</option>
          {ACADEMIC_YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      {requests.isLoading ? (
        <SkeletonRows count={5} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState message="No reviews match these filters." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="hover-lift flex cursor-pointer items-center gap-4 rounded-[11px] border border-border-default px-5 py-4"
            >
              <Avatar name={facultyName(r.faculty)} imageUrl={r.faculty.profile_url} size={38} />
              <div className="w-[220px] min-w-0">
                <div className="truncate text-[14px] font-bold text-ink">{facultyName(r.faculty)}</div>
                <div className="truncate text-[12px] text-subtle">{r.faculty.designation}</div>
              </div>
              <div className="w-[100px] shrink-0 text-[13px] font-bold text-ink">{r.academic_year}</div>
              <Badge tone={STATUS_TONE[r.status]} className="shrink-0">
                {STATUS_LABEL[r.status]}
              </Badge>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-[12.5px] text-muted">
                {r.attachments.length > 0 && (
                  <span
                    className="flex shrink-0 items-center gap-0.5"
                    title={`${r.attachments.length} supporting document${r.attachments.length === 1 ? "" : "s"}`}
                  >
                    <Icon name="attach_file" size={13} /> {r.attachments.length}
                  </span>
                )}
                {scoreSummary(r)}
              </div>
              <Icon name="chevron_right" size={18} className="shrink-0 text-subtle" />
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12.5px] text-muted">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" className="w-auto px-4 py-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              className="w-auto px-4 py-2"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AppraisalDetailModal requestId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
