"use client";

import { useMemo, useState } from "react";
import { Card, Select, Button, ConfirmDialog } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonRows, SkeletonTable, SkeletonFilterBar } from "@/components/ui/Skeleton";
import { useExams, useCreateExam, useExamSubjectMappings, type ExamSubjectMapping, type ExamStatus } from "@/modules/coe/api/exams";
import { useCreateTimetableEntry, useDeleteTimetableEntry, useUpdateTimetableEntry, useExamTimetable, type TimetableEntry } from "@/modules/coe/api/timetable";
import { useExamTypes, useBatches, useSubjects, useClasses, useDepartments } from "@/modules/coe/api/reference";
import type { ExamSessionCode } from "@/modules/coe/api/shared";
import { toIsoDateString, todayDateOnly } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const SESSIONS: { key: ExamSessionCode; label: string; start: string; end: string }[] = [
  { key: "FN", label: "FN", start: "10:00", end: "13:00" },
  { key: "AN", label: "AN", start: "14:00", end: "17:00" },
];

const MAX_DAYS = 14;
const DAY_LABEL = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const DATE_LABEL = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

type TabKey = "create" | "drafts" | "to_publish" | "published";
const TAB_STATUS: Partial<Record<TabKey, ExamStatus>> = {
  drafts: "created",
  to_publish: "timetable_published",
  published: "results_published",
};

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDateString(d);
}

function cellKey(date: string, session: ExamSessionCode) {
  return `${date}|${session}`;
}

