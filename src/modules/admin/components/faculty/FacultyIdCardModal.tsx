"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { Button, Modal, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { facultyKeys, fetchFacultyById, type Faculty } from "@/modules/admin/api/faculty";
import { useFacultyIdCardBulkStatus, useIssueFacultyIdCard, type FacultyIdCardStatus } from "@/modules/admin/api/facultyIdCard";
import { generateFacultyIdCardsPdf } from "@/modules/admin/lib/id-card-image";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";
import { FlipIdCard } from "@/modules/admin/components/faculty/FlipIdCard";
import { formatDate, formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";

interface FacultyIdCardModalProps {
  open: boolean;
  onClose: () => void;
  faculty: Faculty[];
}

type RowStatus = "ready" | "pending" | "issued" | "failed";

export function FacultyIdCardModal({ open, onClose, faculty }: FacultyIdCardModalProps) {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const facultyIds = faculty.map((f) => f.id);
  const { data: statusMap, isLoading: statusLoading } = useFacultyIdCardBulkStatus(open ? facultyIds : []);
  const issueIdCard = useIssueFacultyIdCard();

  const [rowStatus, setRowStatus] = useState<Record<number, RowStatus>>({});
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const [issueResults, setIssueResults] = useState<Record<number, FacultyIdCardStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // Full records (with back-side fields — DOB/address/etc. — that the
  // summary rows this modal is opened with don't carry) fetched once
  // issuing finishes, then reused for both the flip-card preview and the
  // print download rather than re-fetched for each.
  const [fullRecords, setFullRecords] = useState<Record<number, Faculty>>({});
  const [previewId, setPreviewId] = useState<number | null>(null);

  function reset() {
    setRowStatus({});
    setRowError({});
    setIssueResults({});
    setIsSubmitting(false);
    setSubmitted(false);
    setIsDownloading(false);
    setFullRecords({});
    setPreviewId(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleIssue() {
    setIsSubmitting(true);
    setRowStatus(Object.fromEntries(facultyIds.map((id) => [id, "pending"])));

    const fullRecordsPromise = Promise.all(faculty.map((f) => fetchFacultyById(f.id).catch(() => f)));

    const CONCURRENCY = 3;
    const queue = [...faculty];
    const issuedIds: number[] = [];

    async function worker() {
      while (queue.length > 0) {
        const f = queue.shift();
        if (!f) return;
        try {
          const result = await issueIdCard.mutateAsync(f.id);
          setIssueResults((prev) => ({ ...prev, [f.id]: result }));
          setRowStatus((prev) => ({ ...prev, [f.id]: "issued" }));
          issuedIds.push(f.id);
        } catch (err: unknown) {
          setRowStatus((prev) => ({ ...prev, [f.id]: "failed" }));
          setRowError((prev) => ({ ...prev, [f.id]: friendlyError(err) }));
        }
      }
    }

    const [, records] = await Promise.all([Promise.all(Array.from({ length: CONCURRENCY }, worker)), fullRecordsPromise]);

    setFullRecords(Object.fromEntries(records.map((r) => [r.id, r])));
    setPreviewId(issuedIds[0] ?? null);
    setIsSubmitting(false);
    setSubmitted(true);
    queryClient.invalidateQueries({ queryKey: [...facultyKeys.all, "id-card-status"] });
    faculty.forEach((f) => queryClient.invalidateQueries({ queryKey: facultyKeys.activity(f.id) }));
  }

  async function handleDownloadCards() {
    const issuedIds = faculty.filter((f) => rowStatus[f.id] === "issued").map((f) => f.id);
    const idsToDownload = issuedIds.length > 0 ? issuedIds : facultyIds;
    const records = idsToDownload.map((id) => fullRecords[id]).filter((r): r is Faculty => Boolean(r));
    setIsDownloading(true);
    try {
      await generateFacultyIdCardsPdf(records);
    } catch {
      show("Couldn't generate the ID card PDF. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  const issuedCount = Object.values(rowStatus).filter((s) => s === "issued").length;
  const failedCount = Object.values(rowStatus).filter((s) => s === "failed").length;
  const isBulk = faculty.length > 1;
  const issuedFacultyList = faculty.filter((f) => rowStatus[f.id] === "issued");
  const previewFaculty = previewId !== null ? fullRecords[previewId] : undefined;

  return (
    <Modal open={open} onClose={handleClose} title={isBulk ? `Issue ${faculty.length} ID Cards` : "Issue ID Card"} widthClassName="max-w-lg">
      {!submitted ? (
        <>
          <p className="mb-4 text-sm text-admin-muted">
            Confirm the faculty details below are correct, then issue {isBulk ? "these ID cards" : "this ID card"}. Printing is
            handled separately by the printing team — after issuing, you can download the details they need to print{" "}
            {isBulk ? "them" : "it"}.
          </p>

          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {faculty.map((f) => {
              const status = statusMap?.[f.id];
              const rs = rowStatus[f.id];
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-admin-card border border-admin-border p-3">
                  <FacultyAvatar faculty={f} className="size-11 shrink-0 rounded-admin-md text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-admin-ink">{fullName(f)}</p>
                    <p className="truncate text-xs text-admin-muted">
                      {formatFacultyCode(f.id)} · {f.designation} · {f.department?.code ?? "—"}
                    </p>
                  </div>
                  {rs === "pending" && <span className="size-4 shrink-0 animate-spin rounded-admin-pill border-2 border-admin-border border-t-admin-primary" />}
                  {rs === "issued" && <Icon name="check" size={16} className="shrink-0 text-admin-success-fg" />}
                  {rs === "failed" && (
                    <span className="shrink-0 text-xs font-semibold text-admin-danger" title={rowError[f.id]}>
                      Failed
                    </span>
                  )}
                  {!rs && !statusLoading && (
                    <span className="shrink-0 text-right text-xs text-admin-subtle">
                      {status?.issued ? (
                        <>
                          Issued {status.issueCount}× so far
                          <br />
                          last on {formatDate(status.lastIssuedAt)}
                        </>
                      ) : (
                        "Not yet issued"
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleIssue} disabled={isSubmitting}>
              <Icon name="badge" size={16} /> {isSubmitting ? "Issuing…" : isBulk ? `Issue ${faculty.length} cards` : "Issue card"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span
              className={`flex size-12 items-center justify-center rounded-admin-pill ${
                failedCount === 0 ? "bg-admin-success-bg text-admin-success-fg" : "bg-admin-warning-bg text-admin-warning-fg"
              }`}
            >
              <Icon name="check" size={24} />
            </span>
            <p className="text-base font-bold text-admin-ink">
              {issuedCount} of {faculty.length} card{faculty.length === 1 ? "" : "s"} issued
            </p>
            {failedCount > 0 && <p className="text-sm text-admin-muted">{failedCount} failed — see details below.</p>}
          </div>

          {previewFaculty && (
            <div className="mb-5 flex flex-col items-center gap-3 rounded-admin-lg border border-admin-border bg-admin-tint px-4 py-5">
              <p className="text-xs font-semibold text-admin-muted">Preview — click the card to flip it</p>
              <FlipIdCard key={previewFaculty.id} faculty={previewFaculty} />
              {issuedFacultyList.length > 1 && (
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {issuedFacultyList.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPreviewId(f.id)}
                      title={fullName(f)}
                      className={`rounded-admin-pill transition-colors ${
                        f.id === previewFaculty.id ? "ring-2 ring-admin-primary ring-offset-2 ring-offset-admin-tint" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <FacultyAvatar faculty={f} className="size-7 rounded-admin-pill text-[10px]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mb-4 max-h-56 overflow-y-auto rounded-admin-lg border border-admin-border">
            {faculty.map((f) => {
              const before = statusMap?.[f.id]?.issueCount ?? 0;
              const after = issueResults[f.id]?.issueCount;
              const rs = rowStatus[f.id];
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 border-b border-admin-divider px-3 py-2 text-sm last:border-b-0">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FacultyAvatar faculty={f} className="size-7 shrink-0 rounded-admin-pill text-[10px]" />
                    <span className="truncate font-medium text-admin-body">{fullName(f)}</span>
                  </div>
                  {rs === "issued" && after !== undefined && (
                    <span className="shrink-0 text-xs text-admin-muted">
                      Issued <span className="font-semibold text-admin-body">{before}</span> →{" "}
                      <span className="font-semibold text-admin-success-fg">{after}</span> time{after === 1 ? "" : "s"}
                    </span>
                  )}
                  {rs === "failed" && (
                    <span className="shrink-0 text-xs font-semibold text-admin-danger" title={rowError[f.id]}>
                      Failed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {failedCount > 0 && (
            <div className="mb-4 max-h-40 overflow-y-auto rounded-admin-lg border border-admin-border">
              {faculty
                .filter((f) => rowStatus[f.id] === "failed")
                .map((f) => (
                  <div key={f.id} className="border-b border-admin-divider px-3 py-2 text-sm last:border-b-0">
                    <p className="font-medium text-admin-ink">{fullName(f)}</p>
                    <p className="text-xs text-admin-danger">{rowError[f.id]}</p>
                  </div>
                ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleDownloadCards} disabled={isDownloading}>
              <Icon name="download" size={16} /> {isDownloading ? "Preparing…" : "Download for printing"}
            </Button>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
