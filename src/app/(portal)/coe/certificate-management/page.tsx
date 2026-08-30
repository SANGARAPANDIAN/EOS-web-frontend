"use client";

import { useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE, type BadgeTone } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { formatDate } from "@/lib/utils/format";
import { useDepartments } from "@/modules/coe/api/reference";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import {
  useCertificateRequests,
  useCertificateRequestStats,
  useCertificateTypes,
  useCreateCertificateRequest,
  useUpdateCertificateStatus,
  useUpdateCertificateFee,
  useRemindCertificateRequest,
  type CertificateRequest,
  type CertificateRequestStatus,
} from "@/modules/coe/api/certificateRequests";

type Bucket = "pending" | "ready_to_print" | "issued";
type TabKey = "all" | Bucket;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All requests" },
  { key: "pending", label: "Pending" },
  { key: "ready_to_print", label: "Ready to print" },
  { key: "issued", label: "Issued" },
];

const STATUS_LABEL: Record<CertificateRequestStatus, string> = {
  pending: "Pending",
  ready_to_print: "Ready to print",
  printed: "Printed",
  issued: "Issued",
};
const STATUS_TONE: Record<CertificateRequestStatus, BadgeTone> = {
  pending: "accent",
  ready_to_print: "accent",
  printed: "accent",
  issued: "accentDark",
};

function bucketOf(status: CertificateRequestStatus): Bucket {
  if (status === "pending") return "pending";
  if (status === "issued") return "issued";
  return "ready_to_print"; // ready_to_print and printed share the "ready to print" tab
}

