"use client";

import { useMemo, useState } from "react";
import { Card, Button, Badge, Toggle, Icon, Modal, ConfirmDialog, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonFilterBar, SkeletonRows, SkeletonBlock } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useExamTypes } from "@/modules/coe/api/reference";
import { useDepartments } from "@/modules/shared/api/departments";
import type { ExamSessionCode } from "@/modules/coe/api/shared";
import { useExamTimetableVersions } from "@/modules/coe/api/examTimetableVersions";
import { useExamTimetable } from "@/modules/coe/api/timetable";
import {
  useSeatingOverview,
  useVenueDetail,
  useConfigureVenue,
  useAllocateAutomatic,
  useAllocateManual,
  useClearVenue,
  useSeatingVersions,
  useSubmitSeatingVersion,
  usePublishSeatingVersion,
  useDeleteSeatingVersion,
  useSeatingVersionDetail,
  type SeatingPattern,
  type SeatingVersionStatus,
  type SeatingVersion,
} from "@/modules/coe/api/seatingPlans";
import { todayDateOnly } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { downloadCsv } from "@/lib/utils/csv";
import { exportToPdf } from "@/lib/utils/pdf-export";

const YEAR_LABELS = ["First year", "Second year", "Third year", "Fourth year"];
function yearLabelForSemester(semester: number): string {
  return YEAR_LABELS[Math.ceil(semester / 2) - 1] ?? `Year ${Math.ceil(semester / 2)}`;
}

// Mirrors seating-plans.service.ts's ROW_LENGTH/rowLabelFor/seatLabelFor
// exactly, so a position in the grid below resolves to the same label the
// backend assigned it — seats come back sorted by label text (not by grid
// position), so a plain array-index lookup would misplace them.
const SEAT_ROW_LENGTH = 8;
function seatRowLabelFor(index: number): string {
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}
function seatLabelForPosition(pos: number): string {
  const row = Math.floor(pos / SEAT_ROW_LENGTH);
  const col = pos % SEAT_ROW_LENGTH;
  return `${seatRowLabelFor(row)}${col + 1}`;
}

const PATTERNS: { key: SeatingPattern; label: string; hint: string }[] = [
  { key: "sequential", label: "Sequential", hint: "Register order, department by department" },
  { key: "alternate_seat", label: "Alternate seat", hint: "One seat left empty between candidates" },
  { key: "rowwise_mixed", label: "Row-wise mixed", hint: "Departments alternate row by row" },
  { key: "columnwise_mixed", label: "Column-wise mixed", hint: "Departments alternate column by column" },
  { key: "checkerboard", label: "Checkerboard", hint: "No two candidates of one department sit adjacent" },
  { key: "snake_order", label: "Snake order", hint: "Every second row runs in reverse, staggering departments" },
];

const VERSION_TABS: { key: SeatingVersionStatus; label: string }[] = [
  { key: "draft", label: "Drafts" },
  { key: "ready_to_publish", label: "To publish" },
  { key: "published", label: "Published" },
];

const STATUS_BADGE: Record<SeatingVersionStatus, BadgeTone> = {
  draft: "neutral",
  ready_to_publish: "accent",
  published: "accentDark",
  superseded: "neutral",
  withdrawn: "danger",
};

