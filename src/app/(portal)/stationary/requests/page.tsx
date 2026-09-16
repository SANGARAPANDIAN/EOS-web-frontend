"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Button,
  Badge,
  type BadgeTone,
  DataTable,
  type DataTableColumn,
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import { ApiError } from "@/types/api";
import {
  useStationaryRequests,
  useUpdateStationaryStatus,
  useCreateCounterEntry,
  NEXT_STATUS,
  type StationaryRequest,
  type StationaryRequestStatus,
  type PaymentMode,
} from "@/modules/stationary/api/requests";

const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  upi: "UPI",
  cash: "Cash",
  internal_voucher: "Internal voucher",
};

// Ported from "Stationery Portal.dc.html"'s Print Requests page: 2 tabs
// (Pending/Completed) each with their own 4 stat cards (reqStats, lines
// 157-165) and job table (reqRows, lines 167-185), plus the "Add entry"
// counter modal (lines 448-492). Pending bundles every still-active status
// (paid/processing/ready_for_pickup) since the design's own single "Pending"
// tab is where a vendor works a job through its whole lifecycle; Completed
// bundles the two terminal states (completed/rejected), matching the
// design's "no longer active" grouping — a rejected job doesn't vanish, it
// just stops needing action. DB values themselves are never renamed: this
// page only relabels them for display.

type Tab = "pending" | "completed";

const TAB_STATUSES: Record<Tab, StationaryRequestStatus[]> = {
  pending: ["paid", "processing", "ready_for_pickup"],
  completed: ["completed", "rejected"],
};

const STATUS_TONE: Record<StationaryRequestStatus, BadgeTone> = {
  pending_payment: "neutral",
  paid: "primary",
  processing: "primary",
  ready_for_pickup: "warning",
  completed: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<StationaryRequestStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Pending",
  processing: "In progress",
  ready_for_pickup: "Ready",
  completed: "Collected",
  rejected: "Rejected",
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  processing: "Start printing",
  ready_for_pickup: "Mark ready",
  completed: "Mark collected",
};

// PR-#### job-id token, matching the design's own id scheme (its mock data
// used PR-4821 etc.) — real ids are plain small integers, so this is purely
// a display format, never sent back to the API as-is.
function jobToken(id: number): string {
  return `PR-${(4800 + id).toString()}`;
}

function formatRupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

interface CounterForm {
  requester_name: string;
  department: string;
  document: string;
  specification: string;
  copies: string;
  amount: string;
  payment_mode: PaymentMode;
}

const EMPTY_COUNTER_FORM: CounterForm = {
  requester_name: "",
  department: "",
  document: "",
  specification: "",
  copies: "1",
  amount: "",
  payment_mode: "cash",
};

