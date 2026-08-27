"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FilterBar,
  FilterPill,
  Input,
  Pagination,
  PageHeader,
  Select,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useBonafideRequests,
  useDecideBonafideRequest,
  usePrintBonafideRequest,
  type BonafideRequestDetail,
  type BonafideRequestListItem,
  type BonafideStatus,
} from "@/modules/admin/api/bonafideRequests";
import { useBonafideReasons } from "@/modules/admin/api/refData";
import { BonafideBankDocument, type FeeParticularRow } from "@/modules/admin/components/bonafide/BonafideBankDocument";
import { BonafideGenericDocument } from "@/modules/admin/components/bonafide/BonafideGenericDocument";
import { BONAFIDE_LOGO_SRC } from "@/modules/admin/components/bonafide/BonafideLetterhead";
import { BonafidePrintDialog } from "@/modules/admin/components/bonafide/BonafidePrintDialog";

const STATUS_TABS: Array<{ value: BonafideStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "faculty_approved", label: "Accepted" },
  { value: "issued", label: "Issued" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_TONE: Record<BonafideStatus, "primary" | "warning" | "success" | "danger"> = {
  pending: "warning",
  faculty_approved: "primary",
  issued: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<BonafideStatus, string> = {
  pending: "Pending",
  faculty_approved: "Accepted",
  issued: "Issued",
  rejected: "Rejected",
};

function isBankLoanReason(reasonText: string): boolean {
  return /bank|loan/i.test(reasonText);
}

function studentName(row: BonafideRequestListItem): string {
  return [row.student.first_name, row.student.last_name].filter(Boolean).join(" ").trim() || "—";
}

interface PrintJob {
  request: BonafideRequestDetail;
  feeRows: FeeParticularRow[] | null;
}

export default function BonafideRequestsPage() {
  const { show } = useToast();
  const [status, setStatus] = useState<BonafideStatus | "all">("all");
  const [reasonId, setReasonId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  const [rejecting, setRejecting] = useState<BonafideRequestListItem | null>(null);
  const [feeDialogRequest, setFeeDialogRequest] = useState<BonafideRequestListItem | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);

  const reasons = useBonafideReasons();

  const params = useMemo(
    () => ({
      status,
      reason_id: reasonId === "all" ? undefined : reasonId,
      q: debouncedSearch || undefined,
      page,
      limit: 20,
    }),
    [status, reasonId, debouncedSearch, page],
  );
  const { data, isLoading, isError } = useBonafideRequests(params);

  const decideRequest = useDecideBonafideRequest();
  const printRequest = usePrintBonafideRequest();

  async function handleAccept(row: BonafideRequestListItem) {
    try {
      await decideRequest.mutateAsync({ id: row.id, decision: "approve" });
      show("Request accepted.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    try {
      await decideRequest.mutateAsync({ id: rejecting.id, decision: "reject" });
      show("Request rejected.", "success");
      setRejecting(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function runPrint(id: number, feeRows: FeeParticularRow[] | null) {
    try {
      const detail = await printRequest.mutateAsync(id);
      setPrintJob({ request: detail, feeRows });
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  function handlePrintClick(row: BonafideRequestListItem) {
    if (isBankLoanReason(row.reason.reason_text)) {
      setFeeDialogRequest(row);
    } else {
      void runPrint(row.id, null);
    }
  }

  // Same print-trigger pattern as billing's receipt printing: pre-load the
  // letterhead crest before opening the print dialog (a display:none subtree
  // doesn't reliably fetch images), then reset once the browser's print flow
  // finishes.
  useEffect(() => {
    if (!printJob) return;
    function handleAfterPrint() {
      setPrintJob(null);
    }
    window.addEventListener("afterprint", handleAfterPrint);
    let cancelled = false;
    let timer = 0;
    const openPrintDialog = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => window.print(), 50);
    };
    const logo = new window.Image();
    logo.src = BONAFIDE_LOGO_SRC;
    if (logo.complete) {
      openPrintDialog();
    } else {
      logo.onload = openPrintDialog;
      logo.onerror = openPrintDialog;
    }
    return () => {
      cancelled = true;
      logo.onload = null;
      logo.onerror = null;
      window.removeEventListener("afterprint", handleAfterPrint);
      window.clearTimeout(timer);
    };
  }, [printJob]);

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const columns: DataTableColumn<BonafideRequestListItem>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div>
          <p className="font-semibold text-admin-ink">{studentName(row)}</p>
          <p className="text-xs text-admin-subtle">
            {row.student.register_no ?? row.student.student_id_no}
            {row.student.department ? ` · ${row.student.department.name}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Purpose",
      render: (row) => <span className="text-admin-body">{row.reason.reason_text}</span>,
    },
    {
      key: "requested",
      header: "Requested",
      render: (row) => (
        <span className="text-xs text-admin-muted">{new Date(row.requested_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => {
        const isAcceptingThis = decideRequest.isPending && decideRequest.variables?.id === row.id;
        const isPrintingThis = printRequest.isPending && printRequest.variables === row.id;
        return (
          <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {row.status === "pending" && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isAcceptingThis}
                  onClick={() => handleAccept(row)}
                >
                  {isAcceptingThis ? "Accepting…" : "Accept"}
                </Button>
                <button
                  type="button"
                  title="Reject"
                  onClick={() => setRejecting(row)}
                  className="rounded-admin-sm p-1.5 text-admin-danger hover:bg-admin-danger-bg"
                >
                  <Icon name="cancel" size={16} />
                </button>
              </>
            )}
            {(row.status === "faculty_approved" || row.status === "issued") && (
              <Button
                variant="primary"
                size="sm"
                disabled={isPrintingThis}
                onClick={() => handlePrintClick(row)}
              >
                <Icon name="print" size={15} />{" "}
                {isPrintingThis ? "Preparing…" : row.status === "issued" ? "Reprint" : "Print"}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bonafide requests"
        description="Accept, reject, and print bonafide certificate requests submitted by students."
      />

      <div className="mt-5 mb-4">
        <FilterBar
          pills={STATUS_TABS.map((tab) => (
            <FilterPill
              key={tab.value}
              active={status === tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </FilterPill>
          ))}
        >
          <div className="max-w-sm flex-1">
            <Input
              leadingIcon="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, register no…"
            />
          </div>
          <Select
            value={reasonId === "all" ? "all" : String(reasonId)}
            onChange={(e) => {
              setReasonId(e.target.value === "all" ? "all" : Number(e.target.value));
              setPage(1);
            }}
            className="w-auto"
          >
            <option value="all">All purposes</option>
            {reasons.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reason_text}
              </option>
            ))}
          </Select>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={isError ? "Couldn't load bonafide requests. Try again." : null}
        emptyTitle="No requests match this filter"
        footer={meta && <Pagination page={meta.page} pageSize={meta.limit} total={meta.total} onPageChange={setPage} />}
      />

      <BonafidePrintDialog
        open={!!feeDialogRequest}
        onClose={() => setFeeDialogRequest(null)}
        isSubmitting={printRequest.isPending}
        onConfirm={(feeRows) => {
          if (!feeDialogRequest) return;
          const id = feeDialogRequest.id;
          setFeeDialogRequest(null);
          void runPrint(id, feeRows);
        }}
      />

      <ConfirmDialog
        open={!!rejecting}
        title="Reject this request?"
        message={`This marks ${rejecting ? studentName(rejecting) : "the student"}'s bonafide request as rejected. This can't be undone from here.`}
        confirmLabel="Reject"
        destructive
        isConfirming={decideRequest.isPending}
        onConfirm={handleReject}
        onClose={() => setRejecting(null)}
      />

      {/* Hidden until the print stylesheet activates — same pattern as
          billing's receipt printing (createPortal into <body> so the print
          root sits outside the app's normal layout/scroll containers). */}
      {printJob &&
        createPortal(
          <div id="bonafide-print-root" data-print-root className="hidden print:block">
            {printJob.feeRows ? (
              <BonafideBankDocument request={printJob.request} feeRows={printJob.feeRows} />
            ) : (
              <BonafideGenericDocument request={printJob.request} />
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
