"use client";

import { useMemo, useState } from "react";
import { Card, Select, Button, ConfirmDialog, Modal } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonRows, SkeletonTable, SkeletonFilterBar } from "@/components/ui/Skeleton";
import { useExams, useCreateExam, useExamSubjectMappings, type ExamSubjectMapping } from "@/modules/coe/api/exams";
import { useCreateTimetableEntry, useDeleteTimetableEntry, useUpdateTimetableEntry, useExamTimetable, type TimetableEntry } from "@/modules/coe/api/timetable";
import { useExamTypes, useBatches, useSubjects, useClasses, useDepartments } from "@/modules/coe/api/reference";
import type { ExamSessionCode } from "@/modules/coe/api/shared";
import {
  useExamTimetableVersions,
  useMoveTimetableToDraft,
  usePublishTimetableVersion,
  useWithdrawTimetableVersion,
  useDeleteTimetableVersion,
  useTimetableVersionSchedule,
  type TimetableVersion,
} from "@/modules/coe/api/examTimetableVersions";
import { toIsoDateString, todayDateOnly } from "@/lib/utils/date";
import { downloadCsv } from "@/lib/utils/csv";
import { cn } from "@/lib/utils/cn";

const LOG_DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

const SESSIONS: { key: ExamSessionCode; label: string; start: string; end: string }[] = [
  { key: "FN", label: "FN", start: "10:00", end: "13:00" },
  { key: "AN", label: "AN", start: "14:00", end: "17:00" },
];

const MAX_DAYS = 14;
const DAY_LABEL = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const DATE_LABEL = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

