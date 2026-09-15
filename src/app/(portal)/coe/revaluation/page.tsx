"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Input, Select, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonFilterBar, SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useExamTypes } from "@/modules/coe/api/reference";
import { useFacultyDirectory } from "@/modules/coe/api/faculty";
import { useRevaluationRequests, useUpdateRevaluationRequest, type RevaluationRequest, type RevaluationStatus } from "@/modules/coe/api/revaluation";
import {
  useRevaluationWindow,
  useCreateRevaluationWindow,
  useUpdateRevaluationWindow,
  type RevaluationApplicationType,
} from "@/modules/coe/api/revaluationWindow";
import { usePhotocopyRequests, useUpdatePhotocopyRequest, type PhotocopyRequest } from "@/modules/coe/api/photocopyRequests";
import { cn } from "@/lib/utils/cn";

const STATUS_TONE: Record<RevaluationStatus, BadgeTone> = {
  requested: "neutral",
  under_review: "accent",
  revised: "accentDark",
  no_change: "neutral",
  approved: "accentDark",
  rejected: "danger",
};

const APPLICABLE_EXAMS = ["End semester", "Arrear", "Practical", "Supplementary"];
const DATE_LABEL = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

function studentName(s: { soa_applications: { first_name: string; last_name: string | null } | null }): string | null {
  if (!s.soa_applications) return null;
  return [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ");
}

function splitDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

function combineDateTime(date: string, time: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

export default function CoeRevaluationPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const requests = useRevaluationRequests();
  const updateRequest = useUpdateRevaluationRequest();
  const facultyDirectory = useFacultyDirectory();
  const [revisedMarksById, setRevisedMarksById] = useState<Record<number, string>>({});

  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [tab, setTab] = useState<"photocopy" | "revaluation">("photocopy");

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);
  const examTypeOptions = useMemo(() => [...new Set((exams.data ?? []).map((e) => e.exam_type_id))], [exams.data]);
  const effectiveExamTypeId = examTypeId ?? examTypeOptions[0] ?? null;

  // revaluation_windows.exam_id is one row per exam, but the design's own
  // filter bar only exposes "Examination type" (no academic year/semester) —
  // resolved to the most recent real exam of that type so the window still
  // maps onto one concrete exam under the hood.
  const resolvedExam = useMemo(() => {
    const matches = (exams.data ?? []).filter((e) => e.exam_type_id === effectiveExamTypeId);
    return matches.sort((a, b) => b.id - a.id)[0] ?? null;
  }, [exams.data, effectiveExamTypeId]);
  const effectiveExamId = resolvedExam?.id ?? null;

  const win = useRevaluationWindow(effectiveExamId);
  const createWindow = useCreateRevaluationWindow();
  const updateWindow = useUpdateRevaluationWindow();
  const photocopy = usePhotocopyRequests();
  const updatePhotocopy = useUpdatePhotocopyRequest();

  const [applicationType, setApplicationType] = useState<RevaluationApplicationType>("reval_only");
  const [opensDate, setOpensDate] = useState("");
  const [opensTime, setOpensTime] = useState("09:00");
  const [closesDate, setClosesDate] = useState("");
  const [closesTime, setClosesTime] = useState("17:00");
  const [feePerPaper, setFeePerPaper] = useState("500");
  const [photocopyFee, setPhotocopyFee] = useState("300");
  const [maxPapers, setMaxPapers] = useState("4");
  const [applicableExams, setApplicableExams] = useState(new Set(["End semester"]));

  function toggleApplicable(exam: string) {
    setApplicableExams((prev) => {
      const next = new Set(prev);
      if (next.has(exam)) next.delete(exam);
      else next.add(exam);
      return next;
    });
  }

  function handleSaveWindow() {
    if (!effectiveExamId) return;
    const input = {
      application_type: applicationType,
      opens_at: combineDateTime(opensDate, opensTime),
      closes_at: combineDateTime(closesDate, closesTime),
      fee_per_paper: Number(feePerPaper),
      photocopy_fee_per_paper: Number(photocopyFee),
      max_papers_per_student: maxPapers ? Number(maxPapers) : undefined,
    };
    if (win.data) {
      updateWindow.mutate({ examId: effectiveExamId, ...input, is_open: win.data.is_open });
    } else {
      createWindow.mutate({ exam_id: effectiveExamId, ...input, is_open: false });
    }
  }

  function handleToggleOpen(nextOpen: boolean) {
    if (!effectiveExamId || !win.data) return;
    updateWindow.mutate({
      examId: effectiveExamId,
      is_open: nextOpen,
      application_type: win.data.application_type,
      fee_per_paper: Number(win.data.fee_per_paper),
      photocopy_fee_per_paper: Number(win.data.photocopy_fee_per_paper),
      max_papers_per_student: win.data.max_papers_per_student ?? undefined,
    });
  }

  function handleSaveRevisedMarks(r: RevaluationRequest) {
    const raw = revisedMarksById[r.id];
    const num = Number(raw);
    if (raw === undefined || raw.trim() === "" || !Number.isFinite(num) || num < 0) return;
    if (num === r.revised_marks) return;
    updateRequest.mutate({ id: r.id, status: "revised", revised_marks: num });
  }

  const saving = createWindow.isPending || updateWindow.isPending;
  const saveError = (createWindow.error ?? updateWindow.error) as Error | null;
  const photocopyRows = photocopy.data?.data ?? [];
  const isTerminal = (s: RevaluationStatus) => s === "approved" || s === "rejected";

  const revalStats = useMemo(() => {
    const rows = requests.data ?? [];
    const active = rows.filter((r) => !isTerminal(r.status)).length;
    const feeCollected = rows.filter((r) => r.fee_paid).reduce((sum, r) => sum + (r.fee_amount ?? 0), 0);
    return { active, feeCollected, papers: rows.length };
  }, [requests.data]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Revaluation management" subtitle="Window configuration, applications and evaluators" />

      {win.isLoading ? (
        <SkeletonTable rows={2} />
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-[11px] border border-border-accent bg-accent-50 px-5 py-4">
          <div>
            <div className="text-[15px] font-extrabold text-primary">
              {win.data
                ? win.data.is_open
                  ? "Revaluation applications are open"
                  : "Revaluation applications are closed"
                : "No revaluation window configured for this exam yet"}
            </div>
            <div className="mt-0.5 text-[13px] text-primary-dark">
              {win.data
                ? `${win.data.is_open ? "Students may apply" : "Closed"}${
                    win.data.closes_at ? ` until ${new Date(win.data.closes_at).toLocaleDateString()}` : ""
                  } · ₹${win.data.fee_per_paper} per paper · maximum ${win.data.max_papers_per_student ?? "—"} papers`
                : "Configure the window below, then save to create it."}
            </div>
          </div>
          {win.data && (
            <Button
              variant="primarySmall"
              disabled={updateWindow.isPending}
              onClick={() => handleToggleOpen(!win.data!.is_open)}
              className={win.data.is_open ? "bg-danger-fg hover:opacity-90" : ""}
            >
              {win.data.is_open ? "Close window now" : "Reopen window"}
            </Button>
          )}
        </div>
      )}

      {exams.isLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Application type</label>
              <Select value={applicationType} onChange={(e) => setApplicationType(e.target.value as RevaluationApplicationType)}>
                <option value="reval_only">Revaluation only</option>
                <option value="photocopy_only">Photocopy only</option>
                <option value="photocopy_and_reval">Photocopy and revaluation</option>
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
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Opens on</label>
              <input
                type="date"
                value={opensDate}
                onChange={(e) => setOpensDate(e.target.value)}
                className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Closes on</label>
              <input
                type="date"
                value={closesDate}
                onChange={(e) => setClosesDate(e.target.value)}
                className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Open window</label>
              <input
                type="time"
                value={opensTime}
                onChange={(e) => setOpensTime(e.target.value)}
                className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Close window</label>
              <input
                type="time"
                value={closesTime}
                onChange={(e) => setClosesTime(e.target.value)}
                className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee per paper (₹)</label>
              <Input type="number" value={feePerPaper} onChange={(e) => setFeePerPaper(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Maximum papers per student</label>
              <Input type="number" value={maxPapers} onChange={(e) => setMaxPapers(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Photocopy fee per paper (₹)</label>
              <Input type="number" value={photocopyFee} onChange={(e) => setPhotocopyFee(e.target.value)} />
            </div>
            <div className="col-span-3 flex items-end">
              <Button variant="primarySmall" onClick={handleSaveWindow} disabled={!effectiveExamId || saving}>
                {saving ? "Saving…" : win.data ? "Update window" : "Create window"}
              </Button>
            </div>
          </div>
          {saveError && <p className="mt-2 text-[12px] text-danger-fg">{saveError.message}</p>}
        </Card>
      )}

      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold text-muted">Applicable examinations</span>
        {APPLICABLE_EXAMS.map((exam) => (
          <button
            key={exam}
            type="button"
            onClick={() => toggleApplicable(exam)}
            className={cn(
              "rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors",
              applicableExams.has(exam) ? "border-border-accent bg-accent-50 text-primary" : "border-border-default bg-surface text-muted",
            )}
          >
            {exam}
          </button>
        ))}
        <span className="text-[11px] text-subtle">(not persisted anywhere)</span>
      </div>

      <div className="flex items-center gap-6 border-b border-divider">
        {[
          { key: "photocopy" as const, label: `Photocopy applications (${photocopyRows.length})` },
          { key: "revaluation" as const, label: `Revaluation applications (${requests.data?.length ?? 0})` },
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
          </button>
        ))}
      </div>

      {tab === "photocopy" ? (
        photocopy.isLoading ? (
          <SkeletonTable rows={4} />
        ) : photocopy.isError ? (
          <Card className="border-danger-border bg-danger-bg">
            <p className="text-[13px] text-danger-fg">{(photocopy.error as Error).message}</p>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="border-b border-divider px-5 py-3">
              <p className="text-[13px] text-muted">Students who applied for the scanned copy of their answer script</p>
            </div>
            {photocopyRows.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-subtle">No photocopy applications yet.</p>
            ) : (
              <div className="flex flex-col">
                {photocopyRows.map((r: PhotocopyRequest) => {
                  const done = r.status === "issued" || r.status === "rejected";
                  const mapping = r.exam_marks.exam_subject_mapping;
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3.5 last:border-0">
                      <div>
                        <div className="text-[13.5px] font-bold text-ink">
                          PC-{r.id} · {studentName(r.students) ?? "—"} · {r.students.register_no ?? r.students.student_id_no}
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          {mapping.subjects.subject_code} · {mapping.subjects.name} · Applied {DATE_LABEL.format(new Date(r.applied_at))} · ₹
                          {r.fee_amount}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="primarySmall"
                          disabled={done || updatePhotocopy.isPending}
                          onClick={() => updatePhotocopy.mutate({ id: r.id, status: "issued" })}
                        >
                          {r.status === "issued" ? "Issued" : "Issue copy"}
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-auto"
                          disabled={done || updatePhotocopy.isPending}
                          onClick={() => updatePhotocopy.mutate({ id: r.id, status: "rejected" })}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )
      ) : requests.isLoading ? (
        <SkeletonTable rows={4} />
      ) : requests.isError ? (
        <Card className="border-danger-border bg-danger-bg">
          <p className="text-[13px] text-danger-fg">{(requests.error as Error).message}</p>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3">
            <p className="text-[13px] text-muted">Students who applied for revaluation</p>
            <p className="text-[12.5px] text-muted">
              {revalStats.active} active · Fee collected ₹{revalStats.feeCollected.toLocaleString("en-IN")} · {revalStats.papers} papers
            </p>
          </div>
          {(requests.data?.length ?? 0) === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No revaluation requests submitted yet.</p>
          ) : (
            <div className="flex flex-col">
              {requests.data!.map((r) => {
                const mapping = r.exam_marks.exam_subject_mapping;
                const terminal = isTerminal(r.status);
                const revisedInput = revisedMarksById[r.id] ?? (r.revised_marks != null ? String(r.revised_marks) : "");
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4 last:border-0">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-bold text-ink">
                        RV-{r.id} · {studentName(r.students) ?? "—"} · {r.students.register_no ?? r.students.student_id_no}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                        <span>
                          {mapping.subjects.subject_code} · {mapping.subjects.name} · Evaluator:
                        </span>
                        {r.faculty ? (
                          <span className="font-semibold text-ink">
                            {r.faculty.first_name} {r.faculty.last_name}
                          </span>
                        ) : terminal ? (
                          <span>Unassigned</span>
                        ) : (
                          <select
                            defaultValue=""
                            disabled={updateRequest.isPending}
                            onChange={(e) => e.target.value && updateRequest.mutate({ id: r.id, evaluator_faculty_id: Number(e.target.value) })}
                            className="rounded-[6px] border border-border-default bg-surface px-1.5 py-0.5 text-[11.5px] text-ink focus:border-border-accent focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {(facultyDirectory.data ?? []).map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="flex items-center gap-1 font-mono text-[13px] text-ink">
                        <span>{r.exam_marks.marks_obtained ?? "—"}</span>
                        <span className="text-subtle">→</span>
                        {terminal ? (
                          <span>{r.revised_marks ?? "—"}</span>
                        ) : (
                          <input
                            value={revisedInput}
                            onChange={(e) => setRevisedMarksById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            onBlur={() => handleSaveRevisedMarks(r)}
                            placeholder="—"
                            className="w-12 rounded-[6px] border border-border-default bg-accent-50 px-1.5 py-0.5 text-center text-[13px] focus:border-border-accent focus:outline-none"
                          />
                        )}
                      </div>
                      <Badge tone={STATUS_TONE[r.status]}>{r.status.replace("_", " ").toUpperCase()}</Badge>
                      <Button
                        variant="primarySmall"
                        disabled={terminal || updateRequest.isPending}
                        onClick={() => updateRequest.mutate({ id: r.id, status: "approved" })}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-auto"
                        disabled={terminal || updateRequest.isPending}
                        onClick={() => updateRequest.mutate({ id: r.id, status: "rejected" })}
                      >
                        Reject
                      </Button>
                    </div>
                    {updateRequest.isError && updateRequest.variables?.id === r.id && (
                      <p className="mt-1.5 text-[12px] text-danger-fg">{(updateRequest.error as Error).message}</p>
                    )}
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
