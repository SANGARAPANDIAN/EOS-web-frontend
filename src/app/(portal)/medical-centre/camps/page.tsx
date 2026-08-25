"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Input, Modal, Select, ProgressBar, EmptyState, type BadgeTone } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useCamps,
  useRegisterBatch,
  useCreateCamp,
  useUpdateCamp,
  useDeleteCamp,
  campStateValueOf,
  type CampState,
  type UpcomingCamp,
  type PastCamp,
} from "@/modules/medical-centre/api/camps";
import { ApiError } from "@/types/api";

const STATE_TONE: Record<string, BadgeTone> = { Running: "accentDark", Scheduled: "accent", Planning: "neutral" };

export default function CampsPage() {
  const camps = useCamps();
  const registerBatch = useRegisterBatch();
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const createCamp = useCreateCamp();
  const updateCamp = useUpdateCamp();
  const deleteCamp = useDeleteCamp();

  // Editing works from either list, so the row is narrowed to the id plus the
  // fields the form actually needs rather than to one of the two row types.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingTitle, setDeletingTitle] = useState("");
  const [form, setForm] = useState<{
    title: string;
    camp_date: string;
    detail: string;
    state: CampState;
    target_count: string;
    registered_count: string;
    outcome_summary: string;
  }>({ title: "", camp_date: "", detail: "", state: "planning", target_count: "", registered_count: "", outcome_summary: "" });
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm({ title: "", camp_date: "", detail: "", state: "planning", target_count: "", registered_count: "", outcome_summary: "" });
    setError(null);
    setOpen(true);
  }

  function openEditUpcoming(camp: UpcomingCamp) {
    setEditingId(camp.id);
    setForm({
      title: camp.title,
      camp_date: camp.date,
      detail: camp.detail === "\u2014" ? "" : camp.detail,
      state: campStateValueOf(camp.state),
      target_count: String(camp.target ?? ""),
      registered_count: String(camp.done ?? ""),
      outcome_summary: "",
    });
    setError(null);
    setOpen(true);
  }

  function openEditPast(camp: PastCamp) {
    setEditingId(camp.id);
    setForm({
      title: camp.title,
      camp_date: camp.date,
      detail: camp.detail === "\u2014" ? "" : camp.detail,
      // A past camp has no live state to show, so it defaults to scheduled for
      // the form; changing the date is what moves it between the two lists.
      state: "scheduled",
      target_count: String(camp.target ?? ""),
      registered_count: String(camp.done ?? ""),
      outcome_summary: camp.outcome ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: form.title,
      camp_date: form.camp_date,
      detail: form.detail || undefined,
      state: form.state,
      target_count: form.target_count === "" ? undefined : Number(form.target_count),
      registered_count: form.registered_count === "" ? undefined : Number(form.registered_count),
      outcome_summary: form.outcome_summary || undefined,
    };
    try {
      if (editingId != null) await updateCamp.mutateAsync({ id: editingId, ...payload });
      else await createCamp.mutateAsync(payload);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this camp.");
    }
  }

  async function confirmDelete() {
    if (deletingId == null) return;
    setRowError(null);
    try {
      await deleteCamp.mutateAsync(deletingId);
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete this camp.");
    } finally {
      setDeletingId(null);
    }
  }

  const saving = editingId != null ? updateCamp.isPending : createCamp.isPending;

  const upcoming = camps.data?.upcoming ?? [];
  const past = camps.data?.past ?? [];

  const filteredCamps = useMemo(() => upcoming.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())), [upcoming, query]);
  const filteredPast = useMemo(() => past.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())), [past, query]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Camps & annual checkups</h1>
          <p className="mt-1 text-[13px] text-muted">First-year checkups, hostel screening and blood donation drives.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={openAdd}>
          Add camp
        </Button>
      </div>

      {rowError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {rowError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input className="min-w-[240px] max-w-[360px]" placeholder="Search camps" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-1 rounded-[10px] bg-surface-tint p-1">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className={`rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold ${!showHistory ? "bg-surface text-primary shadow-tab" : "text-muted"}`}
          >
            Current & upcoming
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className={`rounded-[8px] px-3.5 py-1.5 text-[13px] font-bold ${showHistory ? "bg-surface text-primary shadow-tab" : "text-muted"}`}
          >
            History
          </button>
        </div>
      </div>

      {camps.isLoading ? (
        <EmptyState message="Loading…" />
      ) : !showHistory ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredCamps.length === 0 && <EmptyState message="No camps recorded yet." />}
          {filteredCamps.map((camp) => (
            <div key={camp.id} className="flex flex-col gap-3 rounded-card border border-border-default bg-surface p-[18px_20px] transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[16px] font-extrabold text-ink">{camp.title}</div>
                  <div className="text-[12.5px] text-muted">{camp.detail}</div>
                </div>
                <Badge tone={STATE_TONE[camp.state] ?? "neutral"}>{camp.state}</Badge>
              </div>
              <div className="font-mono text-[12.5px] text-subtle">{camp.date}</div>
              <div>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted">Registered</span>
                  <span className="font-mono text-ink">
                    {camp.done} / {camp.target}
                  </span>
                </div>
                <ProgressBar percent={camp.target > 0 ? Math.round((camp.done / camp.target) * 100) : 0} height={6} />
              </div>
              <Button variant="primarySmall" onClick={() => registerBatch.mutate(camp.id)} disabled={camp.done >= camp.target || registerBatch.isPending}>
                Register a batch
              </Button>
              <div className="flex justify-end gap-3 border-t border-divider pt-2.5">
                <button type="button" onClick={() => openEditUpcoming(camp)} className="text-[12.5px] font-bold text-body hover:text-primary">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { setDeletingId(camp.id); setDeletingTitle(camp.title); }}
                  className="text-[12.5px] font-bold text-muted hover:text-danger-fg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredPast.length === 0 && <EmptyState message="No past camps recorded yet." />}
          {filteredPast.map((camp) => (
            <div key={camp.id} className="flex flex-col gap-2.5 rounded-card border border-border-default bg-surface p-[18px_20px]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[16px] font-extrabold text-ink">{camp.title}</div>
                  <div className="text-[12.5px] text-muted">{camp.detail}</div>
                </div>
                <span className="font-mono text-[12.5px] text-subtle">{camp.date}</span>
              </div>
              <div className="text-[13.5px] font-bold text-primary">{camp.outcome}</div>
              <div className="flex justify-end gap-3 border-t border-divider pt-2.5">
                <button type="button" onClick={() => openEditPast(camp)} className="text-[12.5px] font-bold text-body hover:text-primary">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { setDeletingId(camp.id); setDeletingTitle(camp.title); }}
                  className="text-[12.5px] font-bold text-muted hover:text-danger-fg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId != null ? "Edit camp" : "Add camp"}
        subtitle={
          editingId != null
            ? "Updates this camp. Whether it appears under upcoming or history follows its date."
            : "Schedules a camp or annual check-up drive"
        }
      >
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Title</label>
            <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Blood donation drive" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Date</label>
              <Input required type="date" value={form.camp_date} onChange={(e) => setForm((f) => ({ ...f, camp_date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Stage</label>
              <Select value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value as CampState }))}>
                <option value="planning">Planning</option>
                <option value="scheduled">Scheduled</option>
                <option value="running">Running</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Detail</label>
            <Input value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} placeholder="e.g. With Rotary Club" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Target</label>
              <Input type="number" min="0" value={form.target_count} onChange={(e) => setForm((f) => ({ ...f, target_count: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Registered</label>
              <Input type="number" min="0" value={form.registered_count} onChange={(e) => setForm((f) => ({ ...f, registered_count: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Outcome</label>
            <Input
              value={form.outcome_summary}
              onChange={(e) => setForm((f) => ({ ...f, outcome_summary: e.target.value }))}
              placeholder="Recorded once the camp is over, e.g. 180 units collected"
            />
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!form.title || !form.camp_date || saving}>
              {saving ? "Saving…" : editingId != null ? "Save changes" : "Add camp"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingId != null}
        title="Delete this camp?"
        description={deletingTitle ? `${deletingTitle} will be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
