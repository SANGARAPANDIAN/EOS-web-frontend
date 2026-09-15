"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, Button, Input, DataTable, ProgressBar, EmptyState, type DataTableColumn } from "@/components/ui";
import {
  useHigherEducationScholarships,
  useCreateScheme,
  type SchemeRow,
  useUpdateScheme,
  useDeleteScheme,
} from "@/modules/higher-education/api/scholarships";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/types/api";

/** Matches the Transport dashboard/routes hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

function formatRupees(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function AddSchemeModal({ onClose }: { onClose: () => void }) {
  const createScheme = useCreateScheme();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [applied, setApplied] = useState("");
  const [awarded, setAwarded] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Scheme name is required.");
      return;
    }
    setError(null);
    try {
      await createScheme.mutateAsync({
        name: name.trim(),
        scheme_type: type.trim() || undefined,
        applied_count: applied ? Number(applied) : undefined,
        awarded_count: awarded ? Number(awarded) : undefined,
        total_value: value ? Number(value) : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this scheme.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-14">
      <div className="w-full max-w-[600px] rounded-modal bg-surface">
        <div className="flex items-start justify-between gap-5 border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add scholarship scheme</div>
            <div className="mt-1 text-[13px] text-muted">Fields left blank stay unrecorded and can be filled later.</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Scheme</label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Type</label>
            <Input className="mt-1.5" placeholder="e.g. University scholarship / waiver" value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Applied</label>
            <Input className="mt-1.5" type="number" value={applied} onChange={(e) => setApplied(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Awarded</label>
            <Input className="mt-1.5" type="number" value={awarded} onChange={(e) => setAwarded(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Value secured (₹)</label>
            <Input className="mt-1.5" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createScheme.isPending}>
            Save scheme
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HigherEducationScholarshipsPage() {
  const scholarships = useHigherEducationScholarships();
  const data = scholarships.data;
  const isLoading = scholarships.isLoading;
  const [showAdd, setShowAdd] = useState(false);

  const updateScheme = useUpdateScheme();
  const deleteScheme = useDeleteScheme();
  const [editRow, setEditRow] = useState<SchemeRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", type: "", applied: "", awarded: "", value: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SchemeRow | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openEdit(row: SchemeRow) {
    setEditRow(row);
    setEditForm({
      name: row.name,
      type: row.type ?? "",
      applied: String(row.applied ?? ""),
      awarded: String(row.awarded ?? ""),
      value: String(row.value ?? ""),
    });
    setEditError(null);
  }

  async function saveEdit() {
    if (!editRow) return;
    setEditError(null);
    try {
      await updateScheme.mutateAsync({
        id: editRow.id,
        name: editForm.name,
        scheme_type: editForm.type || undefined,
        applied_count: editForm.applied === "" ? undefined : Number(editForm.applied),
        awarded_count: editForm.awarded === "" ? undefined : Number(editForm.awarded),
        total_value: editForm.value === "" ? undefined : Number(editForm.value),
      });
      setEditRow(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not save this scheme.");
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setRowError(null);
    try {
      await deleteScheme.mutateAsync(removing.id);
    } catch (err) {
      // Refused once awards exist under the scheme.
      setRowError(err instanceof ApiError ? err.message : "Could not delete this scheme.");
    } finally {
      setRemoving(null);
    }
  }

  const maxMix = data && data.fundingMix.length > 0 ? Math.max(...data.fundingMix.map((m) => m.awarded)) : 1;

  const columns: DataTableColumn<SchemeRow>[] = [
    { key: "name", header: "Scheme", width: "1.4fr", render: (row) => <span className="font-bold text-ink">{row.name}</span> },
    { key: "type", header: "Type", width: "1.2fr", render: (row) => <span className="text-body">{row.type ?? "—"}</span> },
    { key: "applied", header: "Applied", align: "right", render: (row) => <span className="font-mono text-body">{row.applied}</span> },
    { key: "awarded", header: "Awarded", align: "right", render: (row) => <span className="font-mono text-ink">{row.awarded}</span> },
    { key: "value", header: "Value", align: "right", render: (row) => <span className="font-bold text-primary">{row.value > 0 ? formatRupees(row.value) : "—"}</span> },
    {
      key: "actions",
      header: "",
      width: "1.1fr",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => openEdit(row)} className="text-[12.5px] font-bold text-primary hover:underline">
            Edit
          </button>
          <button type="button" onClick={() => setRemoving(row)} className="text-[12.5px] font-bold text-muted hover:text-danger-fg">
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Scholarships & funding</h1>
          <p className="mt-1 text-[13px] text-muted">
            {isLoading ? "—" : formatRupees(data?.summary.totalValue ?? 0)} secured across {isLoading ? "—" : data?.summary.fundedCount ?? 0} students · scholarships,
            assistantships and education loans
          </p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
          Add scheme
        </Button>
      </div>

      {showAdd && <AddSchemeModal onClose={() => setShowAdd(false)} />}

      <div className="grid grid-cols-4 gap-4">
        <div className={`rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="text-[14.5px] font-semibold text-body">Students funded</div>
          <div className="mt-3 text-[36px] font-extrabold tracking-[-.02em] leading-none text-ink">{isLoading ? "—" : data?.summary.fundedCount ?? 0}</div>
          <div className="mt-2.5 text-[13px] text-subtle">{data?.summary.fundedPercent ?? 0}% of aspirants</div>
        </div>
        <div className={`rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="text-[14.5px] font-semibold text-body">Total value</div>
          <div className="mt-3 text-[36px] font-extrabold tracking-[-.02em] leading-none text-ink">{isLoading ? "—" : formatRupees(data?.summary.totalValue ?? 0)}</div>
          <div className="mt-2.5 text-[13px] text-subtle">
            {data?.summary.meanValuePerFunded != null ? `mean ${formatRupees(data.summary.meanValuePerFunded)} per student` : "value not recorded yet"}
          </div>
        </div>
        <div className={`rounded-card border border-border-default bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="text-[14.5px] font-semibold text-body">Full waivers</div>
          <div className="mt-3 text-[36px] font-extrabold tracking-[-.02em] leading-none text-ink">—</div>
          <div className="mt-2.5 text-[13px] text-subtle">not tracked yet</div>
        </div>
        <div className={`rounded-card border border-border-accent bg-surface p-[20px_22px] ${HOVERABLE}`}>
          <div className="text-[14.5px] font-semibold text-body">Loans sanctioned</div>
          <div className="mt-3 text-[36px] font-extrabold tracking-[-.02em] leading-none text-primary">
            {isLoading ? "—" : data?.loans.sanctionedValue ? formatRupees(data.loans.sanctionedValue) : "—"}
          </div>
          <div className="mt-2.5 text-[13px] text-muted">
            {data ? `${data.loans.sanctionedFiles} files · ${data.loans.underProcessFiles} pending` : ""}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4 items-start">
        <Card className={`overflow-hidden p-0 ${HOVERABLE}`}>
          <div className="p-[18px_20px] pb-3">
            <h2 className="text-[17px] font-extrabold text-ink">Scheme-wise position</h2>
          </div>
          <DataTable columns={columns} data={data?.schemes ?? []} rowKey={(row) => row.id} emptyMessage={isLoading ? "Loading…" : "No schemes recorded yet."} hoverableRows />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className={HOVERABLE}>
            <h2 className="mb-3.5 text-[17px] font-extrabold text-ink">Funding mix</h2>
            {!data || data.fundingMix.length === 0 ? (
              <EmptyState message="No schemes recorded yet." />
            ) : (
              <div className="flex flex-col gap-3">
                {data.fundingMix.map((m) => (
                  <div key={m.type}>
                    <div className="mb-1.5 flex items-center justify-between text-[13.5px]">
                      <span className="font-semibold text-body">{m.type}</span>
                      <span className="font-mono text-ink">{m.awarded}</span>
                    </div>
                    <ProgressBar percent={Math.round((m.awarded / maxMix) * 100)} height={6} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className={HOVERABLE}>
            <h2 className="mb-3.5 text-[17px] font-extrabold text-ink">Education loans</h2>
            {!data || (data.loans.sanctionedFiles === 0 && data.loans.underProcessFiles === 0 && data.loans.rejectedCount === 0) ? (
              <EmptyState message="No loans recorded yet." />
            ) : (
              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Sanctioned</span>
                  <span className="font-bold text-ink">
                    {data.loans.sanctionedFiles} files · {formatRupees(data.loans.sanctionedValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Under process</span>
                  <span className="font-bold text-primary">
                    {data.loans.underProcessFiles} files · {formatRupees(data.loans.underProcessValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Rejected · reapplied</span>
                  <span className="font-bold text-ink">
                    {data.loans.rejectedCount} · {data.loans.reappliedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Partner banks</span>
                  <span className="text-right font-bold text-ink">{data.loans.partnerBanks.length > 0 ? data.loans.partnerBanks.join(", ") : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Collateral-free share</span>
                  <span className="font-bold text-ink">{data.loans.collateralFreePercent != null ? `${data.loans.collateralFreePercent}%` : "—"}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      {rowError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {rowError}
        </div>
      )}

      {editRow &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
            <div className="w-full max-w-[480px] rounded-modal bg-surface">
              <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
                <div className="text-[19px] font-extrabold text-ink">Edit scheme</div>
                <button type="button" onClick={() => setEditRow(null)} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-4 px-[26px] py-[22px]">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Scheme name</label>
                  <Input className="mt-1.5" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Type</label>
                  <Input className="mt-1.5" value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))} placeholder="e.g. merit, need_based" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Applied</label>
                    <Input className="mt-1.5" type="number" min="0" value={editForm.applied} onChange={(e) => setEditForm((f) => ({ ...f, applied: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Awarded</label>
                    <Input className="mt-1.5" type="number" min="0" value={editForm.awarded} onChange={(e) => setEditForm((f) => ({ ...f, awarded: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Total value</label>
                    <Input className="mt-1.5" type="number" min="0" value={editForm.value} onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))} />
                  </div>
                </div>
                {editError && <div className="text-[13px] font-semibold text-danger-fg">{editError}</div>}
              </div>
              <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
                <Button variant="secondary" className="w-auto" onClick={() => setEditRow(null)}>
                  Cancel
                </Button>
                <Button variant="primarySmall" onClick={() => void saveEdit()} disabled={updateScheme.isPending}>
                  {updateScheme.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={removing != null}
        title="Delete this scheme?"
        description={removing ? `${removing.name} will be removed from the register.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
