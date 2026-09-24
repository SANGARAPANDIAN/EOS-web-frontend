"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import {
  Badge,
  Button,
  DataTable,
  KpiCard,
  PageHeader,
  Select,
  SegmentedPillToggle,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useFinanceProposals,
  useOrders,
  type ProposalKind,
  type ProposalStatus,
  type ProposalView,
} from "@/modules/admin/api/procurement";
import { AssignVendorDialog } from "@/modules/admin/components/procurement/AssignVendorDialog";
import { MarkSentDialog } from "@/modules/admin/components/procurement/MarkSentDialog";

const STATUS_OPTIONS: { value: ProposalStatus | ""; label: string }[] = [
  { value: "finance_approved", label: "Finance approved (ready for a vendor)" },
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "hod_approved", label: "HoD approved" },
  { value: "principal_approved", label: "Principal approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ProcurementPage() {
  const [kind, setKind] = useState<ProposalKind>("pop");
  const [status, setStatus] = useState<ProposalStatus | "">("finance_approved");
  const [assignTarget, setAssignTarget] = useState<ProposalView | null>(null);
  const [sentTarget, setSentTarget] = useState<{ proposal: ProposalView; orderId: number } | null>(null);

  const { data: proposals = [], isLoading, error } = useFinanceProposals(kind, status || undefined);
  const { data: orders = [] } = useOrders(kind);

  const orderByProposalId = useMemo(() => new Map(orders.map((o) => [o.proposal_id, o])), [orders]);

  const noVendorCount = proposals.filter((p) => p.status === "finance_approved" && !p.vendor_id).length;

  const columns: DataTableColumn<ProposalView>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (p) => (
        <div>
          <div className="font-semibold text-admin-ink">{p.reference}</div>
          <div className="text-xs text-admin-muted">{p.title}</div>
        </div>
      ),
    },
    { key: "department", header: "Department", render: (p) => p.department ?? "—" },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      mono: true,
      render: (p) => p.approved_amount ?? p.estimated_amount ?? "—",
    },
    { key: "status", header: "Status", render: (p) => <Badge tone={p.status === "rejected" ? "danger" : "neutral"}>{p.status.replaceAll("_", " ")}</Badge> },
    { key: "vendor", header: "Vendor", render: (p) => p.vendor ?? <span className="text-admin-muted">Not assigned</span> },
    { key: "order", header: "Order #", render: (p) => p.order_number ?? "—" },
    {
      key: "sent",
      header: "Sent to vendor",
      render: (p) => {
        const order = orderByProposalId.get(p.id);
        if (!order?.sent_to_vendor_at) return "—";
        return new Date(order.sent_to_vendor_at).toLocaleDateString();
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => {
        const order = orderByProposalId.get(p.id);
        if (!p.vendor_id) {
          return (
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setAssignTarget(p)}>
              Assign vendor
            </Button>
          );
        }
        if (order && !order.sent_to_vendor_at) {
          return (
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setSentTarget({ proposal: p, orderId: order.id })}>
              Mark sent
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Purchase & Service Orders</span>
      </nav>

      <PageHeader
        title="Purchase & Service Orders"
        description="Once Finance approves a proposal, the order is created automatically — this screen is where a vendor gets assigned to it and it gets marked as sent."
      />

      <div className="mt-5 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Finance-approved, no vendor yet" value={noVendorCount.toLocaleString()} icon="storefront" />
        <KpiCard label={`Total ${kind === "pop" ? "purchase" : "service"} order proposals`} value={proposals.length.toLocaleString()} icon="receipt_long" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedPillToggle
          options={[
            { value: "pop", label: "Purchase Orders" },
            { value: "sop", label: "Service Orders" },
          ]}
          value={kind}
          onChange={setKind}
        />
        <div className="w-72">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProposalStatus | "")}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={proposals}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load proposals." : null}
        emptyIcon="receipt_long"
        emptyTitle="No proposals found"
        emptyDescription="Try a different status filter."
      />

      {assignTarget && (
        <AssignVendorDialog open proposal={assignTarget} kind={kind} onClose={() => setAssignTarget(null)} />
      )}
      {sentTarget && (
        <MarkSentDialog
          open
          proposal={sentTarget.proposal}
          orderId={sentTarget.orderId}
          kind={kind}
          onClose={() => setSentTarget(null)}
        />
      )}
    </div>
  );
}