function studentName(r: CertificateRequest): string {
  const s = r.students;
  return s.soa_applications ? [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ") : (s.register_no ?? s.student_id_no);
}

function requestCode(r: CertificateRequest): string {
  return `CRT-${new Date(r.requested_at).getFullYear()}-${String(r.id).padStart(4, "0")}`;
}

/** signatory_status is real (schema-backed), but it's only meaningful once the fee gate (if any) has cleared — matches the design's own "—" for a still-unpaid pending request. */
function signatoryLabel(r: CertificateRequest): string {
  if (r.signatory_status === "auto") return "Auto-issued";
  if (r.status === "pending" && !r.fee_paid) return "—";
  if (r.signatory_status === "signed") return "COE · signed";
  return "Awaiting signature";
}

export default function CoeCertificateManagementPage() {
  const departments = useDepartments();
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [certificateTypeId, setCertificateTypeId] = useState<"all" | number>("all");
  const [departmentId, setDepartmentId] = useState<"all" | number>("all");
  const [status, setStatus] = useState<"all" | CertificateRequestStatus>("all");
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [reprintRow, setReprintRow] = useState<CertificateRequest | null>(null);

  const stats = useCertificateRequestStats();
  const certificateTypes = useCertificateTypes();
  const allRows = useCertificateRequests({
    search: search.trim() || undefined,
    certificate_type_id: certificateTypeId === "all" ? undefined : certificateTypeId,
    department_id: departmentId === "all" ? undefined : departmentId,
    status: status === "all" ? undefined : status,
  });

  const data = allRows.data ?? [];

  const tabCounts = {
    all: data.length,
    pending: data.filter((r) => bucketOf(r.status) === "pending").length,
    ready_to_print: data.filter((r) => bucketOf(r.status) === "ready_to_print").length,
    issued: data.filter((r) => bucketOf(r.status) === "issued").length,
  };

  const filtered = tab === "all" ? data : data.filter((r) => bucketOf(r.status) === tab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function handleExport() {
    downloadCsv(
      "certificate-requests",
      [
        { header: "Request", value: (r: CertificateRequest) => requestCode(r) },
        { header: "Student", value: (r: CertificateRequest) => studentName(r) },
        { header: "Register no", value: (r: CertificateRequest) => r.students.register_no ?? r.students.student_id_no },
        { header: "Certificate type", value: (r: CertificateRequest) => r.certificate_types.name },
        { header: "Fee amount", value: (r: CertificateRequest) => r.fee_amount ?? "" },
        { header: "Fee paid", value: (r: CertificateRequest) => (r.fee_paid ? "Yes" : "No") },
        { header: "Signatory", value: (r: CertificateRequest) => signatoryLabel(r) },
        { header: "Status", value: (r: CertificateRequest) => STATUS_LABEL[r.status] },
        { header: "Requested at", value: (r: CertificateRequest) => r.requested_at.slice(0, 10) },
        { header: "Issued at", value: (r: CertificateRequest) => r.issued_at?.slice(0, 10) ?? "" },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Certificate Management"
        subtitle="Grade sheets, consolidated marksheets, provisional, course completion, transfer and duplicate certificates."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setShowNew(true)}>
              <Icon name="add" size={16} />
              New request
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Certificates issued"
          value={stats.data?.issued ?? 0}
          icon="workspace_premium"
          sub={stats.data?.issued_pct_of_requests != null ? `${stats.data.issued_pct_of_requests}% of requests` : undefined}
        />
        <StatCard label="Awaiting signature" value={stats.data?.awaiting_signature ?? 0} icon="draw" sub="COE & Principal" />
        <StatCard
          label="Duplicate requests"
          value={stats.data?.duplicate_requests ?? 0}
          icon="content_copy"
          sub={stats.data?.duplicate_avg_fee != null ? `~₹${stats.data.duplicate_avg_fee} fee each` : undefined}
        />
        <StatCard
          label="Average turnaround"
          value={stats.data?.avg_turnaround_days != null ? `${stats.data.avg_turnaround_days}d` : "—"}
          icon="schedule"
          sub={
            stats.data?.avg_turnaround_delta_days != null
              ? `${stats.data.avg_turnaround_delta_days >= 0 ? "+" : ""}${stats.data.avg_turnaround_delta_days}d vs previous`
              : undefined
          }
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
          <SearchBar placeholder="Search roll number or request ID…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[260px]" />
          <Select
            value={certificateTypeId}
            onChange={(e) => changeFilter(setCertificateTypeId, e.target.value === "all" ? "all" : Number(e.target.value))}
            className="w-auto min-w-[140px]"
          >
            <option value="all">All types</option>
            {(certificateTypes.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select value={departmentId} onChange={(e) => changeFilter(setDepartmentId, e.target.value === "all" ? "all" : Number(e.target.value))} className="w-auto min-w-[150px]">
            <option value="all">All programmes</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => changeFilter(setStatus, e.target.value as typeof status)} className="w-auto min-w-[130px]">
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="ready_to_print">Ready to print</option>
            <option value="printed">Printed</option>
            <option value="issued">Issued</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {allRows.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No certificate requests match the current filters.</p>
        ) : (
          <>
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[110px]">Request</div>
                <div className="flex-1">Student</div>
                <div className="w-[160px]">Certificate type</div>
                <div className="w-[90px]">Fee</div>
                <div className="w-[130px]">Signatory</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[90px] text-right">Actions</div>
              </div>
              {pageRows.map((r) => (
                <RequestRow key={r.id} row={r} onReprint={() => setReprintRow(r)} />
              ))}
            </div>
            <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <NewCertificateRequestModal open={showNew} onClose={() => setShowNew(false)} />
      <ReprintModal row={reprintRow} onClose={() => setReprintRow(null)} />
    </div>
  );
}

function RequestRow({ row: r, onReprint }: { row: CertificateRequest; onReprint: () => void }) {
  const updateStatus = useUpdateCertificateStatus();
  const updateFee = useUpdateCertificateFee();
  const remind = useRemindCertificateRequest();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="w-[110px] min-w-0 shrink-0">
        <div className="truncate text-[12.5px] font-extrabold text-ink">{requestCode(r)}</div>
        <div className="text-[11px] text-muted">{formatDate(r.requested_at)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">{studentName(r)}</div>
        <div className="truncate text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
      </div>
      <div className="w-[160px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{r.certificate_types.name}</div>
      <div className="w-[90px] min-w-0 shrink-0">
        {r.fee_amount != null ? (
          <button type="button" className="cursor-pointer disabled:opacity-50" disabled={updateFee.isPending} onClick={() => updateFee.mutate({ id: r.id, fee_paid: !r.fee_paid })}>
            <Badge tone={r.fee_paid ? "accentDark" : "danger"}>{r.fee_paid ? "PAID" : "UNPAID"}</Badge>
          </button>
        ) : (
          <span className="text-[12px] text-subtle">—</span>
        )}
      </div>
      <div className="w-[130px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{signatoryLabel(r)}</div>
      <div className="w-[110px] min-w-0 shrink-0">
        <Badge tone={STATUS_TONE[r.status]} className="max-w-full truncate">
          {STATUS_LABEL[r.status]}
        </Badge>
      </div>
      <div className="flex w-[90px] shrink-0 justify-end">
        {r.status === "pending" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={remind.isPending || remind.isSuccess}
            onClick={() => remind.mutate(r.id)}
          >
            {remind.isSuccess ? "Reminded" : remind.isPending ? "Sending…" : "Remind"}
          </button>
        )}
        {r.status === "ready_to_print" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: r.id, status: "printed" })}
          >
            Print
          </button>
        )}
        {r.status === "printed" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: r.id, status: "issued" })}
          >
            Issue
          </button>
        )}
        {r.status === "issued" && (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onReprint}>
            Print
          </button>
        )}
      </div>
    </div>
  );
}