export default function CoeTimetablesPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const batches = useBatches();
  const departments = useDepartments();
  const subjects = useSubjects();
  const classes = useClasses();
  const mappings = useExamSubjectMappings();
  const timetable = useExamTimetable();
  const createExam = useCreateExam();
  const createEntry = useCreateTimetableEntry();
  const updateEntry = useUpdateTimetableEntry();
  const deleteEntry = useDeleteTimetableEntry();

  const [tab, setTab] = useState<TabKey>("create");
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const [showCreateExam, setShowCreateExam] = useState(false);
  const [newExamTypeId, setNewExamTypeId] = useState<number | null>(null);
  const [newBatchId, setNewBatchId] = useState<number | null>(null);
  const [newAcademicYear, setNewAcademicYear] = useState("");
  const [newSemester, setNewSemester] = useState(1);

  const [slotMappingId, setSlotMappingId] = useState<number | null>(null);
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("10:00");
  const [slotEnd, setSlotEnd] = useState("13:00");
  const [slotSession, setSlotSession] = useState<ExamSessionCode>("FN");

  const [fromDate, setFromDate] = useState(todayDateOnly());
  const [toDate, setToDate] = useState(addDays(todayDateOnly(), 6));
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingMappingId, setDraggingMappingId] = useState<number | null>(null);
  const [draggingEntryId, setDraggingEntryId] = useState<number | null>(null);
  const [unscheduledDragOver, setUnscheduledDragOver] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);
  const departmentsById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d])), [departments.data]);
  const subjectsById = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);
  const classesById = useMemo(() => new Map((classes.data ?? []).map((c) => [c.id, c])), [classes.data]);

  // Academic year → Semester → Examination type cascade, mirroring the
  // design's filter bar exactly. `exams` has no department_id of its own
  // (only exam_type_id/batch_id/academic_year/semester) — Department only
  // scopes which already-mapped subjects show up below, via each mapping's
  // class.department_id.
  const academicYears = useMemo(() => [...new Set((exams.data ?? []).map((e) => e.academic_year))].sort().reverse(), [exams.data]);
  const effectiveAcademicYear = academicYear ?? academicYears[0] ?? null;

  const semestersForYear = useMemo(
    () => [...new Set((exams.data ?? []).filter((e) => e.academic_year === effectiveAcademicYear).map((e) => e.semester))].sort((a, b) => a - b),
    [exams.data, effectiveAcademicYear],
  );
  const effectiveSemester = semester ?? semestersForYear[0] ?? null;

  const examTypeOptions = useMemo(
    () => [
      ...new Set(
        (exams.data ?? [])
          .filter((e) => e.academic_year === effectiveAcademicYear && e.semester === effectiveSemester)
          .map((e) => e.exam_type_id),
      ),
    ],
    [exams.data, effectiveAcademicYear, effectiveSemester],
  );
  const effectiveExamTypeId = examTypeId ?? examTypeOptions[0] ?? null;

  const resolvedExam = useMemo(
    () =>
      (exams.data ?? []).find(
        (e) => e.academic_year === effectiveAcademicYear && e.semester === effectiveSemester && e.exam_type_id === effectiveExamTypeId,
      ) ?? null,
    [exams.data, effectiveAcademicYear, effectiveSemester, effectiveExamTypeId],
  );
  const examId = resolvedExam?.id ?? null;

  const examMappings = useMemo(() => (mappings.data ?? []).filter((m) => m.exam_id === examId), [mappings.data, examId]);

  const departmentOptions = useMemo(() => {
    const ids = new Set(
      examMappings.map((m) => classesById.get(m.class_id)?.department_id).filter((id): id is number => id != null),
    );
    return (departments.data ?? []).filter((d) => ids.has(d.id));
  }, [examMappings, classesById, departments.data]);
  const effectiveDepartmentId = departmentId ?? departmentOptions[0]?.id ?? null;

  const deptMappings = useMemo(
    () => examMappings.filter((m) => classesById.get(m.class_id)?.department_id === effectiveDepartmentId),
    [examMappings, classesById, effectiveDepartmentId],
  );

  const examTimetable = useMemo(
    () => (timetable.data ?? []).filter((t) => t.exam_subject_mapping.exam_id === examId),
    [timetable.data, examId],
  );
  const deptTimetable = useMemo(() => {
    const ids = new Set(deptMappings.map((m) => m.id));
    return examTimetable.filter((t) => ids.has(t.exam_subject_mapping_id));
  }, [examTimetable, deptMappings]);

  const scheduledMappingIds = useMemo(() => new Set(deptTimetable.map((t) => t.exam_subject_mapping_id)), [deptTimetable]);
  const unscheduledMappings = deptMappings.filter((m) => !scheduledMappingIds.has(m.id));

  const entriesByCell = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    for (const entry of deptTimetable) {
      const key = cellKey(entry.exam_date.slice(0, 10), entry.session);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [deptTimetable]);

  const days = useMemo(() => {
    const list: string[] = [];
    let cursor = fromDate;
    while (cursor <= toDate && list.length < MAX_DAYS) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [fromDate, toDate]);

  // Real, computed conflict check — same class scheduled twice in one
  // session. Not persisted anywhere (no backend concept), but genuinely
  // derived from the live exam-timetable data, not fabricated.
  const conflicts = useMemo(() => {
    const found: { key: string; classId: number; count: number }[] = [];
    for (const [key, entries] of entriesByCell) {
      const byClass = new Map<number, number>();
      for (const e of entries) {
        const cid = e.exam_subject_mapping.class_id;
        byClass.set(cid, (byClass.get(cid) ?? 0) + 1);
      }
      for (const [cid, count] of byClass) if (count > 1) found.push({ key, classId: cid, count });
    }
    return found;
  }, [entriesByCell]);

  // Which placed entries render red — any entry whose cell+class shows up in `conflicts`.
  const conflictingEntryIds = useMemo(() => {
    const ids = new Set<number>();
    if (conflicts.length === 0) return ids;
    const conflictKeys = new Set(conflicts.map((c) => `${c.key}|${c.classId}`));
    for (const [key, entries] of entriesByCell) {
      for (const e of entries) {
        if (conflictKeys.has(`${key}|${e.exam_subject_mapping.class_id}`)) ids.add(e.id);
      }
    }
    return ids;
  }, [conflicts, entriesByCell]);

  const tabCounts: Record<TabKey, number> = {
    create: 0,
    drafts: (exams.data ?? []).filter((e) => e.status === "created").length,
    to_publish: (exams.data ?? []).filter((e) => e.status === "timetable_published").length,
    published: (exams.data ?? []).filter((e) => e.status === "results_published").length,
  };

  function mappingLabel(mapping: { subject_id: number; class_id: number }) {
    const subject = subjectsById.get(mapping.subject_id);
    const klass = classesById.get(mapping.class_id);
    return `${subject ? `${subject.subject_code} · ${subject.name}` : `Subject #${mapping.subject_id}`} — ${
      klass ? `Class #${klass.id} Sec ${klass.section}` : `Class #${mapping.class_id}`
    }`;
  }

  function selectExam(exam: { academic_year: string; semester: number; exam_type_id: number }) {
    setAcademicYear(exam.academic_year);
    setSemester(exam.semester);
    setExamTypeId(exam.exam_type_id);
    setDepartmentId(null);
    setTab("create");
  }

  function handleCreateExam() {
    if (!newExamTypeId || !newBatchId || !/^\d{4}-\d{4}$/.test(newAcademicYear)) return;
    createExam.mutate(
      { exam_type_id: newExamTypeId, batch_id: newBatchId, academic_year: newAcademicYear, semester: newSemester },
      { onSuccess: () => selectExam({ academic_year: newAcademicYear, semester: newSemester, exam_type_id: newExamTypeId }) },
    );
  }

  function handleCreateSlot() {
    if (!slotMappingId || !slotDate) return;
    createEntry.mutate(
      { exam_subject_mapping_id: slotMappingId, exam_date: slotDate, start_time: slotStart, end_time: slotEnd, session: slotSession },
      { onSuccess: () => setSlotMappingId(null) },
    );
  }

  // The backend now rejects a drop that would give one class two papers in
  // the same session (real ConflictException, surfaced below via
  // actionError) — the `conflicts` banner + red cards above still cover any
  // rows that predate that check.
  function handleDropOnCell(date: string, session: (typeof SESSIONS)[number], payload: string) {
    setDragOverKey(null);
    setDraggingMappingId(null);
    setDraggingEntryId(null);
    if (!payload) return;
    setActionError(null);

    if (payload.startsWith("entry:")) {
      const entryId = Number(payload.slice("entry:".length));
      const entry = deptTimetable.find((t) => t.id === entryId);
      if (!entry || (entry.exam_date.slice(0, 10) === date && entry.session === session.key)) return;
      updateEntry.mutate(
        { id: entryId, exam_date: date, session: session.key, start_time: session.start, end_time: session.end },
        { onError: (err) => setActionError((err as Error).message) },
      );
      return;
    }

    const mappingId = Number(payload);
    if (!mappingId) return;
    createEntry.mutate(
      { exam_subject_mapping_id: mappingId, exam_date: date, session: session.key, start_time: session.start, end_time: session.end },
      { onError: (err) => setActionError((err as Error).message) },
    );
  }

  function handleDropOnUnscheduled(payload: string) {
    setUnscheduledDragOver(false);
    setDraggingEntryId(null);
    if (!payload.startsWith("entry:")) return;
    const entryId = Number(payload.slice("entry:".length));
    setActionError(null);
    deleteEntry.mutate(entryId, { onError: (err) => setActionError((err as Error).message) });
  }

  async function handleAutoGenerate() {
    const emptySlots = days.flatMap((date) =>
      SESSIONS.filter((s) => !entriesByCell.has(cellKey(date, s.key))).map((s) => ({ date, session: s })),
    );
    const toPlace = unscheduledMappings.slice(0, emptySlots.length);
    if (toPlace.length === 0) return;
    setAutoGenerating(true);
    setActionError(null);
    try {
      for (let i = 0; i < toPlace.length; i++) {
        const slot = emptySlots[i];
        await createEntry.mutateAsync({
          exam_subject_mapping_id: toPlace[i].id,
          exam_date: slot.date,
          session: slot.session.key,
          start_time: slot.session.start,
          end_time: slot.session.end,
        });
      }
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setAutoGenerating(false);
    }
  }

  async function handleClear() {
    setConfirmingClear(false);
    setClearing(true);
    setActionError(null);
    try {
      for (const entry of deptTimetable) {
        await deleteEntry.mutateAsync(entry.id);
      }
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setClearing(false);
    }
  }

  const isLoading = exams.isLoading || mappings.isLoading || timetable.isLoading || departments.isLoading;
  const isError = exams.isError || mappings.isError || timetable.isError || departments.isError;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Examination timetables" subtitle="Create, detect conflicts, publish and export schedules" />

      <div className="flex items-center gap-6 border-b border-divider">
        {(["create", "drafts", "to_publish", "published"] as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 pb-3 text-[14px] font-bold transition-colors",
              tab === key ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {key === "create" ? "Create" : key === "drafts" ? "Drafts" : key === "to_publish" ? "To publish" : "Published"}
            {key !== "create" && (
              <span className="rounded-[6px] bg-divider px-[7px] py-0.5 font-mono text-[10.5px] font-bold text-muted">
                {tabCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab !== "create" ? (
        <Card className="p-0">
          <div className="border-b border-divider px-5 py-3.5 text-[13px] text-muted">
            Exams with status <code>{TAB_STATUS[tab]}</code>
          </div>
          {(exams.data ?? []).filter((e) => e.status === TAB_STATUS[tab]).length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No exams in this state.</p>
          ) : (
            <div className="flex flex-col">
              {(exams.data ?? [])
                .filter((e) => e.status === TAB_STATUS[tab])
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => selectExam(e)}
                    className="flex items-center justify-between border-b border-divider px-5 py-3.5 text-left last:border-0 hover:bg-nav-hover"
                  >
                    <span className="text-[13.5px] font-bold text-ink">
                      {examTypesById.get(e.exam_type_id)?.name ?? `Type #${e.exam_type_id}`} · Sem {e.semester} · {e.academic_year}
                    </span>
                    <span className="text-[12.5px] font-bold text-primary">Open in Create →</span>
                  </button>
                ))}
            </div>
          )}
        </Card>
      ) : isLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <div className="grid flex-1 grid-cols-6 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Academic year</label>
                <Select
                  value={effectiveAcademicYear ?? ""}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setSemester(null);
                    setExamTypeId(null);
                    setDepartmentId(null);
                  }}
                >
                  {academicYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Semester</label>
                <Select
                  value={effectiveSemester ?? ""}
                  onChange={(e) => {
                    setSemester(Number(e.target.value));
                    setExamTypeId(null);
                    setDepartmentId(null);
                  }}
                >
                  {semestersForYear.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Department</label>
                <Select value={effectiveDepartmentId ?? ""} onChange={(e) => setDepartmentId(Number(e.target.value))}>
                  {departmentOptions.length === 0 && <option value="">No mapped subjects</option>}
                  {departmentOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} · {d.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Examination type</label>
                <Select value={effectiveExamTypeId ?? ""} onChange={(e) => setExamTypeId(Number(e.target.value))}>
                  {examTypeOptions.map((id) => (
                    <option key={id} value={id}>
                      {examTypesById.get(id)?.name ?? `Type #${id}`}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">From date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-input border border-border-default bg-surface px-2.5 py-2.5 text-[13px] text-ink focus:border-border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">To date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-input border border-border-default bg-surface px-2.5 py-2.5 text-[13px] text-ink focus:border-border-accent focus:outline-none"
                />
              </div>
            </div>
            <Button variant="secondary" className="ml-4 w-auto self-end" onClick={() => setShowCreateExam((v) => !v)}>
              {showCreateExam ? "Cancel" : "New exam"}
            </Button>
          </div>

          {showCreateExam && (
            <div className="mt-4 grid grid-cols-5 gap-3 border-t border-divider pt-4">
              <Select value={newExamTypeId ?? ""} onChange={(e) => setNewExamTypeId(Number(e.target.value))}>
                <option value="">Exam type…</option>
                {(examTypes.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Select value={newBatchId ?? ""} onChange={(e) => setNewBatchId(Number(e.target.value))}>
                <option value="">Batch…</option>
                {(batches.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <input
                placeholder="2026-2027"
                value={newAcademicYear}
                onChange={(e) => setNewAcademicYear(e.target.value)}
                className="rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
              <Select value={newSemester} onChange={(e) => setNewSemester(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </Select>
              <Button variant="primarySmall" onClick={handleCreateExam} disabled={createExam.isPending}>
                {createExam.isPending ? "Creating…" : "Create exam"}
              </Button>
              {createExam.isError && <p className="col-span-5 text-[12px] text-danger-fg">{(createExam.error as Error).message}</p>}
            </div>
          )}
        </Card>
      )}

      {tab === "create" && !isLoading && !isError && (
        <div
          className={cn(
            "rounded-[11px] border px-4 py-2.5 text-[13px] font-semibold",
            conflicts.length === 0 ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]" : "border-danger-border bg-danger-bg text-danger-fg",
          )}
        >
          {conflicts.length === 0
            ? `No conflicts across ${days.length} days · ${departmentsById.get(effectiveDepartmentId ?? -1)?.code ?? "—"} Semester ${effectiveSemester ?? "—"}`
            : `${conflicts.length} scheduling conflict${conflicts.length === 1 ? "" : "s"} — two papers of the same cohort share one session`}
        </div>
      )}

      {actionError && <p className="text-[12px] text-danger-fg">{actionError}</p>}

      {isError ? (
        <Card className="border-danger-border bg-danger-bg">
          <p className="text-[13px] text-danger-fg">
            Couldn&apos;t load this page: &quot;
            {((exams.error ?? mappings.error ?? timetable.error ?? departments.error) as Error).message}&quot;. Try reloading.
          </p>
        </Card>
      ) : tab !== "create" ? null : isLoading ? (
        <div className="grid grid-cols-[1fr_1.6fr] gap-4 items-start">
          <SkeletonRows count={4} />
          <SkeletonTable rows={5} />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_1.6fr] gap-4 items-start">
          <Card className="p-0">
            <div className="border-b border-divider px-5 py-3.5">
              <div className="text-[10.5px] font-extrabold uppercase tracking-[.09em] text-subtle">Unscheduled papers</div>
              <div className="mt-0.5 text-[13.5px] font-bold text-ink">
                {departmentsById.get(effectiveDepartmentId ?? -1)?.code ?? "—"} · Semester {effectiveSemester ?? "—"}
              </div>
            </div>
            <div
              onDragOver={(e) => {
                if (draggingEntryId == null) return;
                e.preventDefault();
                if (!unscheduledDragOver) setUnscheduledDragOver(true);
              }}
              onDragLeave={() => setUnscheduledDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnUnscheduled(e.dataTransfer.getData("text/plain"));
              }}
              className={cn(
                "flex flex-col gap-2.5 p-4 transition-colors",
                unscheduledDragOver && "bg-accent-50 outline outline-2 -outline-offset-2 outline-primary",
              )}
            >
              {draggingEntryId != null && (
                <p className="rounded-[8px] border border-dashed border-border-accent px-3 py-2 text-center text-[12px] font-semibold text-primary">
                  Drop here to unschedule
                </p>
              )}
              {unscheduledMappings.length === 0 ? (
                <p className="text-[12.5px] text-subtle">Every mapped subject already has a timetable slot.</p>
              ) : (
                unscheduledMappings.map((m: ExamSubjectMapping) => (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingMappingId(m.id);
                      e.dataTransfer.setData("text/plain", String(m.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggingMappingId(null);
                      setDragOverKey(null);
                    }}
                    onClick={() => setSlotMappingId(m.id)}
                    className={cn(
                      "cursor-grab rounded-[10px] border px-3.5 py-2.5 text-left transition-colors active:cursor-grabbing",
                      slotMappingId === m.id ? "border-border-accent bg-accent-50" : "border-border-default hover:bg-nav-hover",
                      draggingMappingId === m.id && "opacity-40",
                    )}
                  >
                    <div className="text-[13px] font-extrabold text-primary">{subjectsById.get(m.subject_id)?.subject_code ?? `#${m.subject_id}`}</div>
                    <div className="mt-0.5 text-[12.5px] text-ink">{mappingLabel(m)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-divider p-4">
              <Button
                variant="primarySmall"
                onClick={handleAutoGenerate}
                disabled={unscheduledMappings.length === 0 || autoGenerating}
              >
                {autoGenerating ? "Placing…" : "Auto-generate"}
              </Button>
              <Button
                variant="secondary"
                className="w-auto"
                onClick={() => setConfirmingClear(true)}
                disabled={deptTimetable.length === 0 || clearing}
              >
                {clearing ? "Clearing…" : "Clear"}
              </Button>
            </div>

            {slotMappingId && (
              <div className="border-t border-divider p-4">
                <div className="text-[12.5px] font-bold text-ink">
                  New slot for {mappingLabel(deptMappings.find((m) => m.id === slotMappingId)!)}
                </div>
                <p className="mt-1 text-[11.5px] text-subtle">Drag the card onto a grid cell for the default session time, or set an exact time here.</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="rounded-input border border-border-default bg-surface px-2.5 py-2 text-[12.5px] text-ink focus:border-border-accent focus:outline-none"
                  />
                  <Select value={slotSession} onChange={(e) => setSlotSession(e.target.value as ExamSessionCode)}>
                    <option value="FN">FN</option>
                    <option value="AN">AN</option>
                  </Select>
                  <input
                    type="time"
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="rounded-input border border-border-default bg-surface px-2.5 py-2 text-[12.5px] text-ink focus:border-border-accent focus:outline-none"
                  />
                  <input
                    type="time"
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="rounded-input border border-border-default bg-surface px-2.5 py-2 text-[12.5px] text-ink focus:border-border-accent focus:outline-none"
                  />
                </div>
                <Button variant="primarySmall" className="mt-2 w-full" onClick={handleCreateSlot} disabled={!slotDate || createEntry.isPending}>
                  {createEntry.isPending ? "Saving…" : "Create timetable slot"}
                </Button>
                {createEntry.isError && <p className="mt-1.5 text-[12px] text-danger-fg">{(createEntry.error as Error).message}</p>}
              </div>
            )}
          </Card>

          <Card className="p-0 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
              <div className="text-[15px] font-extrabold text-ink">Session grid</div>
              <span className="text-[12.5px] text-muted">
                {deptTimetable.length} paper{deptTimetable.length === 1 ? "" : "s"} placed · {effectiveAcademicYear ?? "—"} / Semester{" "}
                {effectiveSemester ?? "—"} / {departmentsById.get(effectiveDepartmentId ?? -1)?.code ?? "—"} /{" "}
                {examTypesById.get(effectiveExamTypeId ?? -1)?.name ?? "—"}
              </span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: `90px repeat(${days.length}, minmax(110px, 1fr))` }}>
              <div className="border-b border-divider bg-surface-muted px-3 py-2.5 text-[10.5px] font-extrabold uppercase tracking-[.09em] text-subtle">
                Session
              </div>
              {days.map((date) => {
                const d = new Date(`${date}T00:00:00`);
                const isSunday = d.getDay() === 0;
                return (
                  <div
                    key={date}
                    className={`border-b border-divider px-3 py-2.5 text-[12px] font-bold ${isSunday ? "bg-surface-muted text-subtle" : "text-ink"}`}
                  >
                    <div>{DAY_LABEL.format(d)}</div>
                    <div className="text-[11px] font-medium text-muted">{DATE_LABEL.format(d)}</div>
                  </div>
                );
              })}

              {SESSIONS.map((session) => (
                <div key={session.key} className="contents">
                  <div className="border-b border-divider px-3 py-3">
                    <div className="text-[13px] font-extrabold text-ink">{session.label}</div>
                    <div className="text-[11px] text-muted">
                      {session.start}–{session.end}
                    </div>
                  </div>
                  {days.map((date) => {
                    const key = cellKey(date, session.key);
                    const entries = entriesByCell.get(key) ?? [];
                    const isDragOver = dragOverKey === key;
                    return (
                      <div
                        key={key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverKey !== key) setDragOverKey(key);
                        }}
                        onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnCell(date, session, e.dataTransfer.getData("text/plain"));
                        }}
                        className={`flex min-h-[64px] flex-col gap-1 border-b border-divider p-1.5 transition-colors ${
                          isDragOver ? "bg-accent-50 outline outline-2 -outline-offset-2 outline-primary" : ""
                        }`}
                      >
                        {entries.map((entry) => {
                          const subject = subjectsById.get(entry.exam_subject_mapping.subject_id);
                          const hasConflict = conflictingEntryIds.has(entry.id);
                          return (
                            <div
                              key={entry.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggingEntryId(entry.id);
                                e.dataTransfer.setData("text/plain", `entry:${entry.id}`);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                setDraggingEntryId(null);
                                setDragOverKey(null);
                                setUnscheduledDragOver(false);
                              }}
                              className={cn(
                                "cursor-grab rounded-[9px] px-2.5 py-2 text-white transition-opacity active:cursor-grabbing",
                                hasConflict ? "bg-danger-fg" : "bg-primary",
                                draggingEntryId === entry.id && "opacity-40",
                              )}
                            >
                              <div className="text-[12px] font-extrabold">{subject?.subject_code ?? `#${entry.exam_subject_mapping.subject_id}`}</div>
                              <div className="text-[11px] font-medium opacity-90 line-clamp-2">{subject?.name ?? ""}</div>
                            </div>
                          );
                        })}
                        {entries.length === 0 && (
                          <div className="flex h-full items-center justify-center rounded-[9px] text-[11px] text-subtle">
                            {isDragOver ? "Drop here" : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmingClear}
        title="Clear this department's timetable?"
        description={`This deletes all ${deptTimetable.length} scheduled slot${deptTimetable.length === 1 ? "" : "s"} for this exam/department — they'll move back to unscheduled. This can't be undone.`}
        confirmLabel="Clear timetable"
        destructive
        onConfirm={handleClear}
        onCancel={() => setConfirmingClear(false)}
      />
    </div>
  );
}
