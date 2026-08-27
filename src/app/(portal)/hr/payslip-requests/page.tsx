"use client";

import { useState } from "react";
import {
  Banner,
  Button,
  Badge,
  Card,
  ConfirmDialog,
  DataTable,
  Icon,
  IconButton,
  Input,
  Modal,
  SegmentedTabs,
  type DataTableColumn,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useUpdatePayslipRequest,
  usePayslipRequests,
  type PayslipRequest,
  type PayslipRequestStatus,
} from "@/modules/hr/api/payslipRequests";
import { HrFacultyPicker } from "@/modules/hr/components/HrFacultyPicker";
import type { HrFaculty } from "@/modules/hr/api/facultyDirectory";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "all" | PayslipRequestStatus;

const STATUS_TONE: Record<PayslipRequestStatus, BadgeTone> = {
  pending: "neutral",
  processed: "accent",
  rejected: "danger",
};

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function facultyName(f: { first_name: string; last_name: string } | null | undefined): string {
  return f ? `${f.first_name} ${f.last_name}`.trim() : "Non-faculty staff";
}

function ProcessPayslipModal({ request, onClose }: { request: PayslipRequest; onClose: () => void }) {
  const updateRequest = useUpdatePayslipRequest();
  const [fileUrl, setFileUrl] = useState(request.file_url ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!fileUrl.trim()) {
      setError("Enter the payslip file link.");
      return;
    }
    setError(null);
    try {
      await updateRequest.mutateAsync({ id: request.id, input: { status: "processed", file_url: fileUrl.trim() } });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not process this request.");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Process payslip request"
      subtitle={`${facultyName(request.faculty)} · ${monthLabel(request.month)}`}
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <div className="mb-1.5 text-[13px] font-bold text-body">Payslip file link</div>
          <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" />
          <p className="mt-1.5 text-[12px] text-subtle">Direct link to the generated payslip — there&apos;s no upload flow yet.</p>
        </div>
        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={updateRequest.isPending}>
          {updateRequest.isPending ? "Saving…" : "Mark processed"}
        </Button>
      </div>
    </Modal>
  );
}

export default function HrPayslipRequestsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [month, setMonth] = useState("");
  const [faculty, setFaculty] = useState<HrFaculty | null>(null);
  const [processTarget, setProcessTarget] = useState<PayslipRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PayslipRequest | null>(null);

  const payslips = usePayslipRequests({
    month: month || undefined,
    faculty_id: faculty?.id,
    limit: 100,
  });

  const rejectRequest = useUpdatePayslipRequest();

  const allRows = payslips.data?.data ?? [];
  const rows = tab === "all" ? allRows : allRows.filter((r) => r.status === tab);

  const tabOptions = [
    { key: "all", label: `All (${allRows.length})` },
    { key: "pending", label: `Pending (${allRows.filter((r) => r.status === "pending").length})` },
    { key: "processed", label: `Processed (${allRows.filter((r) => r.status === "processed").length})` },
    { key: "rejected", label: `Rejected (${allRows.filter((r) => r.status === "rejected").length})` },
  ];

  const columns: DataTableColumn<PayslipRequest>[] = [
    {
      key: "faculty",
      header: "Faculty",
      width: "1.5fr",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">{facultyName(row.faculty)}</div>
          <div className="truncate text-[12px] text-muted">
            {row.faculty ? row.faculty.department.name : `Requested via Secretary portal (user #${row.staff_user_id})`}
          </div>
        </div>
      ),
    },
    { key: "month", header: "Month", render: (row) => monthLabel(row.month) },
    { key: "purpose", header: "Purpose", render: (row) => row.purpose ?? "—" },
    { key: "status", header: "Status", align: "center", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge> },
    { key: "requested_at", header: "Requested", render: (row) => formatDisplayDate(row.requested_at) },
    {
      key: "actions",
      header: "",
      width: "190px",
      align: "right",
      render: (row) => {
        if (row.status === "pending") {
          return (
            <div className="flex justify-end gap-2">
              <IconButton icon="cancel" size={32} iconSize={16} className="text-danger-fg" onClick={() => setRejectTarget(row)} />
              <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12.5px]" onClick={() => setProcessTarget(row)}>
                Process
              </Button>
            </div>
          );
        }
        if (row.status === "processed" && row.file_url) {
          return (
            <a
              href={row.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary hover:underline"
            >
              <Icon name="download" size={15} />
              File
            </a>
          );
        }
        return <span className="text-[12px] text-subtle">—</span>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Payslip requests</h1>
        <p className="mt-1 text-[13px] text-muted">Process a faculty payslip request or reject it — no upload flow, just a file link.</p>
      </div>

      {payslips.isError && (
        <Banner>{payslips.error instanceof ApiError ? payslips.error.message : "Could not load payslip requests."}</Banner>
      )}

      <SegmentedTabs options={tabOptions} value={tab} onChange={(key) => setTab(key as Tab)} />

      <Card className="flex flex-col gap-4 p-[18px_20px]">
        <h2 className="text-[15px] font-extrabold text-ink">Filters</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Month</label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Faculty</label>
            {/* Searchable rather than a dropdown: the list endpoint caps a page
                at 100 rows and there are ~500 faculty. */}
            <HrFacultyPicker
              value={faculty}
              onChange={setFaculty}
              placeholder="All faculty — search by name, roll no, designation or email"
            />
          </div>
        </div>
      </Card>

      <DataTable columns={columns} data={rows} rowKey={(row) => row.id} loading={payslips.isLoading} emptyMessage="No payslip requests match these filters." />

      {processTarget && <ProcessPayslipModal request={processTarget} onClose={() => setProcessTarget(null)} />}

      <ConfirmDialog
        open={rejectTarget !== null}
        destructive
        title="Reject this payslip request?"
        description={rejectTarget ? `${facultyName(rejectTarget.faculty)} · ${monthLabel(rejectTarget.month)}` : undefined}
        confirmLabel={rejectRequest.isPending ? "Rejecting…" : "Reject request"}
        onConfirm={() => {
          if (!rejectTarget) return;
          rejectRequest.mutate(
            { id: rejectTarget.id, input: { status: "rejected" } },
            { onSuccess: () => setRejectTarget(null) },
          );
        }}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
