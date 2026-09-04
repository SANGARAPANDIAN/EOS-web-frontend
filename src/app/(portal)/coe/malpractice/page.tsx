"use client";

import { useEffect, useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExamTimetable } from "@/modules/coe/api/timetable";
import { useExamSubjectMappings } from "@/modules/coe/api/exams";
import { useSubjects } from "@/modules/coe/api/reference";
import { useDepartments } from "@/modules/shared/api/departments";
import {
  useMalpracticeIncidents,
  useCreateMalpracticeIncident,
  useUpdateMalpracticeIncident,
  useLookupStudentByRegisterNo,
  isNotFound,
  MALPRACTICE_NATURE_OPTIONS,
  MALPRACTICE_ACTION_OPTIONS,
  type MalpracticeIncident,
  type MalpracticeNature,
  type EnquiryStage,
} from "@/modules/coe/api/malpractice";
import type { ExamSessionCode } from "@/modules/coe/api/shared";

type TabKey = "all" | EnquiryStage;
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All cases" },
  { key: "reported", label: "Reported" },
  { key: "under_enquiry", label: "Under enquiry" },
  { key: "decided", label: "Decided" },
];

const STAGE_LABEL: Record<EnquiryStage, string> = { reported: "Reported", under_enquiry: "Under enquiry", decided: "Decided" };

function candidateName(incident: MalpracticeIncident): string {
  return incident.students.soa_applications
    ? [incident.students.soa_applications.first_name, incident.students.soa_applications.last_name].filter(Boolean).join(" ")
    : (incident.students.register_no ?? incident.students.student_id_no);
}

function caseRef(incident: MalpracticeIncident): string {
  return `UFM-${incident.incident_date.slice(0, 4)}-${String(incident.id).padStart(3, "0")}`;
}

function reportedByLabel(incident: MalpracticeIncident): string {
  if (incident.faculty) return [incident.faculty.first_name, incident.faculty.last_name].filter(Boolean).join(" ");
  return incident.recorded_by?.name ?? "—";
}

/** Same June-cutoff academic-cycle boundary used across the rebuilt COE pages. */
function isThisCycle(iso: string, now: Date): boolean {
  const cycleStart = new Date(Date.UTC(now.getUTCMonth() >= 5 ? now.getUTCFullYear() : now.getUTCFullYear() - 1, 5, 1));
  return new Date(iso) >= cycleStart;
}

