"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE, type BadgeTone } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { formatDate } from "@/lib/utils/format";
import {
  useArchiveBundles,
  useArchiveStats,
  useCreateRetrieval,
  useRecallBundle,
  useRequesterSuggestions,
  useUploadFeeReceipt,
  type ArchiveStatus,
  type ArchiveRow,
  type RequestType,
} from "@/modules/coe/api/scriptArchive";

type TabKey = "all" | ArchiveStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All bundles" },
  { key: "in_archive", label: "In archive" },
  { key: "issued_out", label: "Issued out" },
  { key: "due_disposal", label: "Due disposal" },
];

const STATUS_TONE: Record<ArchiveStatus, BadgeTone> = { in_archive: "neutral", issued_out: "accent", due_disposal: "danger" };
const STATUS_LABEL: Record<ArchiveStatus, string> = { in_archive: "In archive", issued_out: "Issued out", due_disposal: "Due disposal" };
const REQUEST_TYPE_LABEL: Record<RequestType, string> = { photocopy: "Photocopy of answer script", rti: "RTI request" };

export default function CoeAnswerScriptArchivePage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [rack, setRack] = useState("all");
  const [status, setStatus] = useState<"all" | ArchiveStatus>("all");
  const [requestType, setRequestType] = useState<"all" | RequestType>("all");
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [prefillBundleCode, setPrefillBundleCode] = useState("");
  const [locateRow, setLocateRow] = useState<ArchiveRow | null>(null);
  const [trackRow, setTrackRow] = useState<ArchiveRow | null>(null);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const stats = useArchiveStats();
  const allBundles = useArchiveBundles({});

  const allRows = allBundles.data ?? [];
  const racks = [...new Set(allRows.map((r) => r.rack).filter((r) => !r.startsWith("Issued")))].sort();

  const tabCounts = {
    all: allRows.length,
    in_archive: allRows.filter((r) => r.status === "in_archive").length,
    issued_out: allRows.filter((r) => r.status === "issued_out").length,
    due_disposal: allRows.filter((r) => r.status === "due_disposal").length,
  };

  const filtered = allRows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (status !== "all" && r.status !== status) return false;
    if (rack !== "all" && r.rack !== rack) return false;
    if (requestType !== "all" && r.active_retrieval?.request_type !== requestType) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [r.bundle_code, r.subject.subject_code, r.subject.name, r.rack, r.active_retrieval?.reference_code].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "answer-script-archive",
      [
        { header: "Bundle", value: (r: ArchiveRow) => r.bundle_code },
        { header: "Subject", value: (r: ArchiveRow) => `${r.subject.subject_code} · ${r.subject.name}` },
        { header: "Examination", value: (r: ArchiveRow) => r.exam_label },
        { header: "Location", value: (r: ArchiveRow) => (r.active_retrieval ? `Issued to ${r.active_retrieval.issued_to ?? "—"}` : r.location_label) },
        { header: "Scripts", value: (r: ArchiveRow) => r.scripts_count },
        { header: "Retention until", value: (r: ArchiveRow) => formatDate(r.retention_until) },
        { header: "Status", value: (r: ArchiveRow) => STATUS_LABEL[r.status] },
      ],
      filtered,
    );
  }

  function openRequestFor(row?: ArchiveRow) {
    setPrefillBundleCode(row?.bundle_code ?? "");
    setNewRequestOpen(true);
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Answer Script Archive"
        subtitle="Bundle custody after valuation, retention clock, RTI and photocopy requests, and authorised disposal."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => openRequestFor()}>
              <Icon name="add" size={16} />
              New retrieval request
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Bundles archived" value={stats.data?.archived ?? 0} icon="inventory_2" sub={stats.data ? `+${stats.data.archived_this_cycle} this cycle` : undefined} loading={stats.isLoading} />
        <StatCard label="Retention period" value={stats.data ? `${stats.data.retention_months} months` : "—"} icon="lock_clock" sub="policy after publication" loading={stats.isLoading} />
        <StatCard
          label="RTI / photocopy"
          value={stats.data?.open_retrieval_requests ?? 0}
          icon="find_in_page"
          sub={stats.data ? `${stats.data.pending_beyond_30_days} pending beyond 30 days` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          label="Due for disposal"
          value={stats.data?.due_disposal ?? 0}
          icon="delete_sweep"
          sub={stats.data?.due_disposal_next ? `${formatDate(stats.data.due_disposal_next)} awaiting COE order` : undefined}
          loading={stats.isLoading}
        />
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-7 border-b border-divider px-5 pt-4">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => changeFilter(setTab, t.key)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 pb-3 text-[14px] font-bold transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-bold", active ? "bg-accent-50 text-primary" : "bg-surface-tint text-muted")}>
                  {tabCounts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-4">
          <SearchBar placeholder="Search bundle, rack or request ID…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[280px]" />
          <Select value={rack} onChange={(e) => changeFilter(setRack, e.target.value)} className="w-auto min-w-[120px]">
            <option value="all">All racks</option>
            {racks.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => changeFilter(setStatus, e.target.value as typeof status)} className="w-auto min-w-[130px]">
            <option value="all">All status</option>
            <option value="in_archive">In archive</option>
            <option value="issued_out">Issued out</option>
            <option value="due_disposal">Due disposal</option>
          </Select>
          <Select value={requestType} onChange={(e) => changeFilter(setRequestType, e.target.value as typeof requestType)} className="w-auto min-w-[130px]">
            <option value="all">All requests</option>
            <option value="photocopy">Photocopy</option>
            <option value="rti">RTI</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {allBundles.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No bundles match the current filters.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="w-[130px]">Bundle</div>
              <div className="w-[160px]">Examination</div>
              <div className="flex-1">Location</div>
              <div className="w-[80px] text-right">Scripts</div>
              <div className="w-[110px]">Retention until</div>
              <div className="w-[110px]">Status</div>
              <div className="w-[130px] text-right">Actions</div>
            </div>
            {pageRows.map((b) => (
              <BundleRow key={b.id} row={b} onLocate={() => setLocateRow(b)} onTrack={() => setTrackRow(b)} onRequest={() => openRequestFor(b)} />
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <LocateModal row={locateRow} onClose={() => setLocateRow(null)} />
      <TrackModal row={trackRow} onClose={() => setTrackRow(null)} />
      <NewRetrievalModal open={newRequestOpen} prefillBundleCode={prefillBundleCode} onClose={() => setNewRequestOpen(false)} />
    </div>
  );
}

/** Independent per-row mutation instance — Recall on one bundle must never disable every other row's button while it's pending. */
function BundleRow({ row: b, onLocate, onTrack, onRequest }: { row: ArchiveRow; onLocate: () => void; onTrack: () => void; onRequest: () => void }) {
  const recall = useRecallBundle();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="w-[130px] min-w-0 shrink-0">
        <div className="truncate text-[13.5px] font-extrabold text-ink">{b.bundle_code}</div>
        <div className="truncate text-[11px] text-muted">
          {b.subject.subject_code} · {b.subject.name}
        </div>
      </div>
      <div className="w-[160px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{b.exam_label}</div>
      <div className="min-w-0 flex-1">
        {b.active_retrieval ? (
          <>
            <div className="truncate text-[12.5px] text-ink">Issued to {b.active_retrieval.issued_to ?? "—"}</div>
            <div className="text-[11px] text-muted">{b.active_retrieval.reference_code}</div>
          </>
        ) : (
          <div className="truncate text-[12.5px] text-ink">{b.location_label}</div>
        )}
      </div>
      <div className="w-[80px] shrink-0 text-right text-[12.5px] text-ink">{b.scripts_count}</div>
      <div className="w-[110px] shrink-0 text-[12px] text-ink">{formatDate(b.retention_until)}</div>
      <div className="w-[110px] min-w-0 shrink-0">
        <Badge tone={STATUS_TONE[b.status]} className="max-w-full truncate">
          {STATUS_LABEL[b.status]}
        </Badge>
      </div>
      <div className="flex w-[130px] shrink-0 justify-end gap-3">
        {b.status === "issued_out" ? (
          <>
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onTrack}>
              Track
            </button>
            <button
              type="button"
              className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
              disabled={recall.isPending}
              onClick={() => recall.mutate(b.id)}
            >
              {recall.isPending ? "Recalling…" : "Recall"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onLocate}>
              Locate
            </button>
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onRequest}>
              Request
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Pure read-only bundle location summary — Locate never changes anything. */
function LocateModal({ row, onClose }: { row: ArchiveRow | null; onClose: () => void }) {
  return (
    <Modal open={row != null} onClose={onClose} title={row?.bundle_code ?? ""} subtitle={row ? `${row.subject.subject_code} · ${row.subject.name}` : undefined}>
      {row && (
        <div className="flex flex-col gap-3 text-[13px]">
          {(
            [
              ["Examination", row.exam_label],
              ["Location", row.location_label],
              ["Scripts", row.scripts_count],
              ["Retention until", formatDate(row.retention_until)],
              ["Status", STATUS_LABEL[row.status]],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 last:border-0">
              <span className="font-bold text-muted">{label}</span>
              <span className="text-right text-ink">{value}</span>
            </div>
          ))}
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}

/** Pure read-only retrieval summary — Track never changes anything. */
function TrackModal({ row, onClose }: { row: ArchiveRow | null; onClose: () => void }) {
  const retrieval = row?.active_retrieval ?? null;
  return (
    <Modal open={row != null} onClose={onClose} title={row?.bundle_code ?? ""} subtitle={row ? `${row.subject.subject_code} · ${row.subject.name}` : undefined}>
      {row && retrieval && (
        <div className="flex flex-col gap-3 text-[13px]">
          {(
            [
              ["Reference", retrieval.reference_code],
              ["Request type", REQUEST_TYPE_LABEL[retrieval.request_type]],
              ["Issued to", retrieval.issued_to ?? "—"],
              ["Requested on", formatDate(retrieval.requested_at)],
              ...(retrieval.fee_receipt_no ? ([["Fee receipt no.", retrieval.fee_receipt_no]] as const) : []),
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 last:border-0">
              <span className="font-bold text-muted">{label}</span>
              <span className="text-right text-ink">{value}</span>
            </div>
          ))}
          {retrieval.fee_receipt_url && (
            <a
              href={retrieval.fee_receipt_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 text-[13px] font-bold text-primary hover:underline"
            >
              View uploaded fee receipt
            </a>
          )}
          <div className="rounded-input border border-border-default bg-surface-subtle p-3 text-ink">{retrieval.purpose}</div>
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}

function NewRetrievalModal({ open, prefillBundleCode, onClose }: { open: boolean; prefillBundleCode: string; onClose: () => void }) {
  const create = useCreateRetrieval();
  const uploadReceipt = useUploadFeeReceipt();
  const requesterSuggestions = useRequesterSuggestions();
  const [requestType, setRequestType] = useState<RequestType>("photocopy");
  const [bundleOrRoll, setBundleOrRoll] = useState(prefillBundleCode);
  const [requester, setRequester] = useState("");
  const [feeReceiptNo, setFeeReceiptNo] = useState("");
  const [feeReceiptUrl, setFeeReceiptUrl] = useState("");
  const [feeReceiptFileName, setFeeReceiptFileName] = useState("");
  const [purpose, setPurpose] = useState("");

  // Re-hydrate the bundle field whenever this modal is (re)opened, whether
  // blank (header button) or prefilled from a specific row's "Request" link.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) setBundleOrRoll(prefillBundleCode);
  }, [open, prefillBundleCode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function reset() {
    setRequestType("photocopy");
    setBundleOrRoll("");
    setRequester("");
    setFeeReceiptNo("");
    setFeeReceiptUrl("");
    setFeeReceiptFileName("");
    setPurpose("");
    create.reset();
    uploadReceipt.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleReceiptFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadReceipt.mutate(file, {
      onSuccess: (result) => {
        setFeeReceiptUrl(result.url);
        setFeeReceiptFileName(file.name);
      },
    });
  }

  function handleSave() {
    if (!bundleOrRoll.trim()) return;
    create.mutate(
      {
        bundle_or_roll: bundleOrRoll.trim(),
        request_type: requestType,
        requester: requester.trim() || undefined,
        fee_receipt_no: feeReceiptNo.trim() || undefined,
        fee_receipt_url: feeReceiptUrl || undefined,
        purpose: purpose.trim() || undefined,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Request a script retrieval"
      subtitle="Photocopy requests are answered in 30 days; RTI in 30 days from receipt. Retrieval is logged against the requester."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Request type</label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as RequestType)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="photocopy">Photocopy of answer script</option>
            <option value="rti">RTI request</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Bundle or roll number *</label>
          <input
            type="text"
            value={bundleOrRoll}
            onChange={(e) => setBundleOrRoll(e.target.value)}
            placeholder="e.g. BND-1042 or 21CS042"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Requester</label>
          <input
            type="text"
            list="requester-options"
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
            placeholder="Name and relationship to the candidate"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          <datalist id="requester-options">
            {(requesterSuggestions.data ?? []).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee receipt</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={feeReceiptNo}
              onChange={(e) => setFeeReceiptNo(e.target.value)}
              placeholder="e.g. RCP-2026-88516"
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-input border border-border-default bg-surface px-3 py-2.5 text-[12.5px] font-bold text-primary hover:bg-surface-subtle">
              <Icon name="upload" size={16} />
              {uploadReceipt.isPending ? "Uploading…" : "Upload"}
              <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploadReceipt.isPending} onChange={handleReceiptFileChange} />
            </label>
          </div>
          {feeReceiptUrl && (
            <p className="mt-1.5 flex items-center gap-2 text-[12px] text-primary">
              <Icon name="task_alt" size={14} />
              {feeReceiptFileName || "Receipt uploaded"}
              <button
                type="button"
                className="font-bold text-danger-fg hover:underline"
                onClick={() => {
                  setFeeReceiptUrl("");
                  setFeeReceiptFileName("");
                }}
              >
                Remove
              </button>
            </p>
          )}
          {uploadReceipt.isError && <p className="mt-1.5 text-[12px] text-danger-fg">{(uploadReceipt.error as Error).message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Purpose</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            placeholder="Reason for the retrieval"
            className="w-full resize-y rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!bundleOrRoll.trim() || create.isPending} onClick={handleSave}>
            {create.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
