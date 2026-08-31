"use client";

import { useMemo, useState } from "react";
import { friendlyError } from "@/lib/utils/errors";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FilterBar,
  FilterPill,
  Pagination,
  PageHeader,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useAdminServiceRequests,
  useReviewServiceRequest,
  type ServiceRequestRow,
  type ServiceRequestStatus,
} from "@/modules/admin/api/serviceRequests";

// Secretary's SOP (service request) feature has always had a real Admin
// review endpoint (PATCH /me/service-requests/:id/review) and Admin-scoped
// list (GET /me/service-requests returns every request, not just the
// caller's own, when the caller is Admin) — no backend change needed here.
// The gap was purely on this side: no Admin page ever called either route,
// so a submitted SOP request had nowhere to surface once it left the
// Secretary Portal. Same "real backend, missing frontend wiring" shape as
// the hostel-leave routing fix.

const STATUS_TABS: Array<{ value: ServiceRequestStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_TONE: Record<ServiceRequestStatus, "primary" | "warning" | "success" | "danger"> = {
  draft: "primary",
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminSopRequestsPage() {
  const { show } = useToast();
  const [status, setStatus] = useState<ServiceRequestStatus | "all">("pending");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<ServiceRequestRow | null>(null);

  const params = useMemo(() => ({ status, page, limit: 20 }), [status, page]);
  const { data, isLoading, isError } = useAdminServiceRequests(params);
  const review = useReviewServiceRequest();

  async function handleApprove(row: ServiceRequestRow) {
    try {
      await review.mutateAsync({ id: row.id, decision: "approved" });
      show("Service request approved.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    try {
      await review.mutateAsync({ id: rejecting.id, decision: "rejected" });
      show("Service request rejected.", "success");
      setRejecting(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const columns: DataTableColumn<ServiceRequestRow>[] = [
    {
      key: "title",
      header: "Request",
      render: (row) => (
        <div>
          <p className="font-semibold text-admin-ink">{row.title}</p>
          <p className="text-xs text-admin-subtle">
            SR-{row.id} · raised by {row.requested_by.name}
          </p>
        </div>
      ),
    },
    {
      key: "items",
      header: "Services",
      render: (row) =>
        row.items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {row.items.map((it) => (
              <span key={it.id} className="rounded-full border border-admin-border bg-admin-subtle-bg px-2.5 py-1 text-xs text-admin-body">
                {it.service_name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-admin-subtle">No services listed</span>
        ),
    },
    {
      key: "requested",
      header: "Requested",
      render: (row) => <span className="text-xs text-admin-muted">{new Date(row.created_at).toLocaleDateString()}</span>,
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
        if (row.status !== "pending") {
          return (
            <span className="text-xs text-admin-subtle">
              {row.reviewed_by ? `Reviewed by ${row.reviewed_by.name}` : "—"}
            </span>
          );
        }
        const isActingOnThis = review.isPending && review.variables?.id === row.id;
        return (
          <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="primary" size="sm" disabled={isActingOnThis} onClick={() => handleApprove(row)}>
              {isActingOnThis && review.variables?.decision === "approved" ? "Approving…" : "Approve"}
            </Button>
            <Button variant="secondary" size="sm" disabled={isActingOnThis} onClick={() => setRejecting(row)}>
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="SOP requests"
        description="Review service requests submitted by department secretaries and decide each one."
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
          <p className="text-sm text-admin-subtle">
            {meta ? `${meta.total} request${meta.total === 1 ? "" : "s"} in this view` : "Loading…"}
          </p>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={isError ? "Couldn't load service requests. Try again." : null}
        emptyTitle="No requests match this filter"
        footer={meta && <Pagination page={meta.page} pageSize={meta.limit} total={meta.total} onPageChange={setPage} />}
      />

      <ConfirmDialog
        open={!!rejecting}
        title="Reject this service request?"
        message={`This marks "${rejecting?.title ?? ""}" as rejected and notifies ${rejecting?.requested_by.name ?? "the secretary"}. This can't be undone from here.`}
        confirmLabel="Reject"
        destructive
        isConfirming={review.isPending}
        onConfirm={handleReject}
        onClose={() => setRejecting(null)}
      />
    </div>
  );
}
