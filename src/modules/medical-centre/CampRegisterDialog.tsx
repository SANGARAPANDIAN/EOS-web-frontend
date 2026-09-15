"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, EmptyState, Icon, Input, SegmentedTabs } from "@/components/ui";
import {
  useCampRegistrations,
  usePeopleSearch,
  useRemoveCampRegistration,
  useSaveCampRegistrations,
  useUpdateCampRegistration,
  type CampPersonKind,
  type CampRegistration,
  type PersonSearchResult,
} from "@/modules/medical-centre/api/campRegistrations";
import { ApiError } from "@/types/api";

/**
 * Registers people for a camp.
 *
 * Two stacked sections, which is what the work actually looks like: search for
 * a person at the top, and the roster builds up underneath. Everything in the
 * lower list is real — people already saved come from the server, and newly
 * picked ones sit alongside them marked "not saved yet" until Save is pressed,
 * so it is always obvious what is committed and what is not.
 *
 * The search covers students and faculty in one box (case-insensitive on name,
 * roll number, register number, student id and staff code), because whoever is
 * being registered could be either and the operator should not have to choose a
 * register first.
 */

/** A person picked in this session but not yet saved. */
interface PendingPerson {
  kind: CampPersonKind;
  student_id: number | null;
  faculty_id: number | null;
  name: string;
  identifier: string | null;
  department: string | null;
  remarks: string;
}

function personKey(kind: CampPersonKind, studentId: number | null, facultyId: number | null): string {
  return `${kind}:${studentId ?? facultyId ?? 0}`;
}