/** Read-only reprint summary for an already-issued certificate — no state change, just what a counter clerk needs to hand over another physical copy. */
function ReprintModal({ row, onClose }: { row: CertificateRequest | null; onClose: () => void }) {
  return (
    <Modal open={row != null} onClose={onClose} title={row ? requestCode(row) : ""} subtitle={row ? `${studentName(row)} · ${row.certificate_types.name}` : undefined}>
      {row && (
        <div className="flex flex-col gap-3 text-[13px]">
          {(
            [
              ["Certificate type", row.certificate_types.name],
              ["Copies", String(row.copies ?? 1)],
              ["Delivery", row.delivery_mode === "post" ? "Post" : "Collect at counter"],
              ["Issued on", row.issued_at ? formatDate(row.issued_at) : "—"],
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

function NewCertificateRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const certificateTypes = useCertificateTypes();
  const lookup = useLookupStudentByRegisterNo();
  const createRequest = useCreateCertificateRequest();

  const [registerNo, setRegisterNo] = useState("");
  const [lookedUpFor, setLookedUpFor] = useState("");
  const [certificateTypeId, setCertificateTypeId] = useState("");
  const [copies, setCopies] = useState("1");
  const [delivery, setDelivery] = useState<"counter" | "post">("counter");
  const [reason, setReason] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  function reset() {
    setRegisterNo("");
    setLookedUpFor("");
    setCertificateTypeId("");
    setCopies("1");
    setDelivery("counter");
    setReason("");
    setFeeAmount("");
    lookup.reset();
    createRequest.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleRollBlur() {
    const value = registerNo.trim();
    if (!value || value === lookedUpFor) return;
    setLookedUpFor(value);
    lookup.mutate(value);
  }

  function handleCreate() {
    if (!lookup.data || !certificateTypeId) return;
    createRequest.mutate(
      {
        student_id: lookup.data.id,
        certificate_type_id: Number(certificateTypeId),
        fee_amount: feeAmount ? Number(feeAmount) : undefined,
        copies: Number(copies),
        delivery_mode: delivery,
        reason: reason.trim() || undefined,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New certificate request"
      subtitle="Counter request. Verification against results and dues runs before printing is enabled."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Roll number *</label>
          <input
            type="text"
            value={registerNo}
            onChange={(e) => setRegisterNo(e.target.value)}
            onBlur={handleRollBlur}
            placeholder="e.g. 21CS042"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {lookup.isPending ? (
            <p className="mt-1.5 text-[12px] text-muted">Looking up…</p>
          ) : lookup.data ? (
            <p className="mt-1.5 text-[12px] font-semibold text-primary">
              Found: {lookup.data.name ?? lookup.data.register_no} · {lookup.data.department_code ?? "—"}
            </p>
          ) : lookup.isError ? (
            <p className="mt-1.5 text-[12px] text-danger-fg">{isNotFound(lookup.error) ? "No student found with this roll number." : (lookup.error as Error).message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Certificate type</label>
          <select
            value={certificateTypeId}
            onChange={(e) => setCertificateTypeId(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="">Select…</option>
            {(certificateTypes.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Copies</label>
            <select
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Delivery</label>
            <select
              value={delivery}
              onChange={(e) => setDelivery(e.target.value as "counter" | "post")}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            >
              <option value="counter">Collect at counter</option>
              <option value="post">Post</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee amount per copy (₹, optional)</label>
          <input
            type="number"
            min={0}
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="e.g. 200"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Reason (for duplicates)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Required for duplicate certificates"
            className="w-full resize-y rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        {createRequest.isError && <p className="text-[12px] text-danger-fg">{(createRequest.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!lookup.data || !certificateTypeId || createRequest.isPending} onClick={handleCreate}>
            {createRequest.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
