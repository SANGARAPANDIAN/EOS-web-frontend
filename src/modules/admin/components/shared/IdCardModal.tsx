"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button, Modal, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { generateIdCardsPdf } from "@/modules/admin/lib/id-card-image";
import type { IdCardData } from "@/modules/admin/lib/id-card-data";
import { FlipIdCard } from "@/modules/admin/components/shared/FlipIdCard";

export interface IdCardIssueStatus {
  issued: boolean;
  lastIssuedAt: string | null;
  issueCount: number;
}

export interface IdCardEntityInput {
  id: number;
  avatar: ReactNode;
  /** Smaller avatar for the multi-preview picker strip — defaults to `avatar` if omitted. */
  pickerAvatar?: ReactNode;
  title: string;
  subtitle: string;
  /** Summary-level card data (from a list row) — used as a fallback for
   * the preview/PDF only if the full-record fetch below fails. */
  data: IdCardData;
}

interface IdCardModalProps {
  open: boolean;
  onClose: () => void;
  entities: IdCardEntityInput[];
  statusMap: Record<number, IdCardIssueStatus> | undefined;
  statusLoading: boolean;
  issueCard: (id: number) => Promise<IdCardIssueStatus>;
  /** Full-record fetch used after issuing, since the summary rows this
   * modal opens with don't carry back-side fields (DOB/address/etc.). */
  fetchFullData: (id: number) => Promise<IdCardData>;
  onIssued: () => void;
}

type RowStatus = "ready" | "pending" | "issued" | "failed";

/**
 * Entity-agnostic issue-flow modal (bulk from a list, or single from a
 * detail page) — shared by Faculty and Students so the queue/preview/PDF
 * logic exists exactly once. Every entity-specific bit (avatar markup,
 * title/subtitle text, the status/issue/fetch calls) is injected by the
 * caller instead of branching on an entity type in here.
 */
