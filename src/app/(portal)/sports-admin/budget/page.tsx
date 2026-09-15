"use client";

import { useState } from "react";
import { Card, Badge, Button, Icon, Input, Modal, Select, Textarea, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useBudgetRequests,
  useCreateBudgetRequest,
  useApproveBudgetRequest,
  useRejectBudgetRequest,
  type BudgetRequest,
} from "@/modules/sports-admin/api/budget";
import { useAuth } from "@/lib/auth/AuthContext";
import type { ApprovalStatus } from "@/modules/sports-admin/api/types";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<ApprovalStatus, BadgeTone> = {
  pending: "neutral",
  approved: "accent",
  rejected: "accentDark",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function BudgetPage() {
  const [status, setStatus] = useState<string>("");
  const budgetRequests = useBudgetRequests((status as ApprovalStatus) || undefined);
  const createBudgetRequest = useCreateBudgetRequest();
  const approveBudgetRequest = useApproveBudgetRequest();
  const rejectBudgetRequest = useRejectBudgetRequest();

  // Sports raises a budget request; Finance decides it (POST :id/approve is
  // @Roles(FINANCE, ADMIN)). Showing the buttons to a sports_admin produced a
  // 403 on every click, so the decision controls only render for the roles that
  // actually hold the decision.
  const { session } = useAuth();
  const canDecide = session?.user.role === "finance" || session?.user.role === "admin";

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setTitle("");
    setDescription("");
    setAmount("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createBudgetRequest.mutateAsync({
        title,
        description: description || undefined,
        amount: Number(amount),
      });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<BudgetRequest>[] = [
    { key: "title", header: "Request", width: "1.2fr", render: (r) => <span className="font-bold text-ink">{r.title}</span> },
    {
      key: "description",
      header: "Description",
      width: "1.6fr",
      render: (r) => <span className="text-body">{r.description ?? "—"}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      width: "1fr",
      render: (r) => <span className="font-mono text-[12.5px] text-muted">{currencyFormatter.format(r.amount)}</span>,
    },
    {
      key: "raised_by",
      header: "Raised by",
      width: "1.2fr",
      render: (r) => <span className="text-body">{r.raised_by.email}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "1.2fr",
      align: "right",
      render: (r) => {
        if (r.status !== "pending") return <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>;
        if (!canDecide) {
          // Says where the request actually is, instead of offering an action
          // this role cannot perform.
          return <Badge tone="neutral">Awaiting Finance</Badge>;
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => approveBudgetRequest.mutate(r.id)}
              disabled={approveBudgetRequest.isPending}
              className="rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => rejectBudgetRequest.mutate(r.id)}
              disabled={rejectBudgetRequest.isPending}
              className="rounded-[8px] border border-border-default px-3 py-1.5 text-[12px] font-bold text-muted hover:text-danger-fg disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Budget requests</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {budgetRequests.data ? `${budgetRequests.data.length} request${budgetRequests.data.length === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Raise request
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={budgetRequests.data ?? []}
        rowKey={(r) => r.id}
        emptyMessage={budgetRequests.isLoading ? "Loading…" : "No budget requests yet. Use Raise request to create the first one."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Raise budget request" subtitle="Sent to the sports office approval queue">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Title</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New athletics kit" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Description</label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what the budget is for" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Amount</label>
            <Input type="number" required min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" />
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!title || !amount || createBudgetRequest.isPending}>
              {createBudgetRequest.isPending ? "Submitting…" : "Raise request"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
