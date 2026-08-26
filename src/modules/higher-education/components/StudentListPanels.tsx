"use client";

import { useState } from "react";
import { Badge, Button, DataTable, EmptyState, Input, Select, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useHdcStudentSearch,
  useApplicationStudents,
  useAddApplicationStudent,
  useUpdateApplicationStudent,
  useRemoveApplicationStudent,
  useTestStudents,
  useAddTestStudent,
  useUpdateTestStudent,
  useRemoveTestStudent,
  type HdcStudentMatch,
  type ApplicationStudentStatus,
  type ApplicationStudentRow,
  type TestStudentRow,
} from "@/modules/higher-education/api/studentLists";
import { ApiError } from "@/types/api";

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Shared "find a student and add them" control.
 *
 * Searching rather than typing an id: the roll is matched case-insensitively
 * along with the name and register number, so the coordinator uses whatever
 * they have to hand. Name/roll/department are never entered here — they come
 * from the student record, so the list cannot drift from the admission data.
 */
function StudentPicker({
  onAdd,
  pending,
  label,
}: {
  onAdd: (studentId: number) => Promise<void>;
  pending: boolean;
  label: string;
}) {
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<HdcStudentMatch | null>(null);
  const matches = useHdcStudentSearch(picked ? "" : term);

  async function add() {
    if (!picked) return;
    await onAdd(picked.student_id);
    setPicked(null);
    setTerm("");
  }

  return (
    <div className="rounded-[11px] border border-border-default bg-surface-tint p-4">
      <div className="text-[12.5px] font-bold text-primary">{label}</div>
      {picked ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 rounded-[10px] border border-border-default bg-surface px-3.5 py-2.5">
            <div className="truncate text-[14px] font-extrabold text-ink">{picked.name}</div>
            <div className="mt-0.5 truncate text-[11.5px] text-muted">
              {[picked.roll_no, picked.department_code, picked.batch_name].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Button variant="primarySmall" className="w-auto" onClick={() => void add()} disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
          <button type="button" onClick={() => { setPicked(null); setTerm(""); }} className="text-[12.5px] font-bold text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      ) : (
        <>
          <Input
            className="mt-2.5"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by name, roll number or register number"
          />
          {term.trim().length > 0 && term.trim().length < 2 && (
            <div className="mt-2 text-[12px] text-subtle">Keep typing to search.</div>
          )}
          {term.trim().length >= 2 && (
            <div className="mt-2 max-h-[240px] overflow-y-auto rounded-[10px] border border-border-default bg-surface">
              {matches.isLoading ? (
                <div className="px-3.5 py-3 text-[12.5px] text-subtle">Searching…</div>
              ) : (matches.data ?? []).length === 0 ? (
                <div className="px-3.5 py-3 text-[12.5px] text-subtle">No student matched that search.</div>
              ) : (
                (matches.data ?? []).map((m) => (
                  <button
                    key={m.student_id}
                    type="button"
                    onClick={() => setPicked(m)}
                    className="flex w-full items-center gap-3 border-b border-divider px-3.5 py-2.5 text-left last:border-b-0 hover:bg-surface-tint"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ink">{m.name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted">
                        {[m.roll_no, m.department_code, m.batch_name].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[11px] border border-border-default px-4 py-2.5">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="mt-0.5 text-[19px] font-extrabold text-ink">{value}</div>
    </div>
  );
}

const APPLICATION_TONE: Record<ApplicationStudentStatus, BadgeTone> = {
  applied: "accent",
  selected: "accentDark",
  rejected: "danger",
  withdrawn: "neutral",
};

/** Students on one application window, with their Applied / Selected state. */
export function ApplicationStudentsPanel({ windowId, title }: { windowId: number; title: string }) {
  const list = useApplicationStudents(windowId);
  const addStudent = useAddApplicationStudent(windowId);
  const updateStudent = useUpdateApplicationStudent(windowId);
  const removeStudent = useRemoveApplicationStudent(windowId);

  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ApplicationStudentRow | null>(null);
  const data = list.data;

  async function add(studentId: number) {
    setError(null);
    try {
      await addStudent.mutateAsync({ student_id: studentId });
    } catch (err) {
      setError(message(err, "Could not add this student."));
    }
  }

  async function setStatus(row: ApplicationStudentRow, status: ApplicationStudentStatus) {
    setError(null);
    try {
      await updateStudent.mutateAsync({ id: row.id, status });
    } catch (err) {
      setError(message(err, "Could not update this student."));
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setError(null);
    try {
      await removeStudent.mutateAsync(removing.id);
    } catch (err) {
      setError(message(err, "Could not remove this student."));
    } finally {
      setRemoving(null);
    }
  }

  const columns: DataTableColumn<ApplicationStudentRow>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">{row.name}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">
            {[row.roll_no, row.register_no].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    { key: "dept", header: "Department", width: "1.2fr", render: (row) => <span className="text-body">{row.department_code ?? row.department_name ?? "—"}</span> },
    { key: "batch", header: "Batch", width: "0.9fr", render: (row) => <span className="text-body">{row.batch_name ?? "—"}</span> },
    { key: "applied", header: "Applied on", width: "1fr", render: (row) => <span className="font-mono text-[12px] text-subtle">{row.applied_on ?? "—"}</span> },
    { key: "decided", header: "Decided on", width: "1fr", render: (row) => <span className="font-mono text-[12px] text-subtle">{row.decided_on ?? "—"}</span> },
    { key: "status", header: "Status", width: "0.9fr", render: (row) => <Badge tone={APPLICATION_TONE[row.status]}>{row.status}</Badge> },
    {
      key: "action",
      header: "",
      width: "1.6fr",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {/* Selecting stamps the decision date server-side. */}
          <Select
            className="w-auto"
            value={row.status}
            onChange={(e) => void setStatus(row, e.target.value as ApplicationStudentStatus)}
            disabled={updateStudent.isPending}
          >
            <option value="applied">Applied</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </Select>
          <button type="button" onClick={() => setRemoving(row)} className="text-[12.5px] font-bold text-muted hover:text-danger-fg">
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border-default bg-surface p-[20px_22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-extrabold text-ink">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">Students on this application, and whether they were selected.</p>
        </div>
        <div className="flex gap-3">
          <Stat label="On list" value={data?.total ?? 0} />
          <Stat label="Applied" value={data?.applied ?? 0} />
          <Stat label="Selected" value={data?.selected ?? 0} />
        </div>
      </div>

      <StudentPicker onAdd={add} pending={addStudent.isPending} label="Add a student to this application" />

      {error && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
      )}

      {list.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={data?.students ?? []} rowKey={(row) => row.id} emptyMessage="No students added to this application yet." hoverableRows />
      )}

      <ConfirmDialog
        open={removing != null}
        title="Remove this student?"
        description={removing ? `${removing.name} will be taken off this application.` : undefined}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

/** Students registered for one test, with Enrolled / Attempted / Cleared. */
export function TestStudentsPanel({ testName }: { testName: string }) {
  const list = useTestStudents(testName);
  const addStudent = useAddTestStudent(testName);
  const updateStudent = useUpdateTestStudent(testName);
  const removeStudent = useRemoveTestStudent(testName);

  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<TestStudentRow | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<number, string>>({});
  const data = list.data;

  const today = new Date().toISOString().slice(0, 10);

  async function add(studentId: number) {
    setError(null);
    try {
      // Enrolment is dated today when added from here; a back-dated entry is
      // set afterwards on the row itself.
      await addStudent.mutateAsync({ student_id: studentId, enrolled_on: today });
    } catch (err) {
      setError(message(err, "Could not add this student."));
    }
  }

  async function mark(row: TestStudentRow, field: "attempted_on" | "cleared_on") {
    setError(null);
    try {
      await updateStudent.mutateAsync({ id: row.id, [field]: today });
    } catch (err) {
      // The server refuses a cleared date without an attempt, and any
      // out-of-order pair — its wording explains which.
      setError(message(err, "Could not update this student."));
    }
  }

  async function saveScore(row: TestStudentRow) {
    const score = (scoreDraft[row.id] ?? "").trim();
    if (!score) return;
    setError(null);
    try {
      await updateStudent.mutateAsync({ id: row.id, score });
      setScoreDraft((d) => ({ ...d, [row.id]: "" }));
    } catch (err) {
      setError(message(err, "Could not save this score."));
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setError(null);
    try {
      await removeStudent.mutateAsync(removing.id);
    } catch (err) {
      setError(message(err, "Could not remove this student."));
    } finally {
      setRemoving(null);
    }
  }

  const columns: DataTableColumn<TestStudentRow>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">{row.name}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">
            {[row.roll_no, row.department_code].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      width: "1.5fr",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">Enrolled</Badge>
          {row.attempted && <Badge tone="accentDark">Attempted</Badge>}
          {row.cleared && <Badge tone="accent">Cleared</Badge>}
        </div>
      ),
    },
    {
      key: "dates",
      header: "Enrolled / Attempted / Cleared",
      width: "1.7fr",
      render: (row) => (
        <span className="font-mono text-[11.5px] text-subtle">
          {(row.enrolled_on ?? "—") + " / " + (row.attempted_on ?? "—") + " / " + (row.cleared_on ?? "—")}
        </span>
      ),
    },
    {
      key: "score",
      header: "Score",
      width: "1.3fr",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.score ? <span className="font-mono text-[12.5px] font-bold text-ink">{row.score}</span> : null}
          <Input
            className="w-[86px]"
            value={scoreDraft[row.id] ?? ""}
            onChange={(e) => setScoreDraft((d) => ({ ...d, [row.id]: e.target.value }))}
            placeholder={row.score ? "edit" : "score"}
          />
          <button
            type="button"
            onClick={() => void saveScore(row)}
            disabled={!(scoreDraft[row.id] ?? "").trim() || updateStudent.isPending}
            className="text-[12px] font-bold text-primary disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ),
    },
    {
      key: "action",
      header: "",
      width: "1.6fr",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2.5">
          {!row.attempted && (
            <button type="button" onClick={() => void mark(row, "attempted_on")} disabled={updateStudent.isPending} className="text-[12.5px] font-bold text-primary hover:underline">
              Mark attempted
            </button>
          )}
          {row.attempted && !row.cleared && (
            <button type="button" onClick={() => void mark(row, "cleared_on")} disabled={updateStudent.isPending} className="text-[12.5px] font-bold text-primary hover:underline">
              Mark cleared
            </button>
          )}
          <button type="button" onClick={() => setRemoving(row)} className="text-[12.5px] font-bold text-muted hover:text-danger-fg">
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border-default bg-surface p-[20px_22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-extrabold text-ink">{testName} register</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">Who is registered, who sat it, and who cleared it.</p>
        </div>
        <div className="flex gap-3">
          <Stat label="Enrolled" value={data?.enrolled ?? 0} />
          <Stat label="Attempted" value={data?.attempted ?? 0} />
          <Stat label="Cleared" value={data?.cleared ?? 0} />
        </div>
      </div>

      <StudentPicker onAdd={add} pending={addStudent.isPending} label={`Add a student to ${testName}`} />

      {error && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
      )}

      {list.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={data?.students ?? []} rowKey={(row) => row.id} emptyMessage={`No students registered for ${testName} yet.`} hoverableRows />
      )}

      <ConfirmDialog
        open={removing != null}
        title="Remove this student?"
        description={removing ? `${removing.name} will be taken off the ${testName} register.` : undefined}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
