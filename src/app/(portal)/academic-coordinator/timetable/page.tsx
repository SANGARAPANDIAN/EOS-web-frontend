"use client";

import { Fragment, useMemo, useState } from "react";
import { useClasses, useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useAllTimetableSlots } from "@/modules/academic-coordinator/hooks/useTimetableQueries";
import { useAcademicYear } from "@/modules/academic-coordinator/context/AcademicYearContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TimetableSlot } from "@/modules/academic-coordinator/types";

const DAY_LABELS: Record<number, string> = { 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };

interface ClashRow {
  label: string;
  detail: string;
  kind: "good" | "bad";
}

function computeClashes(classSlots: TimetableSlot[], allSlots: TimetableSlot[]): ClashRow[] {
  const facultyClashes: string[] = [];
  for (const slot of classSlots) {
    const conflicting = allSlots.filter(
      (s) =>
        s.id !== slot.id &&
        s.facultyId === slot.facultyId &&
        s.dayOfWeek === slot.dayOfWeek &&
        s.periodNumber === slot.periodNumber &&
        s.classId !== slot.classId,
    );
    for (const c of conflicting) {
      facultyClashes.push(`${slot.facultyName} — ${DAY_LABELS[slot.dayOfWeek]} P${slot.periodNumber}: also teaching ${c.departmentCode} ${c.classSection}`);
    }
  }

  const rows: ClashRow[] = [];
  if (facultyClashes.length === 0) {
    rows.push({ label: "Faculty clash", detail: "None detected", kind: "good" });
  } else {
    const unique = Array.from(new Set(facultyClashes));
    for (const detail of unique) rows.push({ label: "Faculty clash", detail, kind: "bad" });
  }
  return rows;
}

export default function CoordinatorTimetablePage() {
  const departments = useDepartments();
  const classes = useClasses();
  const slots = useAllTimetableSlots();
  const { batchId } = useAcademicYear();

  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);

  const deptCodeById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d.code])), [departments.data]);

  const classesInBatch = useMemo(() => (classes.data ?? []).filter((c) => c.batch_id === batchId), [classes.data, batchId]);
  const effectiveDeptId = departmentId ?? classesInBatch[0]?.department_id ?? departments.data?.[0]?.id ?? null;
  const classesInDept = useMemo(
    () => classesInBatch.filter((c) => c.department_id === effectiveDeptId).sort((a, b) => a.section.localeCompare(b.section)),
    [classesInBatch, effectiveDeptId],
  );
  // Fall back to the first section in this department whenever the previous selection doesn't belong to it
  // (department or batch just changed, or the picked class no longer exists) — no extra effect needed.
  const effectiveClassId = classesInDept.some((c) => c.id === classId) ? classId : (classesInDept[0]?.id ?? null);
  const selectedClass = classes.data?.find((c) => c.id === effectiveClassId) ?? null;

  const classSlots = useMemo(() => (slots.data ?? []).filter((s) => s.classId === effectiveClassId), [slots.data, effectiveClassId]);

  const periods = useMemo(() => {
    const byPeriod = new Map<number, { start: string; end: string }>();
    for (const s of slots.data ?? []) {
      if (!byPeriod.has(s.periodNumber)) byPeriod.set(s.periodNumber, { start: s.startTime, end: s.endTime });
    }
    return Array.from(byPeriod.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([period, time]) => ({ period, ...time }));
  }, [slots.data]);

  const days = [1, 2, 3, 4, 5, 6];

  const cellFor = (day: number, period: number) => classSlots.find((s) => s.dayOfWeek === day && s.periodNumber === period);

  const clashes = useMemo(() => computeClashes(classSlots, slots.data ?? []), [classSlots, slots.data]);

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Timetable Management</h1>
          <p className="mt-1.5 text-[13px] text-muted">Weekly class schedule with real faculty-clash validation.</p>
        </div>
        <div className="flex gap-2.5">
          <Select
            value={effectiveDeptId ?? ""}
            onChange={(e) => {
              setDepartmentId(Number(e.target.value));
              setClassId(null);
            }}
            className="min-w-40"
          >
            {[...new Set(classesInBatch.map((c) => c.department_id))].map((deptId) => (
              <option key={deptId} value={deptId}>
                {deptCodeById.get(deptId) ?? "?"}
              </option>
            ))}
          </Select>
          <Select value={effectiveClassId ?? ""} onChange={(e) => setClassId(Number(e.target.value))} className="min-w-45">
            {classesInDept.length === 0 ? (
              <option value="">No sections</option>
            ) : (
              classesInDept.map((c) => (
                <option key={c.id} value={c.id}>
                  Section {c.section}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border-default px-5 py-4">
          <h2 className="m-0 text-[16.5px] font-bold text-ink">Weekly timetable</h2>
          <p className="mt-1 text-xs text-muted">
            {selectedClass ? `${deptCodeById.get(selectedClass.department_id) ?? "?"} · Sec ${selectedClass.section}` : ""} · {periods.length} periods, Monday to
            Saturday.
          </p>
        </div>

        {slots.isLoading ? (
          <EmptyState loading size={32} className="py-10" />
        ) : periods.length === 0 ? (
          <EmptyState message="No timetable slots published yet." className="py-10" />
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-[110px_repeat(6,minmax(140px,1fr))]">
              <div className="border-b border-r border-divider bg-surface-tint" />
              {days.map((d) => (
                <div key={d} className="border-b border-divider bg-surface-tint px-3.5 py-2.5 text-center text-[11px] font-bold text-muted">
                  {DAY_LABELS[d]}
                </div>
              ))}
              {periods.map(({ period, start, end }) => (
                <Fragment key={period}>
                  <div className="border-b border-r border-divider px-3.5 py-2.5 text-[11px] text-muted">
                    {start} – {end}
                  </div>
                  {days.map((d) => {
                    const cell = cellFor(d, period);
                    return (
                      <div key={`${d}-${period}`} className={`min-h-14 border-b border-divider px-2.5 py-2 ${cell ? "bg-accent-50" : "bg-surface"}`}>
                        {cell && (
                          <>
                            <div className="text-xs font-bold text-primary-dark">{cell.subjectCode}</div>
                            <div className="mt-0.5 text-[10.5px] text-muted">{cell.facultyName}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="m-0 text-[16.5px] font-bold text-ink">Validation</h2>
        <div className="mt-3 flex flex-col gap-2">
          {clashes.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 rounded-card-sm border px-3.5 py-2.5 ${
                c.kind === "good" ? "border-border-accent bg-accent-50" : "border-danger-border bg-danger-bg"
              }`}
            >
              <Badge tone={c.kind === "good" ? "accent" : "danger"}>{c.kind === "good" ? "OK" : "Clash"}</Badge>
              <span className="shrink-0 text-[12.5px] font-semibold text-ink">{c.label}</span>
              <span className="text-xs text-muted">{c.detail}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
