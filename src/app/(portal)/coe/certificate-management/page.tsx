"use client";

import { useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { currencyShort } from "@/modules/admin/lib/format";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import {
  useCertificateRequests,
  useCertificateRequestStats,
  useCertificateTypes,
  useCreateCertificateRequest,
  useUpdateCertificateStatus,
  useUpdateCertificateFee,
  type CertificateRequest,
  type CertificateRequestStatus,
} from "@/modules/coe/api/certificateRequests";

const TABS: { key: "all" | CertificateRequestStatus; label: string }[] = [
  { key: "all", label: "All requests" },
  { key: "pending", label: "Pending" },
  { key: "ready_to_print", label: "Ready to print" },
  { key: "printed", label: "Printed" },
  { key: "issued", label: "Issued" },
];

const STATUS_TONE: Record<CertificateRequestStatus, BadgeTone> = {
  pending: "accent",
  ready_to_print: "accentDark",
  printed: "accentDark",
  issued: "neutral",
};

const NEXT_STATUS: Record<CertificateRequestStatus, CertificateRequestStatus | null> = {
  pending: "ready_to_print",
  ready_to_print: "printed",
  printed: "issued",
  issued: null,
};

const NEXT_LABEL: Record<CertificateRequestStatus, string> = {
  pending: "Mark ready to print",
  ready_to_print: "Mark printed",
  printed: "Mark issued",
  issued: "",
};

function studentName(r: CertificateRequest) {
  const s = r.students;
  return s.soa_applications ? [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ") : s.register_no ?? s.student_id_no;
}

export default function CoeCertificateManagementPage() {
  const [status, setStatus] = useState<"all" | CertificateRequestStatus>("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const stats = useCertificateRequestStats();
  const rows = useCertificateRequests({ status: status === "all" ? null : status, search });
  const updateStatus = useUpdateCertificateStatus();
  const updateFee = useUpdateCertificateFee();

  const data = rows.data ?? [];

  function handleExport() {
    downloadCsv(
      "certificate-requests",
      [
        { header: "Student", value: (r: CertificateRequest) => studentName(r) },
        { header: "Register no", value: (r: CertificateRequest) => r.students.register_no ?? r.students.student_id_no },
        { header: "Certificate type", value: (r: CertificateRequest) => r.certificate_types.name },
        { header: "Fee amount", value: (r: CertificateRequest) => r.fee_amount ?? "" },
        { header: "Fee paid", value: (r: CertificateRequest) => (r.fee_paid ? "Yes" : "No") },
        { header: "Status", value: (r: CertificateRequest) => r.status },
        { header: "Requested at", value: (r: CertificateRequest) => r.requested_at.slice(0, 10) },
        { header: "Issued at", value: (r: CertificateRequest) => r.issued_at?.slice(0, 10) ?? "" },
      ],
      data,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Certificate Management"
        subtitle="Track bonafide, transfer and provisional certificate requests from request through print to issue."
        actions={
          <>
            <Button variant="secondary" className="w-auto" onClick={handleExport}>
              Export
            </Button>
            <Button variant="primarySmall" className="w-auto" onClick={() => setShowNew(true)}>
              + New request
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats.data?.pending ?? (stats.isLoading ? "…" : 0)} icon="hourglass_empty" />
        <StatCard label="Ready to print" value={stats.data?.ready_to_print ?? (stats.isLoading ? "…" : 0)} icon="print" />
        <StatCard label="Printed" value={stats.data?.printed ?? (stats.isLoading ? "…" : 0)} icon="description" />
        <StatCard label="Fee unpaid" value={stats.data?.fee_unpaid ?? (stats.isLoading ? "…" : 0)} icon="payments" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs options={TABS} value={status} onChange={(k) => setStatus(k as typeof status)} />
          <SearchBar placeholder="Search by register number…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
        </div>
      </Card>

      {rows.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Requests</span>
            <span className="text-[12.5px] text-muted">{data.length} records</span>
          </div>
          {data.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No certificate requests match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[160px]">Certificate type</div>
                <div className="w-[110px]">Fee</div>
                <div className="w-[130px]">Status</div>
                <div className="w-[170px] text-right">Actions</div>
              </div>
              {data.map((r) => {
                const next = NEXT_STATUS[r.status];
                return (
                  <div key={r.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink">{studentName(r)}</div>
                      <div className="text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
                    </div>
                    <div className="w-[160px] text-[12.5px] text-ink">{r.certificate_types.name}</div>
                    <div className="w-[110px]">
                      {r.fee_amount != null ? (
                        <button type="button" className="cursor-pointer" onClick={() => updateFee.mutate({ id: r.id, fee_paid: !r.fee_paid })}>
                          <Badge tone={r.fee_paid ? "accentDark" : "danger"}>{r.fee_paid ? currencyShort(r.fee_amount) : `${currencyShort(r.fee_amount)} DUE`}</Badge>
                        </button>
                      ) : (
                        <span className="text-[12px] text-subtle">No fee</span>
                      )}
                    </div>
                    <div className="w-[130px]">
                      <Badge tone={STATUS_TONE[r.status]}>{r.status.replace(/_/g, " ").toUpperCase()}</Badge>
                    </div>
                    <div className="w-[170px] text-right">
                      {next ? (
                        <Button
                          variant="secondary"
                          className="w-auto px-3 py-1.5 text-[12px]"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: r.id, status: next })}
                        >
                          {NEXT_LABEL[r.status]}
                        </Button>
                      ) : (
                        <span className="text-[12px] text-subtle">Issued {r.issued_at?.slice(0, 10)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <NewCertificateRequestModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function NewCertificateRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const certificateTypes = useCertificateTypes();
  const lookup = useLookupStudentByRegisterNo();
  const createRequest = useCreateCertificateRequest();

  const [registerNo, setRegisterNo] = useState("");
  const [certificateTypeId, setCertificateTypeId] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [student, setStudent] = useState<{ id: number; name: string | null; register_no: string } | null>(null);

  function handleClose() {
    setRegisterNo("");
    setCertificateTypeId("");
    setFeeAmount("");
    setStudent(null);
    lookup.reset();
    createRequest.reset();
    onClose();
  }

  function handleLookup() {
    if (!registerNo.trim()) return;
    lookup.mutate(registerNo.trim(), {
      onSuccess: (result) => setStudent({ id: result.id, name: result.name, register_no: result.register_no }),
      onError: () => setStudent(null),
    });
  }

  function handleCreate() {
    if (!student || !certificateTypeId) return;
    createRequest.mutate(
      { student_id: student.id, certificate_type_id: Number(certificateTypeId), fee_amount: feeAmount ? Number(feeAmount) : undefined },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="New certificate request" subtitle="Look up the student by register number, then choose the certificate type.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Register number</label>
          <div className="flex gap-2">
            <Input value={registerNo} onChange={(e) => setRegisterNo(e.target.value)} placeholder="e.g. 21CS045" />
            <Button variant="secondary" className="w-auto shrink-0" disabled={lookup.isPending} onClick={handleLookup}>
              {lookup.isPending ? "…" : "Find"}
            </Button>
          </div>
          {lookup.isError && isNotFound(lookup.error) && <p className="mt-1.5 text-[12px] text-danger-fg">No student found with this register number.</p>}
          {student && (
            <p className="mt-1.5 text-[12.5px] font-semibold text-primary">
              {student.name ?? student.register_no} · {student.register_no}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Certificate type</label>
          <Select value={certificateTypeId} onChange={(e) => setCertificateTypeId(e.target.value)}>
            <option value="">Select…</option>
            {(certificateTypes.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee amount (₹, optional)</label>
          <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="e.g. 200" />
        </div>
        {createRequest.isError && <p className="text-[12px] text-danger-fg">{(createRequest.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!student || !certificateTypeId || createRequest.isPending} onClick={handleCreate}>
            {createRequest.isPending ? "Creating…" : "Create request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