export default function CoeMalpracticePage() {
  const departments = useDepartments();
  const incidents = useMalpracticeIncidents();
  const allRows = incidents.data?.data ?? [];
  const now = new Date();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [nature, setNature] = useState<"all" | MalpracticeNature>("all");
  const [stageFilter, setStageFilter] = useState<"all" | EnquiryStage>("all");
  const [departmentCode, setDepartmentCode] = useState<string>("all");

  const [reportOpen, setReportOpen] = useState(false);
  const [viewCase, setViewCase] = useState<MalpracticeIncident | null>(null);
  const [orderCase, setOrderCase] = useState<MalpracticeIncident | null>(null);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const tabCounts = {
    all: allRows.length,
    reported: allRows.filter((i) => i.enquiry_stage === "reported").length,
    under_enquiry: allRows.filter((i) => i.enquiry_stage === "under_enquiry").length,
    decided: allRows.filter((i) => i.enquiry_stage === "decided").length,
  };

  const filtered = allRows.filter((i) => {
    if (tab !== "all" && i.enquiry_stage !== tab) return false;
    if (stageFilter !== "all" && i.enquiry_stage !== stageFilter) return false;
    if (nature !== "all" && i.nature !== nature) return false;
    if (departmentCode !== "all" && i.exam_subject_mapping?.classes.departments.code !== departmentCode) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [caseRef(i), i.students.register_no, i.students.roll_no, i.venues?.name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  const underEnquiryOlderThan7Days = allRows.filter((i) => i.enquiry_stage === "under_enquiry" && now.getTime() - new Date(i.incident_date).getTime() > 7 * 24 * 60 * 60 * 1000).length;
  const sittingDates = [...new Set(allRows.map((i) => i.committee_sitting_at).filter((d): d is string => d != null))].sort();
  const nextSitting = sittingDates.find((d) => new Date(d) >= now) ?? sittingDates[sittingDates.length - 1];
  const appealsPending = allRows.filter((i) => i.appeal_status === "pending").length;
  const casesThisCycle = allRows.filter((i) => isThisCycle(i.incident_date, now)).length;

  function handleExport() {
    downloadCsv(
      "malpractice-cases",
      [
        { header: "Case", value: (i: MalpracticeIncident) => caseRef(i) },
        { header: "Candidate", value: (i: MalpracticeIncident) => candidateName(i) },
        { header: "Roll number", value: (i: MalpracticeIncident) => i.students.roll_no ?? i.students.register_no ?? "" },
        { header: "Course", value: (i: MalpracticeIncident) => (i.exam_subject_mapping ? `${i.exam_subject_mapping.subjects.subject_code} · ${i.exam_subject_mapping.subjects.name}` : "") },
        { header: "Category", value: (i: MalpracticeIncident) => MALPRACTICE_NATURE_OPTIONS.find((n) => n.value === i.nature)?.label ?? i.nature },
        { header: "Reported by", value: (i: MalpracticeIncident) => reportedByLabel(i) },
        { header: "Stage", value: (i: MalpracticeIncident) => STAGE_LABEL[i.enquiry_stage] },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Malpractice / UFM"
        subtitle="Unfair means cases from report to enquiry committee decision, with punishment recording and appeals."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setReportOpen(true)}>
              <Icon name="add" size={16} />
              Report a case
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Cases this cycle" value={casesThisCycle} icon="gavel" loading={incidents.isLoading} />
        <StatCard label="Under enquiry" value={tabCounts.under_enquiry} icon="hourglass_empty" sub={underEnquiryOlderThan7Days > 0 ? `${underEnquiryOlderThan7Days} open >7 days` : undefined} loading={incidents.isLoading} />
        <StatCard label="Committee sittings" value={sittingDates.length} icon="groups" sub={nextSitting ? `next ${new Date(nextSitting).toLocaleDateString()}` : undefined} loading={incidents.isLoading} />
        <StatCard label="Appeals pending" value={appealsPending} icon="balance" sub={appealsPending > 0 ? "with the Registrar" : undefined} loading={incidents.isLoading} />
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-7 border-b border-divider px-5 pt-4">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => changeFilter(setTab, t.key)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 pb-3 text-[14px] font-bold transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-bold", active ? "bg-accent-50 text-primary" : "bg-surface-tint text-muted")}>
                  {tabCounts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-4">
          <SearchBar placeholder="Search case ID, roll number or hall…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={nature} onChange={(e) => changeFilter(setNature, e.target.value as typeof nature)} className="w-auto min-w-[150px]">
            <option value="all">All categories</option>
            {MALPRACTICE_NATURE_OPTIONS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
          <Select value={stageFilter} onChange={(e) => changeFilter(setStageFilter, e.target.value as typeof stageFilter)} className="w-auto min-w-[130px]">
            <option value="all">All stages</option>
            <option value="reported">Reported</option>
            <option value="under_enquiry">Under enquiry</option>
            <option value="decided">Decided</option>
          </Select>
          <Select value={departmentCode} onChange={(e) => changeFilter(setDepartmentCode, e.target.value)} className="w-auto min-w-[150px]">
            <option value="all">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.code}>
                {d.code}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {incidents.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No malpractice cases match the current filters.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="w-[120px]">Case</div>
              <div className="w-[150px]">Candidate</div>
              <div className="flex-1">Course &amp; session</div>
              <div className="w-[150px]">Category</div>
              <div className="w-[130px]">Reported by</div>
              <div className="w-[110px]">Stage</div>
              <div className="w-[120px] text-right"> </div>
            </div>
            {pageRows.map((i) => (
              <div key={i.id} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                <div className="w-[120px]">
                  <div className="text-[12.5px] font-extrabold text-ink">{caseRef(i)}</div>
                  <div className="text-[11px] text-muted">{new Date(i.incident_date).toLocaleDateString()}</div>
                </div>
                <div className="w-[150px]">
                  <div className="text-[12.5px] font-bold text-ink">{candidateName(i)}</div>
                  <div className="text-[11px] text-muted">{i.students.roll_no ?? i.students.register_no ?? "—"}</div>
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] text-ink">{i.exam_subject_mapping ? `${i.exam_subject_mapping.subjects.subject_code} · ${i.exam_subject_mapping.subjects.name}` : "—"}</div>
                  <div className="text-[11px] text-muted">
                    {i.venues ? `Hall ${i.venues.name}` : "Hall not specified"} · {i.session}
                  </div>
                </div>
                <div className="w-[150px] min-w-0 shrink-0">
                  <Badge tone="neutral" className="max-w-full truncate">
                    {MALPRACTICE_NATURE_OPTIONS.find((n) => n.value === i.nature)?.label ?? i.nature}
                  </Badge>
                </div>
                <div className="w-[130px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{reportedByLabel(i)}</div>
                <div className="w-[110px] min-w-0 shrink-0">
                  <Badge tone="accent" className="max-w-full truncate">
                    {STAGE_LABEL[i.enquiry_stage]}
                  </Badge>
                </div>
                <div className="flex w-[120px] shrink-0 justify-end gap-3">
                  <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={() => setViewCase(i)}>
                    View
                  </button>
                  <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={() => setOrderCase(i)}>
                    Order
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ReportCaseModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <ViewCaseModal incident={viewCase} onClose={() => setViewCase(null)} />
      <OrderModal incident={orderCase} onClose={() => setOrderCase(null)} />
    </div>
  );
}

function ReportCaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const timetable = useExamTimetable();
  const mappings = useExamSubjectMappings();
  const subjects = useSubjects();
  const createIncident = useCreateMalpracticeIncident();
  const lookupStudent = useLookupStudentByRegisterNo();

  const [rollNumber, setRollNumber] = useState("");
  const [lookedUpFor, setLookedUpFor] = useState("");
  const [courseSessionKey, setCourseSessionKey] = useState("");
  const [nature, setNature] = useState<MalpracticeNature>(MALPRACTICE_NATURE_OPTIONS[0].value);
  const [materialSeized, setMaterialSeized] = useState("");
  const [statement, setStatement] = useState("");

  const mappingsById = new Map((mappings.data ?? []).map((m) => [m.id, m]));
  const subjectsById = new Map((subjects.data ?? []).map((s) => [s.id, s]));
  const todayStr = new Date().toISOString().slice(0, 10);
  const allTimetableRows = timetable.data ?? [];
  const todaysRows = allTimetableRows.filter((r) => r.exam_date.slice(0, 10) === todayStr);
  const sourceRows = todaysRows.length > 0 ? todaysRows : allTimetableRows;

  const seen = new Set<string>();
  const courseSessionOptions: { key: string; exam_subject_mapping_id: number; exam_id: number; session: ExamSessionCode; label: string }[] = [];
  for (const r of sourceRows) {
    const mapping = mappingsById.get(r.exam_subject_mapping_id);
    const subject = mapping ? subjectsById.get(mapping.subject_id) : null;
    if (!mapping || !subject) continue;
    const key = `${r.exam_subject_mapping_id}|${r.session}`;
    if (seen.has(key)) continue;
    seen.add(key);
    courseSessionOptions.push({
      key,
      exam_subject_mapping_id: r.exam_subject_mapping_id,
      exam_id: mapping.exam_id,
      session: r.session,
      label: `${subject.subject_code} · ${subject.name} · ${r.session}`,
    });
  }
  const selectedOption = courseSessionOptions.find((o) => o.key === courseSessionKey) ?? null;

  function handleRollBlur() {
    const value = rollNumber.trim();
    if (!value || value === lookedUpFor) return;
    setLookedUpFor(value);
    lookupStudent.mutate(value);
  }

  function reset() {
    setRollNumber("");
    setLookedUpFor("");
    setCourseSessionKey("");
    setNature(MALPRACTICE_NATURE_OPTIONS[0].value);
    setMaterialSeized("");
    setStatement("");
    lookupStudent.reset();
    createIncident.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!lookupStudent.data || !selectedOption) return;
    createIncident.mutate(
      {
        student_id: lookupStudent.data.id,
        exam_id: selectedOption.exam_id,
        exam_subject_mapping_id: selectedOption.exam_subject_mapping_id,
        incident_date: todayStr,
        session: selectedOption.session,
        nature,
        action_taken: "reported_to_coe",
        invigilator_remarks: [materialSeized.trim() ? `Material seized: ${materialSeized.trim()}` : null, statement.trim() || null].filter(Boolean).join(" — ") || undefined,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Report a malpractice case"
      subtitle="Filed by the hall invigilator or chief superintendent. The candidate's script is sealed separately and the result is withheld until the committee decides."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Roll number *</label>
          <input
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            onBlur={handleRollBlur}
            placeholder="e.g. 22ME118"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {lookupStudent.isPending ? (
            <p className="mt-1.5 text-[12px] text-muted">Looking up…</p>
          ) : lookupStudent.data ? (
            <p className="mt-1.5 text-[12px] font-semibold text-primary">
              Found: {lookupStudent.data.name ?? lookupStudent.data.register_no} · {lookupStudent.data.department_code ?? "—"}
            </p>
          ) : lookupStudent.isError ? (
            <p className="mt-1.5 text-[12px] text-danger-fg">{isNotFound(lookupStudent.error) ? "No student found with this roll number." : (lookupStudent.error as Error).message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Course &amp; session</label>
          <select
            value={courseSessionKey}
            onChange={(e) => setCourseSessionKey(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="">Choose a course &amp; session…</option>
            {courseSessionOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Category</label>
          <select
            value={nature}
            onChange={(e) => setNature(e.target.value as MalpracticeNature)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {MALPRACTICE_NATURE_OPTIONS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Material seized</label>
          <input
            type="text"
            value={materialSeized}
            onChange={(e) => setMaterialSeized(e.target.value)}
            placeholder="e.g. handwritten slip, mobile phone"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Invigilator statement</label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        {createIncident.isError && <p className="text-[12px] text-danger-fg">{(createIncident.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!lookupStudent.data || !selectedOption || createIncident.isPending} onClick={handleSave}>
            {createIncident.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Pure read-only case summary — View never changes anything. */
function ViewCaseModal({ incident, onClose }: { incident: MalpracticeIncident | null; onClose: () => void }) {
  return (
    <Modal
      open={incident != null}
      onClose={onClose}
      title={incident ? caseRef(incident) : ""}
      subtitle={incident ? `${candidateName(incident)} · ${incident.exam_subject_mapping ? `${incident.exam_subject_mapping.subjects.subject_code} · ${incident.exam_subject_mapping.subjects.name}` : "—"}` : undefined}
    >
      {incident && (
        <div className="flex flex-col gap-3 text-[13px]">
          {[
            ["Hall & session", incident.venues ? `${incident.venues.name} · ${incident.session}` : incident.session],
            ["Category", MALPRACTICE_NATURE_OPTIONS.find((n) => n.value === incident.nature)?.label ?? incident.nature],
            ["Reported by", reportedByLabel(incident)],
            ["Stage", STAGE_LABEL[incident.enquiry_stage]],
            ["Decision", MALPRACTICE_ACTION_OPTIONS.find((a) => a.value === incident.action_taken)?.label ?? incident.action_taken],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 last:border-0">
              <span className="font-bold text-muted">{label}</span>
              <span className="text-right text-ink">{value}</span>
            </div>
          ))}
          {incident.invigilator_remarks && (
            <div className="rounded-input border border-border-default bg-surface-subtle p-3 text-ink">{incident.invigilator_remarks}</div>
          )}
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}

/** The only thing Order changes is the case's status (enquiry stage) — nothing else. */
function OrderModal({ incident, onClose }: { incident: MalpracticeIncident | null; onClose: () => void }) {
  const update = useUpdateMalpracticeIncident();
  const [stage, setStage] = useState<EnquiryStage>("reported");

  // Re-hydrate whenever a different case is opened — deliberate one-shot
  // hydration on case change, not an external-data sync.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (incident) setStage(incident.enquiry_stage);
  }, [incident?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function handleClose() {
    update.reset();
    onClose();
  }

  function handleSave() {
    if (!incident) return;
    update.mutate({ id: incident.id, enquiry_stage: stage }, { onSuccess: handleClose });
  }

  return (
    <Modal open={incident != null} onClose={handleClose} title={incident ? caseRef(incident) : ""} subtitle={incident ? candidateName(incident) : undefined}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Status</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as EnquiryStage)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="reported">Reported</option>
            <option value="under_enquiry">Under enquiry</option>
            <option value="decided">Decided</option>
          </select>
        </div>

        {update.isError && <p className="text-[12px] text-danger-fg">{(update.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={update.isPending} onClick={handleSave}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
