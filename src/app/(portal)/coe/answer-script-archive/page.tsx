"use client";

import { useState } from "react";
import { Card, StatCard, PillTabs, Button, Badge, Input, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useArchiveBundles, useArchiveStats, useCreateRetrieval, useRecallBundle, type ArchiveStatus, type ArchiveRow } from "@/modules/coe/api/scriptArchive";

const TABS: { key: "all" | ArchiveStatus; label: string }[] = [
  { key: "all", label: "All bundles" },
  { key: "in_archive", label: "In archive" },
  { key: "issued_out", label: "Issued out" },
  { key: "due_disposal", label: "Due disposal" },
];

const TONE: Record<ArchiveStatus, BadgeTone> = { in_archive: "accentDark", issued_out: "accent", due_disposal: "danger" };
const LABEL: Record<ArchiveStatus, string> = { in_archive: "In archive", issued_out: "Issued out", due_disposal: "Due disposal" };

export default function CoeAnswerScriptArchivePage() {
  const [status, setStatus] = useState<"all" | ArchiveStatus>("all");
  const [retrievalTarget, setRetrievalTarget] = useState<ArchiveRow | null>(null);

  const stats = useArchiveStats();
  const bundles = useArchiveBundles(status === "all" ? null : status);
  const recall = useRecallBundle();

  const rows = bundles.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Answer Script Archive" subtitle="Bundle custody after valuation, retention clock, RTI and photocopy requests, and authorised disposal." />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Bundles archived" value={stats.data?.archived ?? (stats.isLoading ? "…" : 0)} icon="inventory_2" />
        <StatCard label="In archive" value={stats.data?.in_archive ?? (stats.isLoading ? "…" : 0)} icon="shelves" />
        <StatCard label="Issued out" value={stats.data?.issued_out ?? (stats.isLoading ? "…" : 0)} icon="move_to_inbox" />
        <StatCard label="Due disposal" value={stats.data?.due_disposal ?? (stats.isLoading ? "…" : 0)} icon="delete_sweep" />
      </div>

      <Card>
        <PillTabs options={TABS} value={status} onChange={(k) => setStatus(k as typeof status)} />
      </Card>

      {bundles.isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Bundles</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No bundles archived yet.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[140px]">Bundle</div>
                <div className="flex-1">Location / retrieval</div>
                <div className="w-[70px]">Scripts</div>
                <div className="w-[110px]">Retention until</div>
                <div className="w-[120px]">Status</div>
                <div className="w-[110px] text-right">Actions</div>
              </div>
              {rows.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="w-[140px]">
                    <div className="text-[13.5px] font-bold text-ink">{b.bundle_code}</div>
                    <div className="text-[11px] text-muted">
                      {b.subject.subject_code} · {b.subject.name}
                    </div>
                  </div>
                  <div className="flex-1 text-[12.5px] text-ink">{b.active_retrieval ? `Issued: ${b.active_retrieval.purpose}${b.active_retrieval.issued_to ? ` · ${b.active_retrieval.issued_to}` : ""}` : b.location_label}</div>
                  <div className="w-[70px] text-[12.5px] text-ink">{b.scripts_count}</div>
                  <div className="w-[110px] text-[12px] text-ink">{b.retention_until.slice(0, 10)}</div>
                  <div className="w-[120px]">
                    <Badge tone={TONE[b.status]}>{LABEL[b.status].toUpperCase()}</Badge>
                  </div>
                  <div className="flex w-[110px] shrink-0 justify-end gap-2">
                    {b.status === "in_archive" ? (
                      <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => setRetrievalTarget(b)}>
                        Request
                      </Button>
                    ) : (
                      <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={recall.isPending} onClick={() => recall.mutate(b.id)}>
                        Recall
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <RetrievalModal row={retrievalTarget} onClose={() => setRetrievalTarget(null)} />
    </div>
  );
}

function RetrievalModal({ row, onClose }: { row: ArchiveRow | null; onClose: () => void }) {
  const create = useCreateRetrieval();
  const [purpose, setPurpose] = useState("");
  const [issuedTo, setIssuedTo] = useState("");

  function handleClose() {
    setPurpose("");
    setIssuedTo("");
    create.reset();
    onClose();
  }

  return (
    <Modal open={row != null} onClose={handleClose} title="Retrieval request" subtitle={row ? row.bundle_code : undefined}>
      <div className="flex flex-col gap-4">
        <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose, e.g. RTI2026/0092" />
        <Input value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="Issued to (name)" />
        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primarySmall"
            disabled={!purpose.trim() || create.isPending || !row}
            onClick={() => row && create.mutate({ archive_bundle_id: row.id, purpose: purpose.trim(), issued_to: issuedTo || undefined }, { onSuccess: handleClose })}
          >
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
