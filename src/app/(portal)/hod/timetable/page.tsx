"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Select, SkeletonBlock } from "@/components/ui";
import {
  useHodTimetable,
  useSetTimetableSlot,
  useClearTimetableSlot,
  type HodTimetableCell,
  type HodTimetableSubject,
} from "@/modules/hod/api/timetable";
import { cn } from "@/lib/utils/cn";

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function SubjectChip({
  subject,
  active,
  onSelect,
}: {
  subject: HodTimetableSubject;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(subject.subject_id));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onSelect}
      className={cn(
        "hod-hover-card cursor-grab whitespace-nowrap rounded-pill border px-3.5 py-2 text-[13px] font-bold transition-colors active:cursor-grabbing",
        active ? "border-primary bg-accent-50 text-primary" : "border-border-default bg-surface text-ink",
      )}
    >
      {subject.code} · {subject.name}
    </button>
  );
}

function errorMessageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Couldn't assign this slot.";
}

export default function HodTimetablePage() {
  const [classId, setClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const overview = useHodTimetable(classId);
  const setSlot = useSetTimetableSlot();
  const clearSlot = useClearTimetableSlot();
  const o = overview.data;
  const selectedClassId = classId ?? o?.selected_class_id ?? null;

  const mappedSubjects = useMemo(
    () => (o?.subjects ?? []).filter((s) => s.faculty_ids.length > 0),
    [o?.subjects],
  );
  const facultyIdBySubject = useMemo(
    () => new Map(mappedSubjects.map((s) => [s.subject_id, s.faculty_ids[0]])),
    [mappedSubjects],
  );

  function handleDrop(dayOfWeek: number, cell: HodTimetableCell, subjectId: number) {
    if (!selectedClassId) return;
    const facultyId = facultyIdBySubject.get(subjectId);
    if (!facultyId) return;
    setConflictError(null);
    setSlot.mutate(
      {
        class_id: selectedClassId,
        day_of_week: dayOfWeek,
        period_number: cell.period_number,
        subject_id: subjectId,
        faculty_id: facultyId,
      },
      { onError: (e) => setConflictError(errorMessageOf(e)) },
    );
  }

  const gridTemplateColumns = `70px repeat(${o?.columns.length ?? 0}, minmax(0, 1fr))`;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {overview.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load the timetable — please try again.
        </div>
      )}
      {conflictError && (
        <div className="flex items-center justify-between gap-3 rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          <span>Scheduling conflict — {conflictError}</span>
          <button
            type="button"
            onClick={() => setConflictError(null)}
            className="shrink-0 cursor-pointer text-[16px] leading-none text-danger-fg/70 hover:text-danger-fg"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Timetable Allocation</h1>
          <p className="mt-1 text-[13px] text-muted">
            Pick a subject below, then click or drag it onto a period to assign it — the faculty comes from its Assign Faculty mapping
          </p>
        </div>
        <Select
          value={selectedClassId ?? ""}
          onChange={(e) => {
            setClassId(e.target.value ? Number(e.target.value) : null);
            setSelectedSubjectId(null);
          }}
          className="max-w-[260px] shrink-0 font-bold"
        >
          {(o?.classes ?? []).map((c) => (
            <option key={c.class_id} value={c.class_id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="hod-hover-card">
        <div className="flex flex-wrap gap-2">
          {mappedSubjects.length === 0 ? (
            <span className="text-[13px] text-subtle">
              No subjects have a faculty mapped in this class yet — use{" "}
              <Link href="/hod/assign-faculty" className="font-bold text-primary hover:underline">
                Assign Faculty
              </Link>{" "}
              first.
            </span>
          ) : (
            mappedSubjects.map((s) => (
              <SubjectChip
                key={s.subject_id}
                subject={s}
                active={s.subject_id === selectedSubjectId}
                onSelect={() => setSelectedSubjectId((id) => (id === s.subject_id ? null : s.subject_id))}
              />
            ))
          )}
        </div>
      </Card>

      {overview.isLoading ? (
        <SkeletonBlock className="min-h-[420px]" />
      ) : overview.isError ? null : (o?.columns.length ?? 0) === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">No classes found in your department.</p>
        </Card>
      ) : (
        <Card className="hod-hover-card overflow-x-auto">
          <div className="grid gap-2.5" style={{ gridTemplateColumns }}>
            <div />
            {o!.columns.map((col) => (
              <div key={col.period_number} className="pb-1 text-center text-[12.5px] font-semibold text-subtle">
                {formatTime12h(col.start_time)}
              </div>
            ))}

            {o!.rows.map((row) => (
              <Fragment key={row.day_of_week}>
                <div className="flex items-center text-[14px] font-extrabold text-ink">{row.day_label}</div>
                {row.cells.map((cell) => {
                  const key = `${row.day_of_week}-${cell.period_number}`;
                  const isFilled = cell.type === "class" || cell.type === "lab";
                  const isDroppable = isFilled || cell.type === "free";
                  return (
                    <div
                      key={key}
                      role={isDroppable && selectedSubjectId ? "button" : undefined}
                      onClick={() => {
                        if (!isDroppable || !selectedSubjectId) return;
                        handleDrop(row.day_of_week, cell, selectedSubjectId);
                      }}
                      onDragOver={(e) => {
                        if (!isDroppable) return;
                        e.preventDefault();
                        setDragOverKey(key);
                      }}
                      onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverKey(null);
                        if (!isDroppable) return;
                        const subjectId = Number(e.dataTransfer.getData("text/plain"));
                        if (subjectId) handleDrop(row.day_of_week, cell, subjectId);
                      }}
                      className={cn(
                        "group relative min-h-[76px] rounded-[12px] border px-3 py-2.5 transition-colors",
                        isFilled
                          ? cell.type === "lab"
                            ? "border-border-accent bg-accent-50"
                            : "border-border-default bg-surface"
                          : cell.type === "free"
                            ? "border-dashed border-border-default/60"
                            : "flex items-center justify-center border-dashed border-border-default/60 bg-surface-tint",
                        dragOverKey === key && isDroppable && "border-primary bg-accent-50",
                        isDroppable && selectedSubjectId && "cursor-pointer",
                      )}
                    >
                      {isFilled ? (
                        <>
                          <button
                            onClick={(e) => {
                              // Stop the click from bubbling to the cell's own
                              // onClick, which would otherwise instantly
                              // re-assign the still-active subject right back
                              // onto the slot this button just cleared.
                              e.stopPropagation();
                              // Remember this slot's subject so dropping it
                              // back onto the now-free cell reassigns the
                              // same subject, instead of silently no-oping
                              // because nothing is selected in the picker.
                              setSelectedSubjectId(cell.subject_id);
                              clearSlot.mutate(cell.slot_id);
                            }}
                            className="absolute top-1.5 right-1.5 hidden size-5 items-center justify-center rounded-full bg-surface text-[11px] text-subtle group-hover:flex hover:text-danger-fg"
                            aria-label="Clear assignment"
                          >
                            ×
                          </button>
                          <div className="truncate text-[13.5px] font-extrabold leading-[1.25] text-primary">
                            {cell.subject_code}
                          </div>
                          <div className="mt-1 truncate text-[11.5px] text-muted">{cell.subject_name}</div>
                          <div className="mt-1 truncate text-[11.5px] font-bold text-ink">{cell.faculty_name}</div>
                          {cell.venue_name && <div className="truncate text-[11px] text-subtle">{cell.venue_name}</div>}
                        </>
                      ) : cell.type === "break" ? (
                        <span className="text-center text-[12.5px] text-subtle">Break</span>
                      ) : (
                        <span className="text-center text-[12px] text-subtle/70">Assign a subject</span>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-5 border-t border-divider pt-4 text-[12.5px] font-semibold text-body">
            <span className="flex items-center gap-1.5">
              <span className="size-3.5 rounded-[4px] border-2 border-border-default bg-surface" />
              Class
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3.5 rounded-[4px] border-2 border-border-accent bg-accent-50" />
              Lab
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3.5 rounded-[4px] border-2 border-border-default/60 bg-surface-tint" />
              Break
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3.5 rounded-[4px] border-2 border-dashed border-border-default/60 bg-transparent" />
              Unassigned · pick or drag a subject
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
