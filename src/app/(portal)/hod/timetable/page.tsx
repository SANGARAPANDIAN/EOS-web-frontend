"use client";

import { Fragment, useMemo, useState } from "react";
import { Card, Input, Select, SkeletonBlock } from "@/components/ui";
import {
  useHodTimetable,
  useSetTimetableSlot,
  useClearTimetableSlot,
  type HodTimetableCell,
  type HodTimetableFacultyOption,
} from "@/modules/hod/api/timetable";
import { cn } from "@/lib/utils/cn";

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function FacultyChip({
  faculty,
  active,
  onSelect,
}: {
  faculty: HodTimetableFacultyOption;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(faculty.faculty_id));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onSelect}
      className={cn(
        "hod-hover-card cursor-grab whitespace-nowrap rounded-pill border px-3.5 py-2 text-[13px] font-bold transition-colors active:cursor-grabbing",
        active ? "border-primary bg-accent-50 text-primary" : "border-border-default bg-surface text-ink",
      )}
    >
      {faculty.name}
    </button>
  );
}

export default function HodTimetablePage() {
  const [classId, setClassId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [facultySearch, setFacultySearch] = useState("");
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);

  const overview = useHodTimetable(classId);
  const setSlot = useSetTimetableSlot();
  const clearSlot = useClearTimetableSlot();
  const o = overview.data;
  const selectedClassId = classId ?? o?.selected_class_id ?? null;

  const selectedSubject = useMemo(
    () => (o?.subjects ?? []).find((s) => s.subject_id === subjectId) ?? null,
    [o?.subjects, subjectId],
  );

  const filteredFaculty = useMemo(() => {
    const q = facultySearch.trim().toLowerCase();
    const options = o?.faculty_options ?? [];
    const scoped = selectedSubject
      ? options.filter((f) => selectedSubject.faculty_ids.includes(f.faculty_id))
      : options;
    return q ? scoped.filter((f) => f.name.toLowerCase().includes(q)) : scoped;
  }, [o?.faculty_options, facultySearch, selectedSubject]);

  function handleDrop(dayOfWeek: number, cell: HodTimetableCell, facultyId: number) {
    if (!selectedClassId) return;
    const targetSubjectId = cell.type === "class" || cell.type === "lab" ? cell.subject_id : subjectId;
    if (!targetSubjectId) return;
    setSlot.mutate({
      class_id: selectedClassId,
      day_of_week: dayOfWeek,
      period_number: cell.period_number,
      subject_id: targetSubjectId,
      faculty_id: facultyId,
    });
  }

  const gridTemplateColumns = `70px repeat(${o?.columns.length ?? 0}, minmax(0, 1fr))`;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Timetable</h1>
          <p className="mt-1 text-[13px] text-muted">
            Pick a faculty below, then click or drag them onto a period to assign it
          </p>
        </div>
        <Select
          value={selectedClassId ?? ""}
          onChange={(e) => {
            setClassId(e.target.value ? Number(e.target.value) : null);
            setSubjectId(null);
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
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={subjectId ?? ""}
            onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
            className="max-w-[300px] font-bold"
          >
            <option value="">Select subject to assign into a free period</option>
            {(o?.subjects ?? []).map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.code} · {s.name}
              </option>
            ))}
          </Select>
          <Input
            value={facultySearch}
            onChange={(e) => setFacultySearch(e.target.value)}
            placeholder="Search faculty to drag"
            className="max-w-[260px]"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filteredFaculty.length === 0 && selectedSubject ? (
            <span className="text-[13px] text-subtle">No faculty are mapped to {selectedSubject.code} yet.</span>
          ) : (
            filteredFaculty.map((f) => (
              <FacultyChip
                key={f.faculty_id}
                faculty={f}
                active={f.faculty_id === selectedFacultyId}
                onSelect={() => setSelectedFacultyId((id) => (id === f.faculty_id ? null : f.faculty_id))}
              />
            ))
          )}
        </div>
      </Card>

      {overview.isLoading ? (
        <SkeletonBlock className="min-h-[420px]" />
      ) : (o?.columns.length ?? 0) === 0 ? (
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
                      role={isDroppable && selectedFacultyId ? "button" : undefined}
                      onClick={() => {
                        if (!isDroppable || !selectedFacultyId) return;
                        handleDrop(row.day_of_week, cell, selectedFacultyId);
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
                        const facultyId = Number(e.dataTransfer.getData("text/plain"));
                        if (facultyId) handleDrop(row.day_of_week, cell, facultyId);
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
                        isDroppable && selectedFacultyId && "cursor-pointer",
                      )}
                    >
                      {isFilled ? (
                        <>
                          <button
                            onClick={() => clearSlot.mutate(cell.slot_id)}
                            className="absolute top-1.5 right-1.5 hidden size-5 items-center justify-center rounded-full bg-surface text-[11px] text-subtle group-hover:flex hover:text-danger-fg"
                            aria-label="Clear assignment"
                          >
                            ×
                          </button>
                          <div className="truncate text-[13.5px] font-extrabold leading-[1.25] text-primary">
                            {cell.subject_code} · {o!.selected_class_label}
                          </div>
                          <div className="mt-1 truncate text-[11.5px] text-muted">{cell.subject_name}</div>
                          <div className="mt-1 truncate text-[11.5px] font-bold text-ink">{cell.faculty_name}</div>
                          {cell.venue_name && <div className="truncate text-[11px] text-subtle">{cell.venue_name}</div>}
                        </>
                      ) : cell.type === "break" ? (
                        <span className="text-center text-[12.5px] text-subtle">Break</span>
                      ) : (
                        <span className="text-center text-[12px] text-subtle/70">Assign a faculty</span>
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
              Unassigned · pick or drag a faculty
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