export default function CoeHallsSeatingPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const departments = useDepartments();

  const [tab, setTab] = useState<"allocate" | "draft" | "ready_to_publish" | "published">("allocate");
  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [semesterFilter, setSemesterFilter] = useState<number | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState<number | "all">("all");
  const [examDate, setExamDate] = useState(todayDateOnly());
  const [session, setSession] = useState<ExamSessionCode | "any">("any");
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [manualEntries, setManualEntries] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [carriedForward, setCarriedForward] = useState<number | null>(null);
  const [notFoundEntries, setNotFoundEntries] = useState<string[]>([]);

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);
  const effectiveExamTypeId = examTypeId ?? examTypes.data?.[0]?.id ?? null;

  const academicYears = useMemo(() => [...new Set((exams.data ?? []).map((e) => e.academic_year))].sort().reverse(), [exams.data]);
  const currentAcademicYear = academicYears[0] ?? null;

  // Fetched unscoped (no exam_id) so it can help disambiguate BEFORE an
  // exam is resolved, not just describe one after the fact — see below.
  const allTimetableVersions = useExamTimetableVersions();
  const publishedTimetableExamIds = useMemo(
    () => new Set((allTimetableVersions.data ?? []).filter((v) => v.status === "published").map((v) => v.exam_id)),
    [allTimetableVersions.data],
  );

  // Resolves one concrete exam_id — seating_plan_versions is keyed to a
  // single exam. More than one exam can legitimately share the same
  // academic year/type/semester (e.g. two batches both currently in
  // semester 7), and `exams.findMany()` has no guaranteed row order, so
  // picking "the highest id" or "the first match" is not reliable. Instead,
  // among tied candidates, prefer whichever one actually has a published
  // exam timetable — that's the one with real papers/hall-plans to seat.
  const resolvedExam = useMemo(() => {
    const candidates = (exams.data ?? [])
      .filter((e) => e.academic_year === currentAcademicYear && e.exam_type_id === effectiveExamTypeId)
      .filter((e) => yearFilter === "all" || Math.ceil(e.semester / 2) === yearFilter);
    const bySemester = semesterFilter === "all" ? candidates : candidates.filter((e) => e.semester === semesterFilter);
    const pool = bySemester.length > 0 ? bySemester : candidates;
    const published = pool.filter((e) => publishedTimetableExamIds.has(e.id));
    const finalPool = published.length > 0 ? published : pool;
    return [...finalPool].sort((a, b) => b.id - a.id)[0] ?? null;
  }, [exams.data, currentAcademicYear, effectiveExamTypeId, yearFilter, semesterFilter, publishedTimetableExamIds]);
  const effectiveExamId = resolvedExam?.id ?? null;

  const allSemesterOptions = useMemo(
    () => [...new Set((exams.data ?? []).filter((e) => e.academic_year === currentAcademicYear && e.exam_type_id === effectiveExamTypeId).map((e) => e.semester))].sort((a, b) => a - b),
    [exams.data, currentAcademicYear, effectiveExamTypeId],
  );
  const yearOptions = useMemo(() => [...new Set(allSemesterOptions.map((s) => Math.ceil(s / 2)))].sort((a, b) => a - b), [allSemesterOptions]);
  const semesterOptions = useMemo(
    () => (yearFilter === "all" ? allSemesterOptions : allSemesterOptions.filter((s) => Math.ceil(s / 2) === yearFilter)),
    [allSemesterOptions, yearFilter],
  );

  // "Any session" has no real backend meaning (seating_plan_versions is
  // always keyed to one concrete FN/AN session) — it's a real filter default
  // for display, but every actual query needs one concrete session, so it
  // falls back to FN until the COE explicitly narrows to FN or AN.
  const effectiveSession: ExamSessionCode = session === "any" ? "FN" : session;

  const overview = useSeatingOverview({ exam_id: effectiveExamId, exam_date: examDate, session: effectiveSession });
  const configureVenue = useConfigureVenue();
  const allocateAutomatic = useAllocateAutomatic();
  const allocateManual = useAllocateManual();
  const clearVenue = useClearVenue();

  // Real published exam-timetable version this seating session maps to —
  // same exam_timetable_versions rows the Timetables page's Published tab
  // shows, cross-referenced here instead of re-deriving a separate summary.
  const timetableEntries = useExamTimetable();
  const publishedTimetableVersion = useMemo(
    () => (allTimetableVersions.data ?? []).find((v) => v.exam_id === effectiveExamId && v.status === "published") ?? null,
    [allTimetableVersions.data, effectiveExamId],
  );
  const mappedTimetableEntries = useMemo(
    () => (publishedTimetableVersion ? (timetableEntries.data ?? []).filter((t) => t.version_id === publishedTimetableVersion.id) : []),
    [timetableEntries.data, publishedTimetableVersion],
  );
  const mappedPaperCount = useMemo(() => new Set(mappedTimetableEntries.map((t) => t.exam_subject_mapping_id)).size, [mappedTimetableEntries]);
  const mappedExamDays = useMemo(() => [...new Set(mappedTimetableEntries.map((t) => t.exam_date.slice(0, 10)))].sort(), [mappedTimetableEntries]);

  const targetVenueParams = selectedVenueId && effectiveExamId ? { exam_id: effectiveExamId, exam_date: examDate, session: effectiveSession, venue_id: selectedVenueId } : null;
  const venueDetail = useVenueDetail(targetVenueParams);

  const draftVersions = useSeatingVersions("draft");
  const toPublishVersions = useSeatingVersions("ready_to_publish");
  const publishedVersions = useSeatingVersions("published");
  const versionCounts: Record<SeatingVersionStatus, number> = {
    draft: draftVersions.data?.length ?? 0,
    ready_to_publish: toPublishVersions.data?.length ?? 0,
    published: publishedVersions.data?.length ?? 0,
    superseded: 0,
    withdrawn: 0,
  };

  // A venue with no departments configured yet hasn't been restricted to
  // exclude the filtered department — it just hasn't been set up. Hiding it
  // here would make a freshly-mapped hall plan invisible until someone
  // happens to switch back to "All departments" to configure it first.
  const visibleVenues = useMemo(() => {
    const list = overview.data?.venues ?? [];
    if (departmentFilter === "all") return list;
    return list.filter((v) => v.departments.length === 0 || v.departments.some((d) => d.id === departmentFilter));
  }, [overview.data, departmentFilter]);

  function runMutation(fn: () => void) {
    setActionError(null);
    fn();
  }

  function handleToggleDepartment(deptId: number) {
    if (!targetVenueParams || !venueDetail.data) return;
    const current = venueDetail.data.departments.map((d) => d.id);
    const next = current.includes(deptId) ? current.filter((id) => id !== deptId) : [...current, deptId];
    runMutation(() =>
      configureVenue.mutate(
        { ...targetVenueParams, department_ids: next },
        { onError: (err) => setActionError((err as Error).message) },
      ),
    );
  }

  function handleSetMode(mode: "automatic" | "manual") {
    if (!targetVenueParams) return;
    runMutation(() => configureVenue.mutate({ ...targetVenueParams, allocation_mode: mode }, { onError: (err) => setActionError((err as Error).message) }));
  }

  function handleSetPattern(pattern: SeatingPattern) {
    if (!targetVenueParams) return;
    runMutation(() => configureVenue.mutate({ ...targetVenueParams, pattern }, { onError: (err) => setActionError((err as Error).message) }));
  }

  function handleAllocateAutomatic() {
    if (!targetVenueParams) return;
    setCarriedForward(null);
    runMutation(() =>
      allocateAutomatic.mutate(targetVenueParams, {
        onSuccess: (result) => setCarriedForward(result.carried_forward),
        onError: (err) => setActionError((err as Error).message),
      }),
    );
  }

  function handlePlaceManual() {
    if (!targetVenueParams) return;
    const entries = manualEntries
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (entries.length === 0) return;
    setCarriedForward(null);
    setNotFoundEntries([]);
    runMutation(() =>
      allocateManual.mutate(
        { ...targetVenueParams, entries },
        {
          onSuccess: (result) => {
            setManualEntries("");
            setCarriedForward(result.carried_forward);
            setNotFoundEntries(result.not_found);
          },
          onError: (err) => setActionError((err as Error).message),
        },
      ),
    );
  }

  function handleSelectVenue(venueId: number) {
    setSelectedVenueId(venueId);
    setCarriedForward(null);
    setNotFoundEntries([]);
    setActionError(null);
  }

  function handleClearFilters() {
    setExamTypeId(null);
    setYearFilter("all");
    setSemesterFilter("all");
    setDepartmentFilter("all");
    setExamDate(todayDateOnly());
    setSession("any");
    setSelectedVenueId(null);
    setCarriedForward(null);
    setNotFoundEntries([]);
  }

  // "Edit" from Drafts/To-publish — restores the Allocate tab's filters to
  // the exact exam/date/session that draft belongs to, so getOrCreateDraftVersion
  // resolves back onto this same version instead of creating a new one.
  function handleOpenInCreate(v: { exam_id: number; exam_date: string; session: ExamSessionCode }) {
    const exam = (exams.data ?? []).find((e) => e.id === v.exam_id);
    if (exam) {
      setExamTypeId(exam.exam_type_id);
      setYearFilter("all");
      setSemesterFilter(exam.semester);
    }
    setExamDate(v.exam_date.slice(0, 10));
    setSession(v.session);
    setSelectedVenueId(null);
    setTab("allocate");
  }

  function handleClearRoom() {
    if (!targetVenueParams) return;
    runMutation(() => clearVenue.mutate(targetVenueParams, { onError: (err) => setActionError((err as Error).message) }));
  }

  const manualEntryCount = useMemo(() => manualEntries.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length, [manualEntries]);

  const selectedVenue = overview.data?.venues.find((v) => v.venue_id === selectedVenueId) ?? null;
  const filtersLoading = exams.isLoading || examTypes.isLoading || departments.isLoading;
  const seatsByLabel = useMemo(() => new Map((venueDetail.data?.seats ?? []).map((s) => [s.seat_number, s])), [venueDetail.data]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Halls & seat allocation" subtitle="Buildings, blocks, rooms, alternate and mixed seating" />

      <div className="flex items-center gap-6 border-b border-divider">
        {[
          { key: "allocate" as const, label: "Allocate", count: null as number | null },
          ...VERSION_TABS.map((t) => ({ key: t.key as typeof tab, label: t.label, count: versionCounts[t.key] })),
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "border-b-2 pb-3 text-[14px] font-bold transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 text-[12px] font-semibold text-subtle">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab !== "allocate" ? (
        <VersionsList status={tab} onOpenInCreate={handleOpenInCreate} />
      ) : filtersLoading ? (
        <SkeletonFilterBar />
      ) : (
        <>
          <Card className="border-border-accent bg-accent-50">
            <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-primary">Planning seating for</div>
            <div className="mt-1 text-[15px] font-extrabold text-ink">
              {examTypeId != null ? examTypesById.get(examTypeId)?.name ?? "Exam" : "No examination selected"} ·{" "}
              {semesterFilter === "all" ? "All semesters" : `Semester ${semesterFilter}`} ·{" "}
              {departmentFilter === "all" ? "All departments" : departments.data?.find((d) => d.id === departmentFilter)?.code ?? "—"}
            </div>
            <div className="mt-0.5 text-[12.5px] text-primary-dark">
              {examDate || "No exam date selected"} · {session === "any" ? "any session" : `${session} session`}
              {selectedVenue ? ` · ${selectedVenue.name}` : " · no venue selected"}
            </div>
            {selectedVenue && (
              <span className="mt-2 inline-block rounded-pill border border-border-accent bg-surface px-3 py-1 text-[12px] font-bold text-primary">
                {resolvedExam ? yearLabelForSemester(resolvedExam.semester) : "—"} (from selected venue)
              </span>
            )}
            {(overview.data || publishedTimetableVersion) && (
              <div className="mt-2.5 border-t border-border-accent pt-2.5 text-[12.5px] text-primary-dark">
                {publishedTimetableVersion ? (
                  <>
                    Mapped to {publishedTimetableVersion.exam.academic_year} / Semester {publishedTimetableVersion.exam.semester} /{" "}
                    {publishedTimetableVersion.exam.department_codes.join("/") || "—"} / {publishedTimetableVersion.exam.exam_type_name} / v
                    {publishedTimetableVersion.version_number} · {mappedPaperCount} paper{mappedPaperCount === 1 ? "" : "s"} across{" "}
                    {mappedExamDays.length} exam day{mappedExamDays.length === 1 ? "" : "s"}
                    {mappedExamDays.length > 0 && ` (${mappedExamDays[0]} to ${mappedExamDays[mappedExamDays.length - 1]})`}
                  </>
                ) : (
                  "No published exam timetable is mapped to this examination yet — publish one on Timetables first."
                )}
                {overview.data && (
                  <>
                    {" "}
                    · {overview.data.venues.length} venues · {overview.data.total_seated} of {overview.data.total_seats} seats filled
                  </>
                )}
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[13px] font-bold text-subtle">Examination</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(examTypes.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setExamTypeId(t.id);
                    setSemesterFilter("all");
                    setSelectedVenueId(null);
                  }}
                  className={cn(
                    "rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors",
                    effectiveExamTypeId === t.id ? "border-primary bg-accent-50 text-primary" : "border-border-default text-muted hover:text-ink",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-subtle">Pick the examination this seating is for — it is stamped on the allocation and drives invigilator grouping.</p>
          </Card>

          <Card>
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1.7fr] gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Exam date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => {
                    setExamDate(e.target.value);
                    setSelectedVenueId(null);
                  }}
                  className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
                >
                  <option value="all">All departments</option>
                  {(departments.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} · {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                    setSemesterFilter("all");
                    setSelectedVenueId(null);
                  }}
                  className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
                >
                  <option value="all">All years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {yearLabelForSemester(y * 2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Semester</label>
                <select
                  value={semesterFilter}
                  onChange={(e) => {
                    setSemesterFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                    setSelectedVenueId(null);
                  }}
                  className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
                >
                  <option value="all">All semesters</option>
                  {semesterOptions.map((s) => (
                    <option key={s} value={s}>
                      Semester {s} · {yearLabelForSemester(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-ink">Session</label>
                <div className="flex gap-2">
                  {(["any", "FN", "AN"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSession(s);
                        setSelectedVenueId(null);
                      }}
                      className={cn(
                        "shrink-0 rounded-pill border px-3 py-2 text-center text-[12px] font-bold leading-tight transition-colors",
                        session === s ? "border-primary bg-accent-50 text-primary" : "border-border-default text-muted hover:text-ink",
                      )}
                    >
                      {s === "any" ? "Any session" : s === "FN" ? "FN 10:00–13:00" : "AN 14:00–17:00"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-subtle">Pick an exam date and session — the venue list is then mapped to the papers scheduled that day for the ticked departments and semesters.</p>
          </Card>

          {overview.isLoading ? (
            <SkeletonBlock />
          ) : overview.isError ? (
            <Card className="border-danger-border bg-danger-bg">
              <p className="text-[13px] text-danger-fg">{(overview.error as Error).message}</p>
            </Card>
          ) : !overview.data ? (
            <Card>
              <p className="text-[13px] text-subtle">Select an examination to begin.</p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between text-[13px] text-muted">
                <span>
                  {visibleVenues.length} venues · {visibleVenues.reduce((s, v) => s + v.capacity, 0)} seats available
                </span>
                <button type="button" onClick={handleClearFilters} className="text-[12.5px] font-bold text-primary hover:underline">
                  Clear filters
                </button>
              </div>

              <div className="grid grid-cols-[1fr_1.8fr] gap-4 items-start">
                <Card className="p-0">
                  <div className="border-b border-divider px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-subtle">Venues</div>
                  {visibleVenues.length === 0 ? (
                    <p className="px-5 py-6 text-[13px] text-subtle">No hall plans for this exam/date — add one on Timetables first.</p>
                  ) : (
                    <div className="flex flex-col">
                      {visibleVenues.map((v) => (
                        <button
                          key={v.venue_id}
                          type="button"
                          onClick={() => handleSelectVenue(v.venue_id)}
                          className={cn(
                            "flex items-center justify-between gap-2 border-b border-divider px-5 py-3.5 text-left last:border-0 hover:bg-nav-hover",
                            selectedVenueId === v.venue_id && "bg-accent-50",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="text-[13.5px] font-bold text-ink">{v.name}</div>
                            <div className="mt-0.5 truncate text-[12px] text-muted">
                              {v.location ? `${v.location} · ` : ""}capacity {v.capacity}
                              {v.departments.length > 0 ? ` · ${v.departments.map((d) => d.code).join("/")}` : ""}
                            </div>
                          </div>
                          <span className="shrink-0 text-[12.5px] font-bold text-ink">
                            {v.seated}/{v.capacity}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                {!selectedVenueId ? (
                  <Card>
                    <p className="text-[13px] text-subtle">Select a venue on the left to configure its seating.</p>
                  </Card>
                ) : venueDetail.isLoading ? (
                  <SkeletonBlock />
                ) : venueDetail.isError ? (
                  <Card className="border-danger-border bg-danger-bg">
                    <p className="text-[13px] text-danger-fg">{(venueDetail.error as Error).message}</p>
                  </Card>
                ) : venueDetail.data ? (
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-subtle">Venue</div>
                        <div className="mt-0.5 text-[16px] font-extrabold text-ink">{venueDetail.data.venue.name}</div>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          {venueDetail.data.venue.location ? `${venueDetail.data.venue.location} · ` : ""}capacity {venueDetail.data.venue.capacity}
                          {resolvedExam ? ` · Semester ${resolvedExam.semester}` : ""}
                          {` · ${effectiveSession} ${effectiveSession === "FN" ? "10:00–13:00" : "14:00–17:00"}`}
                          {resolvedExam ? ` · ${currentAcademicYear} ${examTypesById.get(effectiveExamTypeId ?? -1)?.name ?? ""}` : ""}
                        </div>
                      </div>
                      {/* Reflects the real seating_plan_versions.status — every editable
                          version here is either 'draft' or 'ready_to_publish' (getOrCreateDraftVersion
                          always resolves to one of those two), so this is never stale. */}
                      <Badge tone={venueDetail.data.version.status === "ready_to_publish" ? "accent" : "neutral"}>
                        {venueDetail.data.version.status === "ready_to_publish" ? "SUBMITTED" : "DRAFT NOT SAVED"}
                      </Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button variant={venueDetail.data.allocation_mode !== "manual" ? "primarySmall" : "secondary"} onClick={() => handleSetMode("automatic")}>
                        Automatic allocation
                      </Button>
                      <Button variant={venueDetail.data.allocation_mode === "manual" ? "primarySmall" : "secondary"} className="w-auto" onClick={() => handleSetMode("manual")}>
                        Manual roll numbers
                      </Button>
                    </div>

                    {venueDetail.data.allocation_mode !== "manual" ? (
                      <>
                        <div className="mt-4 grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-subtle">Departments allowed in this venue</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(departments.data ?? []).map((d) => {
                                const checked = venueDetail.data!.departments.some((vd) => vd.id === d.id);
                                return (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => handleToggleDepartment(d.id)}
                                    className={cn(
                                      "flex items-center gap-2 rounded-[8px] border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
                                      checked ? "border-primary bg-accent-50 text-primary" : "border-border-default text-muted hover:text-ink",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                                        checked ? "border-primary bg-primary" : "border-border-default bg-surface",
                                      )}
                                    >
                                      {checked && <Icon name="check" size={12} className="text-white" />}
                                    </span>
                                    {d.code}
                                  </button>
                                );
                              })}
                            </div>

                            {venueDetail.data.department_breakdown.length === 0 ? (
                              <p className="mt-4 rounded-[8px] border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#92400e]">
                                This room is empty — tick a department above to seat candidates here.
                              </p>
                            ) : (
                              <div className="mt-4 flex flex-col gap-2">
                                {venueDetail.data.department_breakdown.map((d) => (
                                  <div key={d.id} className="flex items-center justify-between rounded-[10px] bg-surface-tint px-3.5 py-2.5">
                                    <span className="text-[12.5px] font-bold text-ink">{d.code}</span>
                                    <span className="text-[12.5px] text-ink">
                                      {d.seated_here} of {d.pool_at_this_venue} seated
                                    </span>
                                    <span className="text-[12px] font-semibold text-danger-fg">{d.carried_forward > 0 ? `${d.carried_forward} carried forward` : ""}</span>
                                  </div>
                                ))}
                                {venueDetail.data.department_breakdown.every((d) => d.carried_forward === 0) &&
                                  venueDetail.data.department_breakdown.some((d) => d.seated_here > 0) && (
                                    <p className="rounded-[8px] border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[12px] font-semibold text-[#15803d]">
                                      Every candidate of the ticked departments is seated in this venue.
                                    </p>
                                  )}
                              </div>
                            )}

                            <div className="mt-4 flex items-center justify-between">
                              <div>
                                <div className="text-[13px] font-bold text-ink">Special accommodations</div>
                                <div className="text-[12px] text-subtle">Ground floor, scribe and extra-time seats</div>
                              </div>
                              <Toggle checked={false} onChange={() => {}} disabled />
                            </div>

                            {/* No per-venue setting backs this — every venue here is already
                                filled in the same building/block/floor/capacity order the
                                venue list is sorted in, so this just names that real behavior
                                rather than a separate config nothing reads. */}
                            <div className="mt-3 flex items-center justify-between">
                              <div>
                                <div className="text-[13px] font-bold text-ink">Automatic room assignment</div>
                                <div className="text-[12px] text-subtle">Fill by building, block, floor and capacity</div>
                              </div>
                              <Toggle checked={true} onChange={() => {}} disabled />
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-subtle">Seating pattern</div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {PATTERNS.map((p) => (
                                <button
                                  key={p.key}
                                  type="button"
                                  onClick={() => handleSetPattern(p.key)}
                                  className={cn(
                                    "rounded-[10px] border px-3.5 py-2.5 text-left transition-colors",
                                    venueDetail.data!.pattern === p.key ? "border-primary bg-accent-50" : "border-border-default hover:bg-nav-hover",
                                  )}
                                >
                                  <div className="text-[13px] font-extrabold text-ink">{p.label}</div>
                                  <div className="mt-0.5 text-[11.5px] text-muted">{p.hint}</div>
                                </button>
                              ))}
                            </div>
                            {venueDetail.data.departments.length < 2 && (
                              <p className="mt-2 rounded-[8px] bg-accent-50 px-3 py-2 text-[12px] text-primary">Tick a second department to see this pattern take effect.</p>
                            )}

                            {carriedForward !== null && carriedForward > 0 && (
                              <p className="mt-3 rounded-[8px] border border-danger-border bg-danger-bg px-3 py-2 text-[12px] text-danger-fg">
                                {carriedForward} candidate{carriedForward === 1 ? "" : "s"} could not be seated here — they stay in the pool
                                and fill the next venue you allocate automatically.
                              </p>
                            )}

                            <div className="mt-4 flex items-center gap-2">
                              <Button variant="primarySmall" disabled={allocateAutomatic.isPending} onClick={handleAllocateAutomatic}>
                                {allocateAutomatic.isPending ? "Allocating…" : "Allocate automatically"}
                              </Button>
                              <Button variant="secondary" className="w-auto" disabled={clearVenue.isPending} onClick={handleClearRoom}>
                                {clearVenue.isPending ? "Clearing…" : "Clear room"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 grid grid-cols-[1fr_180px] gap-4">
                        <div>
                          <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-subtle">Register numbers</div>
                          <p className="mt-1 text-[12px] text-subtle">Departments are ignored here. Type single numbers or a range — 22IT101-22IT130 expands to the whole class.</p>
                          <textarea
                            value={manualEntries}
                            onChange={(e) => setManualEntries(e.target.value)}
                            rows={4}
                            placeholder="22IT101-22IT130, 22CS114, 22EC118"
                            className="mt-2 w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
                          />
                          <div className="mt-1 text-[11.5px] text-subtle">{manualEntryCount} register number{manualEntryCount === 1 ? "" : "s"} entered</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Button variant="primarySmall" disabled={allocateManual.isPending || !manualEntries.trim()} onClick={handlePlaceManual}>
                              {allocateManual.isPending ? "Placing…" : "Place remaining"}
                            </Button>
                            <Button variant="secondary" className="w-auto" disabled={clearVenue.isPending} onClick={handleClearRoom}>
                              Clear seats
                            </Button>
                          </div>
                          {carriedForward !== null && carriedForward > 0 && (
                            <p className="mt-3 rounded-[8px] border border-danger-border bg-danger-bg px-3 py-2 text-[12px] text-danger-fg">
                              {carriedForward} register number{carriedForward === 1 ? "" : "s"} exceeded this venue&apos;s capacity and
                              weren&apos;t seated.
                            </p>
                          )}
                          {notFoundEntries.length > 0 && (
                            <p className="mt-2 rounded-[8px] border border-danger-border bg-danger-bg px-3 py-2 text-[12px] text-danger-fg">
                              Not found: {notFoundEntries.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="rounded-[10px] border border-border-default bg-surface-tint p-3.5">
                          <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-subtle">Waiting to be seated</div>
                          <div className="mt-1.5 text-[22px] font-extrabold text-ink">{venueDetail.data.candidates_waiting}</div>
                          <div className="mt-0.5 text-[11.5px] text-muted">across this venue&apos;s ticked departments</div>
                        </div>
                      </div>
                    )}

                    {actionError && <p className="mt-2 text-[12px] text-danger-fg">{actionError}</p>}

                    <div className="mt-5 border-t border-divider pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-subtle">Seat chart</div>
                          <div className="mt-1 text-[13px] font-bold text-ink">Register numbers by seat</div>
                        </div>
                        {venueDetail.data.venue.capacity > 0 && (
                          <div className="flex items-center gap-3 text-[11.5px] text-muted">
                            <span className="flex items-center gap-1.5">
                              <span className="size-2.5 rounded-[3px] bg-primary" /> Filled
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="size-2.5 rounded-[3px] border border-border-default bg-surface-tint" /> Empty
                            </span>
                          </div>
                        )}
                      </div>
                      {venueDetail.data.venue.capacity === 0 ? (
                        <p className="mt-3 text-[12.5px] text-subtle">This venue has no capacity configured.</p>
                      ) : (
                        <>
                          <div className="mt-3 flex justify-center">
                            <div className="rounded-[8px] border border-border-accent bg-accent-50 px-4 py-1.5 text-center">
                              <div className="text-[11px] font-extrabold text-primary">INVIGILATOR&apos;S DESK</div>
                              <div className="text-[10.5px] text-primary-dark">Front of the hall · board side</div>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-8 gap-1.5">
                          {Array.from({ length: venueDetail.data.venue.capacity }, (_, pos) => {
                            const seat = seatsByLabel.get(seatLabelForPosition(pos));
                            return seat ? (
                              <div key={pos} className="rounded-[8px] bg-primary px-1.5 py-2 text-center text-white">
                                <div className="text-[9.5px] font-bold opacity-80">SEAT {pos + 1}</div>
                                <div className="truncate text-[10.5px] font-extrabold">{seat.register_no}</div>
                              </div>
                            ) : (
                              <div key={pos} className="rounded-[8px] border border-dashed border-border-default bg-surface-tint px-1.5 py-2 text-center">
                                <div className="text-[9.5px] font-bold text-subtle">SEAT {pos + 1}</div>
                              </div>
                            );
                          })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-divider pt-4">
                      <span className="text-[12.5px] text-muted">
                        {venueDetail.data.seats.length} of {venueDetail.data.venue.capacity} seats allocated · {venueDetail.data.departments.length}{" "}
                        department{venueDetail.data.departments.length === 1 ? "" : "s"} ·{" "}
                        {venueDetail.data.allocation_mode === "manual" ? "manual" : "automatic"} allocation
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" className="w-auto" disabled={clearVenue.isPending} onClick={handleClearRoom}>
                          Clear room
                        </Button>
                        <Button variant="primarySmall" className="w-auto" disabled={venueDetail.data.seats.length === 0} onClick={() => setTab("draft")}>
                          Add to drafts
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function VersionsList({
  status,
  onOpenInCreate,
}: {
  status: "draft" | "ready_to_publish" | "published";
  onOpenInCreate: (v: { exam_id: number; exam_date: string; session: ExamSessionCode }) => void;
}) {
  const versions = useSeatingVersions(status);
  const submitVersion = useSubmitSeatingVersion();
  const publishVersion = usePublishSeatingVersion();
  const deleteVersion = useDeleteSeatingVersion();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewingVersion, setViewingVersion] = useState<SeatingVersion | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<SeatingVersion | null>(null);

  const rows = useMemo(() => {
    let list = versions.data ?? [];
    if (status === "published") {
      if (startDate) list = list.filter((v) => v.exam_date.slice(0, 10) >= startDate);
      if (endDate) list = list.filter((v) => v.exam_date.slice(0, 10) <= endDate);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((v) => `${v.exams.academic_year} ${v.exams.semester} ${v.exams.exam_types.name}`.toLowerCase().includes(q));
  }, [versions.data, search, status, startDate, endDate]);

  const publishedVenueCount = useMemo(() => rows.reduce((sum, v) => sum + v.seating_plan_version_venues.length, 0), [rows]);
  const publishedSeatCount = useMemo(() => rows.reduce((sum, v) => sum + v._count.seating_arrangements, 0), [rows]);

  function handleDownloadSeatingChart() {
    downloadCsv(
      "published-seating-chart",
      [
        { header: "Exam", value: (v: SeatingVersion) => `${v.exams.exam_types.name} · Semester ${v.exams.semester} · ${v.exams.academic_year}` },
        { header: "Exam date", value: (v: SeatingVersion) => v.exam_date.slice(0, 10) },
        { header: "Session", value: (v: SeatingVersion) => v.session },
        {
          header: "Venue",
          value: (v: SeatingVersion) => v.seating_plan_version_venues.map((vv) => vv.venues.name).join(", ") || "—",
        },
        {
          header: "Departments",
          value: (v: SeatingVersion) =>
            v.seating_plan_version_venues.flatMap((vv) => vv.seating_plan_venue_departments.map((d) => d.departments.code)).join("/") || "—",
        },
        { header: "Seats filled", value: (v: SeatingVersion) => v._count.seating_arrangements },
      ],
      rows,
    );
  }

  async function handleDownloadVenueReport() {
    await exportToPdf({
      title: "Published seating — venue report",
      subtitle: startDate || endDate ? `${startDate || "…"} to ${endDate || "…"}` : "All published seating plans",
      sections: [
        {
          type: "table",
          columns: [
            { header: "Exam", key: "exam" },
            { header: "Date", key: "date" },
            { header: "Session", key: "session" },
            { header: "Venue", key: "venue" },
            { header: "Departments", key: "departments" },
            { header: "Seats filled", key: "seats" },
          ],
          rows: rows.map((v) => ({
            exam: `${v.exams.exam_types.name} · Sem ${v.exams.semester} · ${v.exams.academic_year}`,
            date: v.exam_date.slice(0, 10),
            session: v.session,
            venue: v.seating_plan_version_venues.map((vv) => vv.venues.name).join(", ") || "—",
            departments: v.seating_plan_version_venues.flatMap((vv) => vv.seating_plan_venue_departments.map((d) => d.departments.code)).join("/") || "—",
            seats: v._count.seating_arrangements,
          })),
        },
      ],
      filename: "published-venue-report.pdf",
    });
  }

  const emptyHint =
    status === "draft"
      ? "No saved allocations. Build one under Allocate — seats save to the draft as you allocate them."
      : status === "ready_to_publish"
        ? "Nothing queued for release."
        : "No allocation is live for students yet.";

  return (
    <div className="flex flex-col gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={status === "draft" ? "Search saved allocations" : status === "ready_to_publish" ? "Search queued allocations" : "Search published allocations"}
        className="w-full max-w-sm rounded-input border border-border-default bg-surface px-[13px] py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
      />
      <p className="text-[12px] text-subtle">
        {status === "draft" ? "Saved allocations — view, edit or delete before submitting" : status === "ready_to_publish" ? "Submitted for verification — review and publish" : "Live seating plans"}
      </p>

      {status === "published" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-default bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-muted">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-input border border-border-default bg-surface px-2.5 py-2 text-[12.5px] text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-muted">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-input border border-border-default bg-surface px-2.5 py-2 text-[12.5px] text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <span className="text-[12.5px] text-muted">
              {publishedVenueCount} published venue{publishedVenueCount === 1 ? "" : "s"} · {publishedSeatCount} seats
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primarySmall" className="w-auto px-3 py-2 text-[12.5px]" disabled={rows.length === 0} onClick={handleDownloadSeatingChart}>
              Download seating chart
            </Button>
            <Button variant="secondary" className="w-auto px-3 py-2 text-[12.5px]" disabled={rows.length === 0} onClick={handleDownloadVenueReport}>
              Download venue report
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-[12px] text-danger-fg">{error}</p>}
      {versions.isLoading ? (
        <SkeletonRows count={3} />
      ) : rows.length === 0 ? (
        <p className="rounded-card border border-border-default bg-surface px-5 py-8 text-center text-[13px] text-subtle">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((v) => (
            <Card key={v.id} className="p-0">
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <div className="text-[13.5px] font-bold text-ink">
                    {v.exams.exam_types.name} · Semester {v.exams.semester} · {v.exams.academic_year} · v{v.version_number}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {v.exam_date.slice(0, 10)} · {v.session} ·{" "}
                    {v.seating_plan_version_venues.map((vv) => `${vv.venues.name}${vv.seating_plan_venue_departments.length ? ` (${vv.seating_plan_venue_departments.map((d) => d.departments.code).join("/")})` : ""}`).join(", ") || "no venues configured"}{" "}
                    · {v._count.seating_arrangements} seated
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={STATUS_BADGE[v.status]}>{v.status.replace(/_/g, " ").toUpperCase()}</Badge>
                  <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12.5px]" onClick={() => setViewingVersion(v)}>
                    View
                  </Button>
                  {status === "draft" && (
                    <>
                      <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12.5px]" onClick={() => onOpenInCreate(v)}>
                        Edit
                      </Button>
                      <Button variant="primarySmall" disabled={submitVersion.isPending} onClick={() => submitVersion.mutate(v.id, { onError: (err) => setError((err as Error).message) })}>
                        Submit for verification
                      </Button>
                      <button
                        type="button"
                        className="text-[12px] font-bold text-danger-fg hover:underline"
                        onClick={() => setDeletingVersion(v)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {status === "ready_to_publish" && (
                    <Button variant="primarySmall" disabled={publishVersion.isPending} onClick={() => publishVersion.mutate(v.id, { onError: (err) => setError((err as Error).message) })}>
                      {publishVersion.isPending ? "Publishing…" : "Publish"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deletingVersion != null}
        title="Delete this draft?"
        description={deletingVersion ? `This permanently deletes ${deletingVersion.exams.exam_types.name} · Semester ${deletingVersion.exams.semester} · ${deletingVersion.exams.academic_year} · v${deletingVersion.version_number} and its ${deletingVersion._count.seating_arrangements} seated candidate${deletingVersion._count.seating_arrangements === 1 ? "" : "s"}. This can't be undone.` : ""}
        confirmLabel="Delete draft"
        destructive
        onConfirm={() => {
          if (!deletingVersion) return;
          deleteVersion.mutate(deletingVersion.id, { onError: (err) => setError((err as Error).message) });
          setDeletingVersion(null);
        }}
        onCancel={() => setDeletingVersion(null)}
      />

      <SeatingVersionModal version={viewingVersion} onClose={() => setViewingVersion(null)} />
    </div>
  );
}

function SeatingVersionModal({ version, onClose }: { version: SeatingVersion | null; onClose: () => void }) {
  const detail = useSeatingVersionDetail(version?.id ?? null);

  return (
    <Modal
      open={version != null}
      onClose={onClose}
      title="Seating plan version"
      subtitle={version ? `${version.exams.exam_types.name} · Semester ${version.exams.semester} · ${version.exams.academic_year} · v${version.version_number}` : undefined}
    >
      {detail.isLoading ? (
        <p className="text-[13px] text-subtle">Loading…</p>
      ) : !detail.data || detail.data.venues.length === 0 ? (
        <p className="text-[13px] text-subtle">No venues configured for this version yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {detail.data.venues.map((v) => (
            <div key={v.venue_id} className="rounded-input border border-border-default p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{v.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {v.location ? `${v.location} · ` : ""}capacity {v.capacity} · {v.allocation_mode === "manual" ? "manual" : "automatic"}
                    {v.pattern ? ` · ${v.pattern.replace(/_/g, " ")}` : ""}
                  </div>
                </div>
                <span className="shrink-0 text-[12.5px] font-bold text-ink">
                  {v.seated}/{v.capacity}
                </span>
              </div>
              {v.departments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.departments.map((d) => (
                    <span key={d.id} className="rounded-[6px] bg-surface-tint px-2 py-1 text-[11.5px] font-bold text-ink">
                      {d.code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