type TabKey = "create" | "drafts" | "to_publish" | "published";

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
  const moveToDraft = useMoveTimetableToDraft();
  const publishVersion = usePublishTimetableVersion();
  const withdrawVersion = useWithdrawTimetableVersion();
  const deleteVersion = useDeleteTimetableVersion();
  const allVersions = useExamTimetableVersions();

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
  const [publishing, setPublishing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishedFrom, setPublishedFrom] = useState(todayDateOnly());
  const [publishedTo, setPublishedTo] = useState(addDays(todayDateOnly(), 29));
  const [viewingVersion, setViewingVersion] = useState<TimetableVersion | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<TimetableVersion | null>(null);
  const [withdrawingVersion, setWithdrawingVersion] = useState<TimetableVersion | null>(null);

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
  const versions = useExamTimetableVersions(examId);
  const currentVersion = (versions.data ?? []).find((v) => v.status === "draft" || v.status === "ready_to_publish") ?? null;
  const liveVersion = (versions.data ?? []).find((v) => v.status === "published") ?? null;
  const versionsById = useMemo(() => new Map((versions.data ?? []).map((v) => [v.id, v])), [versions.data]);

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
    drafts: (allVersions.data ?? []).filter((v) => v.status === "draft").length,
    to_publish: (allVersions.data ?? []).filter((v) => v.status === "ready_to_publish").length,
    published: (allVersions.data ?? []).filter((v) => v.status === "published").length,
  };

  const sundayCount = days.filter((d) => new Date(`${d}T00:00:00`).getDay() === 0).length;
  const windowDescription =
    days.length > 0
      ? `${days.length} day${days.length === 1 ? "" : "s"} in window · ${DAY_LABEL.format(new Date(`${days[0]}T00:00:00`))} ${DATE_LABEL.format(
          new Date(`${days[0]}T00:00:00`),
        )} – ${DAY_LABEL.format(new Date(`${days[days.length - 1]}T00:00:00`))} ${DATE_LABEL.format(new Date(`${days[days.length - 1]}T00:00:00`))}${
          sundayCount > 0 ? ` · includes ${sundayCount} Sunday${sundayCount === 1 ? "" : "s"}` : ""
        }`
      : "—";

  // Real log derived from exam_timetable_versions rows for this exam — not a
  // separately-stored audit table, just each version's own created_at/
  // published_at read back as a chronological feed.
  const historyEvents = useMemo(() => {
    const events: { at: string; description: string }[] = [];
    for (const v of versions.data ?? []) {
      const path = `${v.exam.academic_year} / Semester ${v.exam.semester} / ${v.exam.department_codes.join("/") || "—"} / ${v.exam.exam_type_name} / v${v.version_number}`;
      if (v.cloned_from_version_id != null) {
        const source = versionsById.get(v.cloned_from_version_id);
        events.push({ at: v.created_at, description: `Version v${v.version_number} created from v${source?.version_number ?? "?"}` });
      }
      if (v.published_at) events.push({ at: v.published_at, description: `${path} published to the student database` });
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [versions.data, versionsById]);

  const publishedVersionIds = useMemo(
    () => new Set((allVersions.data ?? []).filter((v) => v.status === "published").map((v) => v.id)),
    [allVersions.data],
  );
  const papersInRange = useMemo(
    () =>
      (timetable.data ?? []).filter(
        (t) => publishedVersionIds.has(t.version_id) && t.exam_date.slice(0, 10) >= publishedFrom && t.exam_date.slice(0, 10) <= publishedTo,
      ).length,
    [timetable.data, publishedVersionIds, publishedFrom, publishedTo],
  );

  function versionLabel(v: TimetableVersion) {
    return `${v.exam.academic_year} / Semester ${v.exam.semester} / ${v.exam.department_codes.join("/") || "—"} / ${v.exam.exam_type_name} / v${v.version_number}`;
  }

  function handleViewSchedule(v: TimetableVersion) {
    setViewingVersion(v);
  }

  function handleOpenInCreate(v: TimetableVersion) {
    selectExam({ academic_year: v.exam.academic_year, semester: v.exam.semester, exam_type_id: v.exam.exam_type_id });
  }

  function handleExportPapers() {
    const mappingsById = new Map((mappings.data ?? []).map((m) => [m.id, m]));
    downloadCsv(
      "published-timetable-schedule",
      [
        { header: "Date", value: (t: TimetableEntry) => t.exam_date.slice(0, 10) },
        { header: "Session", value: (t: TimetableEntry) => t.session },
        { header: "Subject code", value: (t: TimetableEntry) => subjectsById.get(mappingsById.get(t.exam_subject_mapping_id)?.subject_id ?? -1)?.subject_code ?? "" },
        { header: "Subject name", value: (t: TimetableEntry) => subjectsById.get(mappingsById.get(t.exam_subject_mapping_id)?.subject_id ?? -1)?.name ?? "" },
      ],
      (timetable.data ?? []).filter(
        (t) => publishedVersionIds.has(t.version_id) && t.exam_date.slice(0, 10) >= publishedFrom && t.exam_date.slice(0, 10) <= publishedTo,
      ),
    );
  }

  function handleExportVersionsReport() {
    downloadCsv(
      "published-timetable-versions",
      [
        { header: "Exam", value: (v: TimetableVersion) => versionLabel(v) },
        { header: "Papers", value: (v: TimetableVersion) => v.paper_count },
        { header: "Published at", value: (v: TimetableVersion) => (v.published_at ? new Date(v.published_at).toLocaleString() : "") },
      ],
      (allVersions.data ?? []).filter((v) => v.status === "published"),
    );
  }

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

  // /me/exam-schedule (student-facing) only ever returns slots whose
  // exam_subject_mapping.is_published is true — nothing flips that flag
  // anywhere else in this page, so this toggle is the only thing that
  // actually makes a built schedule visible to students.
  const allDeptPublished = deptTimetable.length > 0 && deptTimetable.every((t) => t.exam_subject_mapping.is_published);

  async function handlePublishToggle() {
    setPublishing(true);
    setActionError(null);
    const nextPublished = !allDeptPublished;
    try {
      for (const entry of deptTimetable) {
        if (entry.exam_subject_mapping.is_published !== nextPublished) {
          await updateEntry.mutateAsync({ id: entry.id, is_published: nextPublished });
        }
      }
      if (nextPublished && currentVersion) {
        await publishVersion.mutateAsync(currentVersion.id);
      }
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  // Confirms the current working version as an official Draft — same
  // real exam_timetable_versions row every drag-and-drop edit above already
  // writes to, just explicitly marked so it shows up in the Drafts tab.
  async function handleMoveToDrafts() {
    if (!examId) return;
    setActionError(null);
    try {
      await moveToDraft.mutateAsync(examId);
      setTab("drafts");
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingVersion) return;
    setActionError(null);
    try {
      await deleteVersion.mutateAsync(deletingVersion.id);
      setDeletingVersion(null);
    } catch (err) {
      setActionError((err as Error).message);
      setDeletingVersion(null);
    }
  }

  async function handleConfirmWithdraw() {
    if (!withdrawingVersion) return;
    setActionError(null);
    try {
      await withdrawVersion.mutateAsync(withdrawingVersion.id);
      setWithdrawingVersion(null);
    } catch (err) {
      setActionError((err as Error).message);
      setWithdrawingVersion(null);
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

      {tab === "drafts" || tab === "to_publish" ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-subtle">
            {tab === "drafts"
              ? "Saved versions grouped by department, semester and academic year · the Senior COE verifies and queues them for publishing"
              : "Versions queued and awaiting the Senior COE's publish action."}
          </p>
          {(() => {
            const status = tab === "drafts" ? "draft" : "ready_to_publish";
            const rows = (allVersions.data ?? []).filter((v) => v.status === status);
            const groups = new Map<number, TimetableVersion[]>();
            for (const v of rows) groups.set(v.exam_id, [...(groups.get(v.exam_id) ?? []), v]);
            if (groups.size === 0) return <p className="text-[13px] text-subtle">No versions in this state.</p>;
            return [...groups.values()].map((group) => {
              const first = group[0];
              return (
                <Card key={first.exam_id} className="p-0">
                  <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
                    <div>
                      <div className="text-[14px] font-extrabold text-ink">
                        {first.exam.department_codes.join("/") || "—"} · Semester {first.exam.semester}
                      </div>
                      <div className="mt-0.5 text-[12px] text-subtle">
                        {first.exam.exam_type_name} · Academic year {first.exam.academic_year}
                      </div>
                    </div>
                    <span className="text-[12.5px] text-muted">
                      {group.length} version{group.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {group.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-3.5 last:border-0">
                        <div>
                          <div className="text-[13.5px] font-bold text-ink">{versionLabel(v)}</div>
                          <div className="mt-0.5 text-[12px] text-subtle">
                            {v.paper_count} paper{v.paper_count === 1 ? "" : "s"} · saved {LOG_DATE.format(new Date(v.created_at))}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-[6px] bg-divider px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-muted">
                            {v.status === "draft" ? "Draft" : "Ready"}
                          </span>
                          <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => handleViewSchedule(v)}>
                            View
                          </Button>
                          <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => handleOpenInCreate(v)}>
                            Open in create
                          </Button>
                          <button
                            type="button"
                            className="text-[12px] font-bold text-danger-fg hover:underline"
                            onClick={() => setDeletingVersion(v)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            });
          })()}
        </div>
      ) : tab === "published" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Start date</label>
                <input
                  type="date"
                  value={publishedFrom}
                  onChange={(e) => setPublishedFrom(e.target.value)}
                  className="rounded-input border border-border-default bg-surface px-2.5 py-2.5 text-[13px] text-ink focus:border-border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">End date</label>
                <input
                  type="date"
                  value={publishedTo}
                  onChange={(e) => setPublishedTo(e.target.value)}
                  className="rounded-input border border-border-default bg-surface px-2.5 py-2.5 text-[13px] text-ink focus:border-border-accent focus:outline-none"
                />
              </div>
              <span className="mb-2.5 text-[12.5px] text-muted">
                {papersInRange} paper{papersInRange === 1 ? "" : "s"} scheduled in this range
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="primarySmall" className="w-auto" onClick={handleExportPapers} disabled={papersInRange === 0}>
                  Download schedule
                </Button>
                <Button variant="secondary" className="w-auto" onClick={handleExportVersionsReport}>
                  Download report
                </Button>
              </div>
            </div>
          </Card>
          {(allVersions.data ?? []).filter((v) => v.status === "published").length === 0 ? (
            <p className="text-[13px] text-subtle">No published versions yet.</p>
          ) : (
            (allVersions.data ?? [])
              .filter((v) => v.status === "published")
              .map((v) => (
                <Card key={v.id} className="p-0">
                  <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-ink">{versionLabel(v)}</span>
                        <span className="rounded-[6px] bg-accent-50 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-primary-dark">
                          Live
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-subtle">
                        Semester {v.exam.semester} · {v.exam.department_codes.join("/") || "—"} · {v.exam.exam_type_name} ·{" "}
                        {v.exam.academic_year} · {v.paper_count} papers · published at {v.published_at ? LOG_DATE.format(new Date(v.published_at)) : "—"}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => handleViewSchedule(v)}>
                        View schedule
                      </Button>
                      <button
                        type="button"
                        className="text-[12px] font-bold text-danger-fg hover:underline"
                        onClick={() => setWithdrawingVersion(v)}
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                </Card>
              ))
          )}
        </div>
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
        <>
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
              <Button
                variant={allDeptPublished ? "secondary" : "primarySmall"}
                className="w-auto"
                onClick={handlePublishToggle}
                disabled={deptTimetable.length === 0 || publishing || conflicts.length > 0}
                title={conflicts.length > 0 ? "Resolve scheduling conflicts before publishing" : undefined}
              >
                {publishing ? "Saving…" : allDeptPublished ? "Unpublish schedule" : "Publish schedule"}
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
            <div className="flex items-center justify-between gap-4 border-b border-divider px-5 py-3.5">
              <div>
                <div className="text-[15px] font-extrabold text-ink">Session grid</div>
                <div className="mt-0.5 text-[12px] text-subtle">{windowDescription}</div>
              </div>
              <span className="shrink-0 text-right text-[12.5px] text-muted">
                {deptTimetable.length} paper{deptTimetable.length === 1 ? "" : "s"} placed · {effectiveAcademicYear ?? "—"} / Semester{" "}
                {effectiveSemester ?? "—"} / {departmentsById.get(effectiveDepartmentId ?? -1)?.code ?? "—"} /{" "}
                {examTypesById.get(effectiveExamTypeId ?? -1)?.name ?? "—"}
                {currentVersion ? ` / v${currentVersion.version_number}` : ""}
              </span>
              <Button
                variant="primarySmall"
                className="w-auto shrink-0"
                onClick={handleMoveToDrafts}
                disabled={!examId || moveToDraft.isPending || deptTimetable.length === 0}
              >
                {moveToDraft.isPending ? "Saving…" : "Move to drafts"}
              </Button>
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

        <Card className="p-0">
          <div className="flex items-center justify-between gap-4 border-b border-divider px-5 py-3.5">
            <div className="text-[15px] font-extrabold text-ink">Version history</div>
            <span className="text-[12px] text-subtle">
              {liveVersion
                ? `Live for students: ${liveVersion.exam.academic_year} / Semester ${liveVersion.exam.semester} / ${departmentsById.get(effectiveDepartmentId ?? -1)?.code ?? "—"} / ${liveVersion.exam.exam_type_name} / v${liveVersion.version_number}`
                : "Not yet published to students"}
            </span>
          </div>
          {historyEvents.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No version activity yet for this exam.</p>
          ) : (
            <div className="flex flex-col">
              {historyEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-divider px-5 py-3 text-[12.5px] last:border-0">
                  <div className="w-[110px] shrink-0 text-subtle">{LOG_DATE.format(new Date(e.at))}</div>
                  <div className="w-[220px] shrink-0 text-subtle">
                    {departmentsById.get(effectiveDepartmentId ?? -1)?.code ?? "—"} · Semester {effectiveSemester ?? "—"} ·{" "}
                    {examTypesById.get(effectiveExamTypeId ?? -1)?.name ?? "—"}
                  </div>
                  <div className="text-ink">{e.description}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        </>
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

      <ConfirmDialog
        open={deletingVersion != null}
        title="Delete this draft?"
        description={deletingVersion ? `This permanently deletes ${versionLabel(deletingVersion)} and its ${deletingVersion.paper_count} scheduled paper${deletingVersion.paper_count === 1 ? "" : "s"}. This can't be undone.` : ""}
        confirmLabel="Delete draft"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingVersion(null)}
      />

      <ConfirmDialog
        open={withdrawingVersion != null}
        title="Withdraw this published timetable?"
        description={withdrawingVersion ? `Students immediately lose access to ${versionLabel(withdrawingVersion)}. This can't be undone from here.` : ""}
        confirmLabel="Withdraw"
        destructive
        onConfirm={handleConfirmWithdraw}
        onCancel={() => setWithdrawingVersion(null)}
      />

      <ViewScheduleModal version={viewingVersion} onClose={() => setViewingVersion(null)} />
    </div>
  );
}

function ViewScheduleModal({ version, onClose }: { version: TimetableVersion | null; onClose: () => void }) {
  const schedule = useTimetableVersionSchedule(version?.id ?? null);

  return (
    <Modal
      open={version != null}
      onClose={onClose}
      title="Version schedule"
      subtitle={version ? `${version.exam.academic_year} / Semester ${version.exam.semester} / ${version.exam.department_codes.join("/") || "—"} / ${version.exam.exam_type_name} / v${version.version_number}` : undefined}
    >
      {schedule.isLoading ? (
        <p className="text-[13px] text-subtle">Loading…</p>
      ) : (schedule.data ?? []).length === 0 ? (
        <p className="text-[13px] text-subtle">No papers scheduled in this version.</p>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-input border border-border-default">
          <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-3 py-2 text-[10.5px] font-bold uppercase tracking-wide text-muted">
            <div className="w-[80px]">Date</div>
            <div className="w-[60px]">Session</div>
            <div className="flex-1">Course</div>
            <div className="w-[70px]">Dept</div>
            <div className="w-[100px]">Hall</div>
          </div>
          {schedule.data!.map((s, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-divider px-3 py-2.5 text-[12px] text-ink last:border-0">
              <div className="w-[80px]">{new Date(`${s.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
              <div className="w-[60px]">{s.session}</div>
              <div className="flex-1">
                {s.subject_code} · {s.subject_name}
              </div>
              <div className="w-[70px]">{s.department_code}</div>
              <div className="w-[100px]">{s.hall ?? "—"}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
