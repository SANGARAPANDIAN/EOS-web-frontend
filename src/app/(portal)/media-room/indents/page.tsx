"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Select, type BadgeTone } from "@/components/ui";
import {
  useIndents,
  useCreateIndent,
  useUpdateIndentStatus,
  useDeleteIndent,
  type IndentStatus,
  type IndentType,
  type BudgetHead,
} from "@/modules/media-room/api/indents";
import { formatDayAndTime, formatDisplayDate } from "@/lib/utils/date";

const STATUS_TONE: Record<IndentStatus, BadgeTone> = {
  pending: "accentDark",
  approved: "accent",
  fulfilled: "accent",
  rejected: "danger",
};

const STATUS_LABEL: Record<IndentStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
};

const TYPE_LABEL: Record<IndentType, string> = {
  capital_equipment: "Capital equipment",
  consumables: "Consumables",
  repair_service: "Repair & service",
  rental_hire: "Rental / hire",
};

const BUDGET_LABEL: Record<BudgetHead, string> = {
  media_branding: "Media & branding",
  institution_events: "Institution events",
  admissions_outreach: "Admissions outreach",
};

function money(value: string | null): string {
  if (!value) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default function RaiseIndentPage() {
  const indents = useIndents();
  const create = useCreateIndent();
  const updateStatus = useUpdateIndentStatus();
  const remove = useDeleteIndent();

  const [showForm, setShowForm] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [title, setTitle] = useState("");
  const [indentType, setIndentType] = useState<IndentType>("capital_equipment");
  const [quantity, setQuantity] = useState("1");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [budgetHead, setBudgetHead] = useState<BudgetHead>("media_branding");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);

  const notReady = indents.data && !indents.data.ready;
  const rows = indents.data?.data ?? [];

  async function submit() {
    if (!title.trim()) {
      setError("Give the indent a title.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        title: title.trim(),
        indent_type: indentType,
        quantity: Number(quantity) || 1,
        estimated_cost: estimatedCost ? Number(estimatedCost) : undefined,
        needed_by: neededBy || undefined,
        budget_head: budgetHead,
        justification: justification.trim() || undefined,
      });
      setTitle("");
      setQuantity("1");
      setEstimatedCost("");
      setNeededBy("");
      setJustification("");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not raise this indent.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Raise indent</h1>
          <p className="mt-1 text-[13px] text-muted">Equipment and consumable indents raised to the management · approval moves to the Principal.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className={`rounded-[11px] border px-4 py-2.5 text-[13.5px] font-bold ${showHistory ? "border-border-accent bg-accent-50 text-primary-dark" : "border-border-default bg-surface text-ink-soft"}`}
          >
            {showHistory ? "Hide history" : "History"}
          </button>
          <Button variant="primarySmall" className="w-auto" onClick={() => setShowForm((v) => !v)} disabled={!!notReady}>
            {showForm ? "Close" : "+ New indent"}
          </Button>
        </div>
      </div>

      {notReady ? (
        <EmptyState message="Indents aren't set up yet — ask an admin to run the pending database migration." />
      ) : (
        <>
          {showForm && (
            <Card data-mr-lift="1">
              <h2 className="mb-3 text-[17px] font-extrabold text-ink">Indent details</h2>
              <div className="grid grid-cols-2 gap-3.5">
                <Input placeholder="e.g. Two mirrorless bodies for event coverage" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                <Select value={indentType} onChange={(e) => setIndentType(e.target.value as IndentType)}>
                  {Object.entries(TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-3.5 grid grid-cols-4 gap-3.5">
                <Input type="number" min={1} placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                <Input type="number" min={0} placeholder="Estimated cost (₹)" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                <Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
                <Select value={budgetHead} onChange={(e) => setBudgetHead(e.target.value as BudgetHead)}>
                  {Object.entries(BUDGET_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <textarea
                className="mt-3.5 w-full rounded-[9px] border border-border-default bg-surface px-3 py-2 text-[13.5px] text-body outline-none focus:border-primary"
                rows={3}
                placeholder="Justification — why the media room needs this, current gear shortfall, events affected."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
              {error && <div className="mt-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
              <div className="mt-3.5 flex items-center gap-3">
                <span className="text-[12.5px] text-subtle">Route: Media Room Head → Principal</span>
                <div className="flex-1" />
                <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={create.isPending}>
                  {create.isPending ? "Submitting…" : "Submit indent"}
                </Button>
              </div>
            </Card>
          )}

          {showHistory && (
            <>
              <h2 className="mt-2 text-[19px] font-extrabold text-ink">Indent history</h2>
              {indents.isLoading ? (
                <EmptyState message="Loading…" />
              ) : rows.length === 0 ? (
                <EmptyState message="No indents raised yet." />
              ) : (
                <div className="flex flex-col gap-3">
                  {rows.map((i) => (
                    <Card data-mr-lift="1" key={i.id}>
                      <div className="flex items-center gap-2.5">
                        <Badge tone="neutral">{TYPE_LABEL[i.indent_type]}</Badge>
                        <span className="font-mono text-[12px] text-subtle">#{i.id} · raised {formatDayAndTime(i.created_at)}</span>
                        <div className="flex-1" />
                        <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                      </div>
                      <div className="mt-2.5 text-[17px] font-extrabold text-ink">{i.title}</div>
                      {i.justification && <p className="mt-1 text-[13.5px] text-body">{i.justification}</p>}
                      {i.resolution_notes && <p className="mt-1 text-[12.5px] text-subtle">Note: {i.resolution_notes}</p>}

                      <div className="mt-3.5 grid grid-cols-4 gap-3.5 border-t border-divider pt-3.5">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Amount</div>
                          <div className="mt-1 text-[14.5px] font-bold text-ink">{money(i.estimated_cost)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Quantity</div>
                          <div className="mt-1 text-[14.5px] font-bold text-ink">{i.quantity}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Needed by</div>
                          <div className="mt-1 text-[14.5px] font-bold text-ink">{i.needed_by ? formatDisplayDate(i.needed_by) : "—"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Budget head</div>
                          <div className="mt-1 text-[14.5px] font-bold text-ink">{BUDGET_LABEL[i.budget_head]}</div>
                        </div>
                      </div>

                      <div className="mt-3.5 flex justify-end gap-2 border-t border-divider pt-3.5">
                        {i.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus.mutate({ id: i.id, status: "rejected" })}
                              disabled={updateStatus.isPending}
                              className="rounded-[7px] border border-danger-border px-3 py-1.5 text-[12.5px] font-bold text-danger-fg hover:bg-danger-bg"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus.mutate({ id: i.id, status: "approved" })}
                              disabled={updateStatus.isPending}
                              className="rounded-[7px] bg-primary px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
                            >
                              Approve
                            </button>
                          </>
                        )}
                        {i.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => updateStatus.mutate({ id: i.id, status: "fulfilled" })}
                            disabled={updateStatus.isPending}
                            className="rounded-[7px] bg-primary px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
                          >
                            Mark fulfilled
                          </button>
                        )}
                        {(i.status === "rejected" || i.status === "fulfilled") && (
                          <button
                            type="button"
                            onClick={() => remove.mutate(i.id)}
                            disabled={remove.isPending}
                            className="rounded-[7px] border border-border-default px-3 py-1.5 text-[12.5px] font-bold text-body hover:bg-surface-tint"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
