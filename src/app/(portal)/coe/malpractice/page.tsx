"use client";

import { useMemo, useState } from "react";
import { Card, Select, SearchBar, Input, Textarea, Button, Badge, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonFilterBar, SkeletonTable } from "@/components/ui/Skeleton";
import { useExams, useExamSubjectMappings } from "@/modules/coe/api/exams";
import { useVenues, useDepartments, useSubjects, useClasses } from "@/modules/coe/api/reference";
import {
  useMalpracticeIncidents,
  useCreateMalpracticeIncident,
  useLookupStudentByRegisterNo,
  isNotFound,
  MALPRACTICE_NATURE_OPTIONS,
  MALPRACTICE_ACTION_OPTIONS,
  type MalpracticeAction,
} from "@/modules/coe/api/malpractice";
import type { ExamSessionCode } from "@/modules/coe/api/shared";

const ACTION_TONE: Record<MalpracticeAction, BadgeTone> = {
  reported_to_coe: "accent",
  warning_issued: "neutral",
  paper_cancelled: "danger",
  semester_cancelled: "danger",
  debarred_one_year: "danger",
  case_under_enquiry: "accent",
};

export default function CoeMalpracticePage() {
  const exams = useExams();
  const venues = useVenues();
  const departments = useDepartments();
  const subjects = useSubjects();
  const classes = useClasses();
  const mappings = useExamSubjectMappings();

  const subjectsById = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);
  const classesById = useMemo(() => new Map((classes.data ?? []).map((c) => [c.id, c])), [classes.data]);

  const academicYears = useMemo(() => [...new Set((exams.data ?? []).map((e) => e.academic_year))].sort().reverse(), [exams.data]);
  const currentAcademicYear = academicYears[0] ?? null;

  const [registerNumber, setRegisterNumber] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [incidentDate, setIncidentDate] = useState("");
  const [session, setSession] = useState<ExamSessionCode>("FN");
  const [venueId, setVenueId] = useState<number | null>(null);
  const [seatNumber, setSeatNumber] = useState("");
  const [mappingId, setMappingId] = useState<number | null>(null);
  const [nature, setNature] = useState(MALPRACTICE_NATURE_OPTIONS[0].value);
  const [actionTaken, setActionTaken] = useState(MALPRACTICE_ACTION_OPTIONS[0].value);
  const [remarks, setRemarks] = useState("");

  const semesterOptions = useMemo(
    () => [...new Set((exams.data ?? []).filter((e) => e.academic_year === currentAcademicYear).map((e) => e.semester))].sort((a, b) => a - b),
    [exams.data, currentAcademicYear],
  );
  const effectiveSemester = semester ?? semesterOptions[0] ?? null;
  const effectiveDepartmentId = departmentId ?? departments.data?.[0]?.id ?? null;

  // seating_plan_versions-style "most recent match" — the design's form has
  // no explicit Academic year/Examination-type fields, so this resolves one
  // real exam from the most recent academic year + the chosen semester.
  const resolvedExam = useMemo(() => {
    const candidates = (exams.data ?? []).filter((e) => e.academic_year === currentAcademicYear && e.semester === effectiveSemester);
    return candidates.sort((a, b) => b.id - a.id)[0] ?? null;
  }, [exams.data, currentAcademicYear, effectiveSemester]);
  const effectiveExamId = resolvedExam?.id ?? null;

  const paperOptions = useMemo(
    () =>
      (mappings.data ?? []).filter((m) => {
        if (m.exam_id !== effectiveExamId) return false;
        const klass = classesById.get(m.class_id);
        return klass?.department_id === effectiveDepartmentId && klass?.current_semester === effectiveSemester;
      }),
    [mappings.data, effectiveExamId, effectiveDepartmentId, effectiveSemester, classesById],
  );

  // Global register — the design lists incidents across every department/
  // semester together, not scoped to the form's current selection.
  const incidents = useMalpracticeIncidents();
  const createIncident = useCreateMalpracticeIncident();
  const lookupStudent = useLookupStudentByRegisterNo();

  const [registerSearch, setRegisterSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [filterNature, setFilterNature] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const filteredIncidents = useMemo(() => {
    let rows = incidents.data?.data ?? [];
    if (registerSearch.trim()) {
      const q = registerSearch.trim().toLowerCase();
      rows = rows.filter((i) => (i.students.register_no ?? i.students.student_id_no).toLowerCase().includes(q));
    }
    if (filterDepartment !== "all") rows = rows.filter((i) => i.exam_subject_mapping?.classes.departments.code === filterDepartment);
    if (filterSemester !== "all") rows = rows.filter((i) => String(i.exam_subject_mapping?.classes.current_semester ?? i.exams.semester) === filterSemester);
    if (filterNature !== "all") rows = rows.filter((i) => i.nature === filterNature);
    if (filterAction !== "all") rows = rows.filter((i) => i.action_taken === filterAction);
    return rows;
  }, [incidents.data, registerSearch, filterDepartment, filterSemester, filterNature, filterAction]);

  const filtersLoading = exams.isLoading || departments.isLoading;
  const canRecord = !!lookupStudent.data && !!effectiveExamId && incidentDate !== "" && mappingId != null;

  function handleGenerateRegisterNumber() {
    if (!registerNumber.trim()) return;
    lookupStudent.mutate(registerNumber.trim());
  }

  function handleRecord() {
    if (!canRecord || !effectiveExamId || !lookupStudent.data) return;
    createIncident.mutate(
      {
        student_id: lookupStudent.data.id,
        exam_id: effectiveExamId,
        exam_subject_mapping_id: mappingId ?? undefined,
        venue_id: venueId ?? undefined,
        incident_date: incidentDate,
        session,
        seat_number: seatNumber || undefined,
        nature,
        action_taken: actionTaken,
        invigilator_remarks: remarks || undefined,
      },
      {
        onSuccess: () => {
          setRegisterNumber("");
          setSeatNumber("");
          setRemarks("");
          setMappingId(null);
          lookupStudent.reset();
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Malpractice register" subtitle="Record incidents with candidate, venue, paper and action taken" />

      {filtersLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <h2 className="text-[15px] font-extrabold text-ink">Record a malpractice case</h2>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Register number</label>
              <Input value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} placeholder="e.g. 21CS204" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Department</label>
              <Select
                value={effectiveDepartmentId ?? ""}
                onChange={(e) => {
                  setDepartmentId(Number(e.target.value));
                  setMappingId(null);
                }}
              >
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
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
                  setMappingId(null);
                }}
              >
                {semesterOptions.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Examination date</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full min-w-0 rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Session</label>
              <Select value={session} onChange={(e) => setSession(e.target.value as ExamSessionCode)}>
                <option value="FN">FN 10:00–13:00</option>
                <option value="AN">AN 14:00–17:00</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Venue</label>
              <Select value={venueId ?? ""} onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Not specified</option>
                {(venues.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.location ? `· ${v.location}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Seat number</label>
              <Input value={seatNumber} onChange={(e) => setSeatNumber(e.target.value)} placeholder="14" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Paper</label>
              <Select value={mappingId ?? ""} onChange={(e) => setMappingId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Select a paper…</option>
                {paperOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {subjectsById.get(m.subject_id)?.subject_code ?? `#${m.subject_id}`} · {subjectsById.get(m.subject_id)?.name ?? ""}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Nature of malpractice</label>
              <Select value={nature} onChange={(e) => setNature(e.target.value as typeof nature)}>
                {MALPRACTICE_NATURE_OPTIONS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Action taken</label>
              <Select value={actionTaken} onChange={(e) => setActionTaken(e.target.value as typeof actionTaken)}>
                {MALPRACTICE_ACTION_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Invigilator remarks</label>
            <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="secondary" className="w-auto" disabled={!registerNumber.trim() || lookupStudent.isPending} onClick={handleGenerateRegisterNumber}>
                {lookupStudent.isPending ? "Looking up…" : "Generate register number"}
              </Button>
              {lookupStudent.data ? (
                <span className="text-[12px] font-semibold text-primary">
                  Found: {lookupStudent.data.name ?? lookupStudent.data.register_no} · {lookupStudent.data.department_code ?? "—"}
                </span>
              ) : lookupStudent.isError ? (
                <span className="text-[12px] text-danger-fg">{isNotFound(lookupStudent.error) ? "No student found with this register number." : (lookupStudent.error as Error).message}</span>
              ) : (
                <span className="text-[12px] text-subtle">Register number, examination date and paper are required.</span>
              )}
            </div>
            <Button variant="primarySmall" disabled={!canRecord || createIncident.isPending} onClick={handleRecord}>
              {createIncident.isPending ? "Recording…" : "Record case"}
            </Button>
          </div>
          {createIncident.isError && <p className="mt-2 text-[12px] text-danger-fg">{(createIncident.error as Error).message}</p>}
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar placeholder="Search register number…" value={registerSearch} onChange={(e) => setRegisterSearch(e.target.value)} className="max-w-[240px]" />
          <Select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="w-auto min-w-[140px]">
            <option value="all">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.code}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="w-auto min-w-[130px]">
            <option value="all">All semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
          <Select value={filterNature} onChange={(e) => setFilterNature(e.target.value)} className="w-auto min-w-[160px]">
            <option value="all">All nature</option>
            {MALPRACTICE_NATURE_OPTIONS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
          <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="w-auto min-w-[170px]">
            <option value="all">All actions</option>
            {MALPRACTICE_ACTION_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {incidents.isLoading ? (
        <SkeletonTable rows={4} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Incident register</span>
            <span className="text-[12.5px] text-muted">{filteredIncidents.length} cases</span>
          </div>
          {filteredIncidents.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No malpractice incidents match the current filter.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[110px]">Case ref</div>
                <div className="flex-1">Student</div>
                <div className="w-[190px]">Paper</div>
                <div className="w-[160px]">Venue &amp; seat</div>
                <div className="w-[140px]">Date &amp; session</div>
                <div className="w-[130px]">Nature</div>
                <div className="w-[150px]">Action</div>
              </div>
              {filteredIncidents.map((incident) => {
                const mapping = incident.exam_subject_mapping;
                const deptCode = mapping?.classes.departments.code ?? null;
                const sem = mapping?.classes.current_semester ?? incident.exams.semester;
                const caseRef = `MP-${incident.incident_date.slice(0, 4)}-${String(incident.id).padStart(3, "0")}`;
                return (
                  <div key={incident.id} className="flex items-center gap-4 border-b border-divider px-5 py-3.5 last:border-0">
                    <div className="w-[110px] text-[12.5px] font-extrabold text-primary">{caseRef}</div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-ink">{incident.students.register_no ?? incident.students.student_id_no}</div>
                      <div className="text-[11.5px] text-muted">{deptCode ? `${deptCode} · ` : ""}Semester {sem}</div>
                    </div>
                    <div className="w-[190px] text-[12.5px] text-ink">{mapping ? `${mapping.subjects.subject_code} · ${mapping.subjects.name}` : "—"}</div>
                    <div className="w-[160px] text-[12.5px] text-ink">
                      {incident.venues ? `${incident.venues.name}${incident.seat_number ? ` · seat ${incident.seat_number}` : ""}` : "Not specified"}
                    </div>
                    <div className="w-[140px] text-[12px] text-ink">
                      {incident.incident_date.slice(0, 10)}
                      <div className="text-[11px] text-muted">{incident.session === "FN" ? "FN 10:00–13:00" : "AN 14:00–17:00"}</div>
                    </div>
                    <div className="w-[130px] text-[12px] text-ink">{MALPRACTICE_NATURE_OPTIONS.find((n) => n.value === incident.nature)?.label}</div>
                    <div className="w-[150px]">
                      <Badge tone={ACTION_TONE[incident.action_taken]}>{MALPRACTICE_ACTION_OPTIONS.find((a) => a.value === incident.action_taken)?.label.toUpperCase()}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