export function CampRegisterDialog({
  campId,
  campTitle,
  campDate,
  targetCount,
  onClose,
}: {
  campId: number;
  campTitle: string;
  campDate: string;
  targetCount: number;
  onClose: () => void;
}) {
  const saved = useCampRegistrations(campId);
  const save = useSaveCampRegistrations(campId);
  const updateOne = useUpdateCampRegistration(campId);
  const removeOne = useRemoveCampRegistration(campId);

  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<"all" | CampPersonKind>("all");
  const results = usePeopleSearch(term, kind);

  const [pending, setPending] = useState<PendingPerson[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Memoised so the `takenKeys` set below does not rebuild on every render:
  // `saved.data ?? []` is a fresh array each time and would invalidate it.
  const savedRows = useMemo(() => saved.data ?? [], [saved.data]);

  // Everyone already on the roster or already picked, so the search can mark
  // them instead of letting the same person be added twice.
  const takenKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of savedRows) keys.add(personKey(r.kind, r.student_id, r.faculty_id));
    for (const p of pending) keys.add(personKey(p.kind, p.student_id, p.faculty_id));
    return keys;
  }, [savedRows, pending]);

  const totalOnRoster = savedRows.length + pending.length;

  function pick(person: PersonSearchResult) {
    const key = personKey(person.kind, person.student_id, person.faculty_id);
    if (takenKeys.has(key)) return;
    setPending((prev) => [
      ...prev,
      {
        kind: person.kind,
        student_id: person.student_id,
        faculty_id: person.faculty_id,
        name: person.name,
        identifier: person.identifier,
        department: person.department,
        remarks: "",
      },
    ]);
  }

  function dropPending(key: string) {
    setPending((prev) => prev.filter((p) => personKey(p.kind, p.student_id, p.faculty_id) !== key));
  }

  async function handleSave() {
    setError(null);
    setNotice(null);
    if (pending.length === 0) {
      // Nothing new to commit — saved rows were written as they were edited or
      // removed, so closing is the honest action rather than a no-op request.
      onClose();
      return;
    }
    try {
      const res = await save.mutateAsync(
        pending.map((p) => ({
          student_id: p.student_id ?? undefined,
          faculty_id: p.faculty_id ?? undefined,
          remarks: p.remarks.trim() || undefined,
        })),
      );
      setPending([]);
      setNotice(
        res.skipped > 0
          ? `${res.added} registered, ${res.skipped} already on the roster.`
          : `${res.added} registered.`,
      );
      // Give the operator a moment to read the result, then return to the camps
      // page as asked.
      window.setTimeout(onClose, 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the roster.");
    }
  }

  function startEdit(key: string, current: string | null) {
    setEditingKey(key);
    setEditingText(current ?? "");
  }

  async function commitEdit(row: CampRegistration) {
    setError(null);
    try {
      await updateOne.mutateAsync({ registrationId: row.id, remarks: editingText.trim() });
      setEditingKey(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update that entry.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-6">
      <div className="my-4 flex max-h-[92vh] w-full max-w-[1080px] flex-col rounded-modal bg-surface shadow-hover-lift">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-divider px-7 py-5">
          <div className="min-w-0">
            <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">Register for camp</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="font-bold text-body">{campTitle}</span>
              <span className="font-mono text-[12.5px]">{campDate}</span>
              <span>
                Roster <span className="font-bold text-ink">{totalOnRoster}</span>
                {targetCount > 0 && <span> of {targetCount} target</span>}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border-default text-[16px] text-body hover:bg-surface-tint"
          >
            &#10005;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-5">
          {error && (
            <div className="mb-4 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[13px] font-semibold text-primary">
              {notice}
            </div>
          )}

          {/* ── Section 1: find people ── */}
          <section>
            <h3 className="text-[15px] font-extrabold text-ink">1 &nbsp;Find people</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Searches students and faculty together — by name, roll number, register number or staff code. Not
              case-sensitive.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Type a name, roll no or staff code…"
                autoFocus
              />
              <SegmentedTabs
                value={kind}
                onChange={(k) => setKind(k as "all" | CampPersonKind)}
                options={[
                  { key: "all", label: "Everyone" },
                  { key: "student", label: "Students" },
                  { key: "faculty", label: "Faculty" },
                ]}
              />
            </div>

            <div className="mt-3 max-h-[240px] overflow-y-auto rounded-card border border-border-default">
              {term.trim().length < 2 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-subtle">
                  Type at least 2 characters to search.
                </div>
              ) : results.isLoading ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-subtle">Searching…</div>
              ) : (results.data ?? []).length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-subtle">Nobody matched that search.</div>
              ) : (
                (results.data ?? []).map((p) => {
                  const key = personKey(p.kind, p.student_id, p.faculty_id);
                  const already = takenKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={already}
                      onClick={() => pick(p)}
                      className="flex w-full items-center gap-3 border-b border-divider px-4 py-2.5 text-left last:border-b-0 hover:bg-surface-tint disabled:cursor-default disabled:opacity-55 disabled:hover:bg-transparent"
                    >
                      <Badge tone={p.kind === "student" ? "accent" : "neutral"}>
                        {p.kind === "student" ? "Student" : "Faculty"}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink">{p.name}</span>
                      <span className="shrink-0 font-mono text-[12px] text-muted">{p.identifier ?? "—"}</span>
                      <span className="hidden w-[220px] shrink-0 truncate text-[12px] text-subtle sm:block">
                        {p.department ?? "—"}
                      </span>
                      {already ? (
                        <span className="shrink-0 text-[12px] font-bold text-subtle">On roster</span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-primary">
                          <Icon name="add" size={14} />
                          Add
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* ── Section 2: the roster ── */}
          <section className="mt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-extrabold text-ink">2 &nbsp;Registered list</h3>
              <span className="text-[12px] text-subtle">
                {savedRows.length} saved
                {pending.length > 0 && <span className="font-bold text-primary"> · {pending.length} not saved yet</span>}
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-card border border-border-default">
              {/* Column header, so the list reads as a register rather than a pile of rows. */}
              <div className="grid grid-cols-[92px_1.6fr_120px_1.6fr_1.4fr_92px] items-center gap-3 border-b border-divider bg-surface-tint px-4 py-2 text-[11px] font-bold uppercase tracking-[.05em] text-muted">
                <span>Type</span>
                <span>Name</span>
                <span>Roll / Code</span>
                <span>Department</span>
                <span>Remarks</span>
                <span className="text-right">Action</span>
              </div>

              {savedRows.length === 0 && pending.length === 0 ? (
                <EmptyState message="Nobody registered yet. Search above to add people." />
              ) : (
                <>
                  {/* Already saved */}
                  {savedRows.map((row) => {
                    const key = `saved-${row.id}`;
                    const editing = editingKey === key;
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-[92px_1.6fr_120px_1.6fr_1.4fr_92px] items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0"
                      >
                        <Badge tone={row.kind === "student" ? "accent" : "neutral"}>
                          {row.kind === "student" ? "Student" : "Faculty"}
                        </Badge>
                        <span className="min-w-0 truncate text-[13.5px] font-bold text-ink">{row.name}</span>
                        <span className="font-mono text-[12px] text-muted">{row.identifier ?? "—"}</span>
                        <span className="min-w-0 truncate text-[12.5px] text-body">{row.department ?? "—"}</span>
                        {editing ? (
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitEdit(row);
                              if (e.key === "Escape") setEditingKey(null);
                            }}
                            placeholder="Remarks"
                            autoFocus
                          />
                        ) : (
                          <span className="min-w-0 truncate text-[12.5px] text-body">{row.remarks || "—"}</span>
                        )}
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void commitEdit(row)}
                                disabled={updateOne.isPending}
                                className="rounded-[7px] px-2 py-1 text-[12px] font-bold text-primary disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingKey(null)}
                                className="rounded-[7px] px-2 py-1 text-[12px] font-bold text-muted"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                title="Edit remarks"
                                onClick={() => startEdit(key, row.remarks)}
                                className="flex size-7 items-center justify-center rounded-[7px] text-body hover:bg-surface-tint"
                              >
                                <Icon name="edit" size={15} />
                              </button>
                              <button
                                type="button"
                                title="Remove from roster"
                                onClick={() => {
                                  setError(null);
                                  removeOne.mutate(row.id, {
                                    onError: (err) =>
                                      setError(
                                        err instanceof ApiError ? err.message : "Could not remove that entry.",
                                      ),
                                  });
                                }}
                                className="flex size-7 items-center justify-center rounded-[7px] text-danger-fg hover:bg-surface-tint"
                              >
                                <Icon name="delete" size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Picked in this session, not yet committed */}
                  {pending.map((p) => {
                    const key = personKey(p.kind, p.student_id, p.faculty_id);
                    return (
                      <div
                        key={`pending-${key}`}
                        className="grid grid-cols-[92px_1.6fr_120px_1.6fr_1.4fr_92px] items-center gap-3 border-b border-divider bg-accent-50/40 px-4 py-2.5 last:border-b-0"
                      >
                        <Badge tone={p.kind === "student" ? "accent" : "neutral"}>
                          {p.kind === "student" ? "Student" : "Faculty"}
                        </Badge>
                        <span className="min-w-0 truncate text-[13.5px] font-bold text-ink">
                          {p.name}
                          <span className="ml-2 text-[11px] font-bold text-primary">not saved</span>
                        </span>
                        <span className="font-mono text-[12px] text-muted">{p.identifier ?? "—"}</span>
                        <span className="min-w-0 truncate text-[12.5px] text-body">{p.department ?? "—"}</span>
                        <Input
                          value={p.remarks}
                          onChange={(e) =>
                            setPending((prev) =>
                              prev.map((x) =>
                                personKey(x.kind, x.student_id, x.faculty_id) === key
                                  ? { ...x, remarks: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          placeholder="Remarks"
                        />
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            title="Remove from selection"
                            onClick={() => dropPending(key)}
                            className="flex size-7 items-center justify-center rounded-[7px] text-danger-fg hover:bg-surface-tint"
                          >
                            <Icon name="delete" size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {savedRows.length > 0 && (
              <p className="mt-2 text-[11.5px] text-subtle">
                Edits and removals on saved rows apply immediately. Only the highlighted rows are waiting for Save.
              </p>
            )}
          </section>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-7 py-4">
          <span className="text-[12.5px] text-muted">
            {pending.length > 0
              ? `${pending.length} to register on save`
              : "Nothing waiting to be saved"}
          </span>
          <div className="flex gap-2.5">
            <Button variant="secondary" className="w-auto px-5" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primarySmall"
              className="w-auto px-7"
              onClick={handleSave}
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : "Save & return"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