export default function StationaryRequestsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterForm, setCounterForm] = useState<CounterForm>(EMPTY_COUNTER_FORM);
  const [rejectTarget, setRejectTarget] = useState<StationaryRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { show } = useToast();

  const { data: requests, isLoading, error } = useStationaryRequests();
  const updateStatus = useUpdateStationaryStatus();
  const createCounterEntry = useCreateCounterEntry();

  const rows = useMemo(
    () => (requests ?? []).filter((r) => TAB_STATUSES[tab].includes(r.status)),
    [requests, tab],
  );

  const counts = useMemo(() => {
    const list = requests ?? [];
    return {
      pending: list.filter((r) => TAB_STATUSES.pending.includes(r.status)).length,
      completed: list.filter((r) => TAB_STATUSES.completed.includes(r.status)).length,
    };
  }, [requests]);

  function handleAdvance(row: StationaryRequest) {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    updateStatus.mutate(
      { id: row.id, status: next },
      {
        onSuccess: () => show(`Job #${row.id} moved to "${STATUS_LABEL[next]}".`, "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    updateStatus.mutate(
      { id: rejectTarget.id, status: "rejected", rejection_reason: rejectReason.trim() },
      {
        onSuccess: () => {
          show(`Job #${rejectTarget.id} rejected.`, "success");
          setRejectTarget(null);
          setRejectReason("");
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function handleSaveCounterEntry() {
    const copies = Number(counterForm.copies);
    const amount = Number(counterForm.amount);
    if (!counterForm.requester_name.trim() || !copies || copies < 1 || !amount || amount <= 0) {
      show("Requester name, copies and amount are required.", "error");
      return;
    }
    createCounterEntry.mutate(
      {
        requester_name: counterForm.requester_name.trim(),
        department: counterForm.department.trim() || undefined,
        document: counterForm.document.trim() || undefined,
        specification: counterForm.specification.trim() || undefined,
        copies,
        amount,
        payment_mode: counterForm.payment_mode,
      },
      {
        onSuccess: () => {
          show("Entry saved.", "success");
          setCounterOpen(false);
          setCounterForm(EMPTY_COUNTER_FORM);
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  const columns: DataTableColumn<StationaryRequest>[] = [
    { key: "id", header: "Job ID", render: (r) => <span className="font-semibold text-admin-primary">{jobToken(r.id)}</span> },
    {
      key: "requester",
      header: "Requester",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-ink">{r.requester_name ?? "Walk-in"}</p>
          <p className="text-xs text-admin-muted">{r.requester_department ?? "—"}</p>
        </div>
      ),
    },
    { key: "document", header: "Document", render: (r) => r.file_summary ?? "—" },
    { key: "specification", header: "Specification", render: (r) => <span className="text-admin-muted">{r.specification ?? "—"}</span> },
    { key: "copies", header: "Copies", render: (r) => r.copies },
    { key: "amount", header: "Amount", render: (r) => <span className="font-semibold">{formatRupees(r.amount)}</span> },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {r.status === "rejected" && r.rejection_reason && (
            <span className="text-xs text-admin-muted" title={r.rejection_reason}>
              {r.rejection_reason}
            </span>
          )}
          {tab === "pending" && NEXT_STATUS[r.status] && (
            <Button size="sm" variant="primary" disabled={updateStatus.isPending} onClick={() => handleAdvance(r)}>
              {NEXT_ACTION_LABEL[NEXT_STATUS[r.status]!]}
            </Button>
          )}
          {/* Reject only makes sense before printing has started — once a
              job is in progress or ready, the only forward action left is
              advancing it (never rejecting a job already being printed). */}
          {tab === "pending" && r.status === "paid" && (
            <Button size="sm" variant="secondary" disabled={updateStatus.isPending} onClick={() => setRejectTarget(r)}>
              Reject
            </Button>
          )}
          <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status].toUpperCase()}</Badge>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Print Requests"
        description="Every job from the student/staff online form plus counter walk-ins."
        actions={
          <Button variant="primary" onClick={() => setCounterOpen(true)}>
            <Icon name="add" size={16} /> Add entry
          </Button>
        }
      />

      <div className="flex gap-7 border-b border-admin-divider">
        {(["pending", "completed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 border-b-2 pb-3 text-[15px] font-semibold transition-colors ${
              tab === t
                ? "border-admin-primary text-admin-primary"
                : "border-transparent text-admin-muted hover:text-admin-body"
            }`}
          >
            {t === "pending" ? "Pending" : "Completed"}
            <span
              className={`rounded-admin-pill px-2 py-0.5 text-xs font-bold ${
                tab === t ? "bg-admin-tint-strong text-admin-primary-deep" : "bg-admin-tint text-admin-muted"
              }`}
            >
              {t === "pending" ? counts.pending : counts.completed}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load requests." : null}
        emptyIcon="inventory_2"
        emptyTitle="No jobs in this tab"
      />

      <Modal open={counterOpen} onClose={() => setCounterOpen(false)} title="Add entry" widthClassName="max-w-2xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Requester">
              <Input
                placeholder="Name"
                value={counterForm.requester_name}
                onChange={(e) => setCounterForm((f) => ({ ...f, requester_name: e.target.value }))}
              />
            </FormField>
            <FormField label="Department">
              <Input
                placeholder="e.g. CSE · III Year"
                value={counterForm.department}
                onChange={(e) => setCounterForm((f) => ({ ...f, department: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Document">
            <Input
              placeholder="e.g. Lab manual revision"
              value={counterForm.document}
              onChange={(e) => setCounterForm((f) => ({ ...f, document: e.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Specification">
              <Input
                placeholder="B&W · A4"
                value={counterForm.specification}
                onChange={(e) => setCounterForm((f) => ({ ...f, specification: e.target.value }))}
              />
            </FormField>
            <FormField label="Copies">
              <Input
                type="number"
                min={1}
                value={counterForm.copies}
                onChange={(e) => setCounterForm((f) => ({ ...f, copies: e.target.value }))}
              />
            </FormField>
            <FormField label="Amount">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                value={counterForm.amount}
                onChange={(e) => setCounterForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Payment mode" hint="How the counter payment was actually settled — feeds Reports' collection breakdown.">
            <Select
              value={counterForm.payment_mode}
              onChange={(e) => setCounterForm((f) => ({ ...f, payment_mode: e.target.value as PaymentMode }))}
            >
              {(Object.keys(PAYMENT_MODE_LABEL) as PaymentMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {PAYMENT_MODE_LABEL[mode]}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCounterOpen(false)} disabled={createCounterEntry.isPending}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveCounterEntry} disabled={createCounterEntry.isPending}>
              {createCounterEntry.isPending ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={rejectTarget !== null}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        title={`Reject job #${rejectTarget?.id ?? ""}`}
        widthClassName="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <FormField label="Reason" hint="Shown to the requester on their own order history.">
            <Textarea
              rows={3}
              placeholder="e.g. Out of paper stock"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleReject} disabled={updateStatus.isPending || !rejectReason.trim()}>
              {updateStatus.isPending ? "Rejecting…" : "Reject job"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