export function IdCardModal({ open, onClose, entities, statusMap, statusLoading, issueCard, fetchFullData, onIssued }: IdCardModalProps) {
  const { show } = useToast();
  const ids = entities.map((e) => e.id);

  const [rowStatus, setRowStatus] = useState<Record<number, RowStatus>>({});
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const [issueResults, setIssueResults] = useState<Record<number, IdCardIssueStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fullData, setFullData] = useState<Record<number, IdCardData>>({});
  const [previewId, setPreviewId] = useState<number | null>(null);

  function reset() {
    setRowStatus({});
    setRowError({});
    setIssueResults({});
    setIsSubmitting(false);
    setSubmitted(false);
    setIsDownloading(false);
    setFullData({});
    setPreviewId(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleIssue() {
    setIsSubmitting(true);
    setRowStatus(Object.fromEntries(ids.map((id) => [id, "pending"])));

    // Concurrency-limited on purpose, same reason as the issue queue below:
    // this modal has no cap on how many rows can be selected (a full page of
    // 100), and firing that many requests at once is exactly the pattern
    // that exhausts this project's Supabase connection pool.
    const CONCURRENCY = 3;

    async function mapWithConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
      const results: R[] = new Array(items.length);
      const queue = items.map((item, index) => ({ item, index }));
      async function worker() {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) return;
          results[next.index] = await fn(next.item);
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      return results;
    }

    const fullDataPromise = mapWithConcurrency(entities, (e) => fetchFullData(e.id).catch(() => e.data));

    const issuedIds: number[] = [];

    async function issueOne(e: IdCardEntityInput) {
      try {
        const result = await issueCard(e.id);
        setIssueResults((prev) => ({ ...prev, [e.id]: result }));
        setRowStatus((prev) => ({ ...prev, [e.id]: "issued" }));
        issuedIds.push(e.id);
      } catch (err: unknown) {
        setRowStatus((prev) => ({ ...prev, [e.id]: "failed" }));
        setRowError((prev) => ({ ...prev, [e.id]: friendlyError(err) }));
      }
    }

    const [, records] = await Promise.all([mapWithConcurrency(entities, issueOne), fullDataPromise]);

    setFullData(Object.fromEntries(records.map((r) => [r.entityId, r])));
    setPreviewId(issuedIds[0] ?? null);
    setIsSubmitting(false);
    setSubmitted(true);
    onIssued();
  }

  async function handleDownloadCards() {
    const issuedIds = entities.filter((e) => rowStatus[e.id] === "issued").map((e) => e.id);
    const idsToDownload = issuedIds.length > 0 ? issuedIds : ids;
    const records = idsToDownload.map((id) => fullData[id]).filter((r): r is IdCardData => Boolean(r));
    setIsDownloading(true);
    try {
      await generateIdCardsPdf(records);
    } catch {
      show("Couldn't generate the ID card PDF. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  const issuedCount = Object.values(rowStatus).filter((s) => s === "issued").length;
  const failedCount = Object.values(rowStatus).filter((s) => s === "failed").length;
  const isBulk = entities.length > 1;
  const issuedEntities = entities.filter((e) => rowStatus[e.id] === "issued");
  const previewData = previewId !== null ? fullData[previewId] : undefined;
  const previewEntity = previewId !== null ? entities.find((e) => e.id === previewId) : undefined;

  return (
    <Modal open={open} onClose={handleClose} title={isBulk ? `Issue ${entities.length} ID Cards` : "Issue ID Card"} widthClassName="max-w-lg">
      {!submitted ? (
        <>
          <p className="mb-4 text-sm text-admin-muted">
            Confirm the details below are correct, then issue {isBulk ? "these ID cards" : "this ID card"}. Printing is handled
            separately by the printing team — after issuing, you can download the details they need to print {isBulk ? "them" : "it"}.
          </p>

          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {entities.map((e) => {
              const status = statusMap?.[e.id];
              const rs = rowStatus[e.id];
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-admin-card border border-admin-border p-3">
                  {e.avatar}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-admin-ink">{e.title}</p>
                    <p className="truncate text-xs text-admin-muted">{e.subtitle}</p>
                  </div>
                  {rs === "pending" && <span className="size-4 shrink-0 animate-spin rounded-admin-pill border-2 border-admin-border border-t-admin-primary" />}
                  {rs === "issued" && <Icon name="check" size={16} className="shrink-0 text-admin-success-fg" />}
                  {rs === "failed" && (
                    <span className="shrink-0 text-xs font-semibold text-admin-danger" title={rowError[e.id]}>
                      Failed
                    </span>
                  )}
                  {!rs && !statusLoading && (
                    <span className="shrink-0 text-right text-xs text-admin-subtle">
                      {status?.issued ? (
                        <>
                          Issued {status.issueCount}× so far
                          <br />
                          last on {formatIssuedDate(status.lastIssuedAt)}
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
              <Icon name="badge" size={16} /> {isSubmitting ? "Issuing…" : isBulk ? `Issue ${entities.length} cards` : "Issue card"}
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
              {issuedCount} of {entities.length} card{entities.length === 1 ? "" : "s"} issued
            </p>
            {failedCount > 0 && <p className="text-sm text-admin-muted">{failedCount} failed — see details below.</p>}
          </div>

          {previewData && (
            <div className="mb-5 flex flex-col items-center gap-3 rounded-admin-lg border border-admin-border bg-admin-tint px-4 py-5">
              <p className="text-xs font-semibold text-admin-muted">Preview — click the card to flip it</p>
              <FlipIdCard key={previewData.entityId} data={previewData} />
              {issuedEntities.length > 1 && (
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {issuedEntities.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setPreviewId(e.id)}
                      title={e.title}
                      className={`rounded-admin-pill transition-colors ${
                        e.id === previewEntity?.id ? "ring-2 ring-admin-primary ring-offset-2 ring-offset-admin-tint" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {e.pickerAvatar ?? e.avatar}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mb-4 max-h-56 overflow-y-auto rounded-admin-lg border border-admin-border">
            {entities.map((e) => {
              const before = statusMap?.[e.id]?.issueCount ?? 0;
              const after = issueResults[e.id]?.issueCount;
              const rs = rowStatus[e.id];
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 border-b border-admin-divider px-3 py-2 text-sm last:border-b-0">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {e.avatar}
                    <span className="truncate font-medium text-admin-body">{e.title}</span>
                  </div>
                  {rs === "issued" && after !== undefined && (
                    <span className="shrink-0 text-xs text-admin-muted">
                      Issued <span className="font-semibold text-admin-body">{before}</span> →{" "}
                      <span className="font-semibold text-admin-success-fg">{after}</span> time{after === 1 ? "" : "s"}
                    </span>
                  )}
                  {rs === "failed" && (
                    <span className="shrink-0 text-xs font-semibold text-admin-danger" title={rowError[e.id]}>
                      Failed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {failedCount > 0 && (
            <div className="mb-4 max-h-40 overflow-y-auto rounded-admin-lg border border-admin-border">
              {entities
                .filter((e) => rowStatus[e.id] === "failed")
                .map((e) => (
                  <div key={e.id} className="border-b border-admin-divider px-3 py-2 text-sm last:border-b-0">
                    <p className="font-medium text-admin-ink">{e.title}</p>
                    <p className="text-xs text-admin-danger">{rowError[e.id]}</p>
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

function formatIssuedDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
