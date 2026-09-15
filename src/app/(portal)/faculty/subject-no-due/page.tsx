"use client";

import { useMemo, useState } from "react";
import { Select, Input, Badge, Button, EmptyState, Skeleton, Card } from "@/components/ui";
import {
  useSubjectNoDueMappings,
  useSubjectNoDueStudents,
  useUpdateSubjectNoDue,
  type SubjectNoDueField,
  type SubjectNoDueRow,
} from "@/modules/advisor/api/subjectNoDue";

const FIELDS: { key: SubjectNoDueField; label: string }[] = [
  { key: "internal1_cleared", label: "Internal 1" },
  { key: "internal2_cleared", label: "Internal 2" },
  { key: "project_cleared", label: "Project" },
  { key: "assignment_cleared", label: "Assignment" },
  { key: "quiz_cleared", label: "Quiz" },
];

function ClearedDot({ cleared, onClick, loading }: { cleared: boolean; onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        "flex size-7 items-center justify-center rounded-full text-[13px] font-bold cursor-pointer disabled:cursor-wait disabled:opacity-60 " +
        (cleared ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fef7ec] text-[#92400e]")
      }
    >
      {cleared ? "✓" : "✕"}
    </button>
  );
}

// Manual, faculty-ticked sign-off — Internal 1 / Internal 2 / Project /
// Assignment / Quiz — one screen per subject the caller handles (as
// primary or substitute faculty; a class advisor who also teaches a
// subject sees it here too, since advisor isn't a separate role). Once
// every subject a student takes is fully ticked here, HoD's No-Due page
// shows that student's "Academics" category as cleared automatically —
// this page is the only place that's actually set.
export default function SubjectNoDuePage() {
  const mappings = useSubjectNoDueMappings();
  const [mappingId, setMappingId] = useState<number | null>(null);
  const effectiveMappingId = mappingId ?? mappings.data?.[0]?.mapping_id ?? null;
  const selectedMapping = useMemo(
    () => mappings.data?.find((m) => m.mapping_id === effectiveMappingId) ?? null,
    [mappings.data, effectiveMappingId],
  );

  const [search, setSearch] = useState("");
  const students = useSubjectNoDueStudents(effectiveMappingId);
  const update = useUpdateSubjectNoDue();

  const filteredRows = useMemo(() => {
    const rows = students.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.register_no.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [students.data, search]);

  function toggle(row: SubjectNoDueRow, field: SubjectNoDueField) {
    if (!effectiveMappingId) return;
    update.mutate({ mappingId: effectiveMappingId, studentId: row.student_id, patch: { [field]: !row[field] } });
  }

  function markAllCleared(row: SubjectNoDueRow) {
    if (!effectiveMappingId) return;
    update.mutate({
      mappingId: effectiveMappingId,
      studentId: row.student_id,
      patch: {
        internal1_cleared: true,
        internal2_cleared: true,
        project_cleared: true,
        assignment_cleared: true,
        quiz_cleared: true,
      },
    });
  }

  const gridCols = "1.8fr 1fr 1fr 1fr 1fr 1fr 110px";
  const noMappings = !mappings.isLoading && (mappings.data ?? []).length === 0;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {(mappings.isError || students.isError) && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load no-due data — please try again.
        </div>
      )}
      {update.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          {update.error instanceof Error ? update.error.message : "That change didn't save — please try again."}
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Academic No Due</h1>
        <p className="mt-1 text-[13px] text-muted">
          Internal 1, Internal 2, Project, Assignment and Quiz clearance for every student in your subject
        </p>
      </div>

      {noMappings ? (
        <Card>
          <EmptyState message="You aren't assigned to handle any subject this academic year." />
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Select
              value={effectiveMappingId ?? ""}
              onChange={(e) => setMappingId(Number(e.target.value))}
              className="max-w-[360px]"
            >
              {(mappings.data ?? []).map((m) => (
                <option key={m.mapping_id} value={m.mapping_id}>
                  {m.subject.code} · {m.subject.name} — {m.class.department_code} {m.class.section} · {m.class.batch_label}
                </option>
              ))}
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Register number or name"
              className="max-w-[320px]"
            />
            {selectedMapping && (
              <Badge tone="neutral" className="ml-auto">
                {filteredRows.length} students
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto rounded-card border border-border-default bg-surface">
            <div
              className="grid gap-2 px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle uppercase bg-surface-muted"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div>Student</div>
              {FIELDS.map((f) => (
                <div key={f.key} className="text-center">
                  {f.label}
                </div>
              ))}
              <div className="text-right">Action</div>
            </div>

            {students.isLoading ? (
              <div className="flex flex-col gap-px">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="border-t border-divider px-5 py-4 first:border-t-0">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : students.isError ? null : filteredRows.length === 0 ? (
              <EmptyState message="No students in this class." className="px-5" />
            ) : (
              filteredRows.map((row) => {
                const rowPending =
                  update.isPending && update.variables?.studentId === row.student_id && update.variables?.mappingId === effectiveMappingId;
                const allCleared = FIELDS.every((f) => row[f.key]);
                return (
                  <div
                    key={row.student_id}
                    className="grid items-center gap-2 border-t border-divider px-5 py-3.5 text-[13px] text-ink hod-hover-row"
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold text-ink">{row.name}</div>
                      <div className="truncate text-[11.5px] text-subtle">{row.register_no}</div>
                    </div>
                    {FIELDS.map((f) => (
                      <div key={f.key} className="flex justify-center">
                        <ClearedDot cleared={row[f.key]} loading={rowPending} onClick={() => toggle(row, f.key)} />
                      </div>
                    ))}
                    <div className="flex justify-end">
                      {allCleared ? (
                        <Badge tone="accent">All cleared</Badge>
                      ) : (
                        <Button variant="primarySmall" onClick={() => markAllCleared(row)} loading={rowPending} disabled={rowPending}>
                          Mark all
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
