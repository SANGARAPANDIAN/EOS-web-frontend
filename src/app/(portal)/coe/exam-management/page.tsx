"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useExams, useCreateExam, useUpdateExam, useExamSubjectMappings, type Exam, type ExamCategory } from "@/modules/coe/api/exams";
import { useExamTypes, useBatches } from "@/modules/coe/api/reference";
import { useExamRegistrations } from "@/modules/coe/api/examRegistrations";
import { downloadCsv } from "@/lib/utils/csv";
import { currencyShort } from "@/modules/admin/lib/format";
import { formatDate } from "@/lib/utils/format";

const CATEGORY_TABS: { key: "all" | ExamCategory; label: string }[] = [
  { key: "all", label: "All exams" },
  { key: "regular", label: "Regular" },
  { key: "arrear", label: "Arrear" },
  { key: "supplementary", label: "Supplementary" },
];

const STATUS_TONE: Record<Exam["status"], BadgeTone> = {
  created: "accent",
  timetable_published: "accentDark",
  completed: "neutral",
  results_published: "accentDark",
};

const STATUS_LABEL: Record<Exam["status"], string> = {
  created: "Draft",
  timetable_published: "Scheduled",
  completed: "Ongoing",
  results_published: "Completed",
};

const STATUS_OPTIONS: Exam["status"][] = ["created", "timetable_published", "completed", "results_published"];

export default function CoeExamManagementPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const batches = useBatches();
  const mappings = useExamSubjectMappings();
  const registrations = useExamRegistrations({});
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();

  const [category, setCategory] = useState<"all" | ExamCategory>("all");
  const [examTypeId, setExamTypeId] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const [status, setStatus] = useState<"all" | Exam["status"]>("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [viewing, setViewing] = useState<Exam | null>(null);

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);
  const batchesById = useMemo(() => new Map((batches.data ?? []).map((b) => [b.id, b])), [batches.data]);
  const mappingsByExam = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const m of mappings.data ?? []) {
      if (!map.has(m.exam_id)) map.set(m.exam_id, new Set());
      map.get(m.exam_id)!.add(m.subject_id);
    }
    return map;
  }, [mappings.data]);
  const registrationsByExam = useMemo(() => {
    const map = new Map<number, { total: number; paid: number }>();
    for (const r of registrations.data ?? []) {
      const cur = map.get(r.exam_id) ?? { total: 0, paid: 0 };
      cur.total += 1;
      if (r.fee_status === "paid") cur.paid += 1;
      map.set(r.exam_id, cur);
    }
    return map;
  }, [registrations.data]);

  const rows = useMemo(() => {
    let list = [...(exams.data ?? [])].sort((a, b) => b.id - a.id);
    if (category !== "all") list = list.filter((e) => e.exam_category === category);
    if (examTypeId !== "all") list = list.filter((e) => e.exam_type_id === Number(examTypeId));
    if (batchId !== "all") list = list.filter((e) => e.batch_id === Number(batchId));
    if (status !== "all") list = list.filter((e) => e.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          examTypesById.get(e.exam_type_id)?.name.toLowerCase().includes(q) ||
          examTypesById.get(e.exam_type_id)?.code?.toLowerCase().includes(q) ||
          e.academic_year.includes(q),
      );
    }
    return list;
  }, [exams.data, category, examTypeId, batchId, status, search, examTypesById]);

  const counts = useMemo(() => {
    const all = exams.data ?? [];
    const byYear = new Map<string, number>();
    for (const e of all) byYear.set(e.academic_year, (byYear.get(e.academic_year) ?? 0) + 1);
    const years = [...byYear.keys()].sort();
    const currentYear = years[years.length - 1];
    const previousYear = years[years.length - 2];
    const yearDelta = currentYear && previousYear ? (byYear.get(currentYear) ?? 0) - (byYear.get(previousYear) ?? 0) : null;

    const conductWindow = all.filter((e) => e.status === "completed").length;

    const openExams = all.filter((e) => e.registration_opens_at && e.registration_closes_at && new Date(e.registration_closes_at) > new Date());
    const nearestClose = openExams
      .map((e) => Math.ceil((new Date(e.registration_closes_at!).getTime() - Date.now()) / 86_400_000))
      .sort((a, b) => a - b)[0];

    let feeRaised = 0;
    let feePaidWeighted = 0;
    let feeTotalWeighted = 0;
    for (const e of all) {
      const reg = registrationsByExam.get(e.id);
      if (e.fee_amount != null && reg) {
        feeRaised += e.fee_amount * reg.total;
        feePaidWeighted += e.fee_amount * reg.paid;
        feeTotalWeighted += e.fee_amount * reg.total;
      }
    }
    const feeCollectedPct = feeTotalWeighted > 0 ? Math.round((feePaidWeighted / feeTotalWeighted) * 100) : null;

    return {
      total: all.length,
      regular: all.filter((e) => e.exam_category === "regular").length,
      arrear: all.filter((e) => e.exam_category === "arrear").length,
      supplementary: all.filter((e) => e.exam_category === "supplementary").length,
      active: all.filter((e) => e.status === "timetable_published" || e.status === "completed").length,
      registrationOpen: openExams.length,
      yearDelta,
      conductWindow,
      nearestClose,
      feeRaised,
      feeCollectedPct,
    };
  }, [exams.data, registrationsByExam]);

  function handleExport() {
    downloadCsv(
      "exam-management",
      [
        { header: "Exam", value: (e: Exam) => examTypesById.get(e.exam_type_id)?.name ?? `Exam #${e.id}` },
        { header: "Code", value: (e: Exam) => examTypesById.get(e.exam_type_id)?.code ?? "" },
        { header: "Category", value: (e: Exam) => e.exam_category ?? "regular" },
        { header: "Academic year", value: (e: Exam) => e.academic_year },
        { header: "Semester", value: (e: Exam) => e.semester },
        { header: "Registration opens", value: (e: Exam) => e.registration_opens_at?.slice(0, 10) ?? "" },
        { header: "Registration closes", value: (e: Exam) => e.registration_closes_at?.slice(0, 10) ?? "" },
        { header: "Courses", value: (e: Exam) => mappingsByExam.get(e.id)?.size ?? 0 },
        { header: "Candidates", value: (e: Exam) => registrationsByExam.get(e.id)?.total ?? 0 },
        { header: "Fee (per candidate)", value: (e: Exam) => e.fee_amount ?? "" },
        { header: "Status", value: (e: Exam) => STATUS_LABEL[e.status] },
      ],
      rows,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Exam Management"
        subtitle="Create and track regular, arrear and supplementary examinations across the academic year."
        actions={
          <>
            <Button variant="secondary" className="w-auto" onClick={handleExport}>
              Export
            </Button>
            <Button variant="primarySmall" className="w-auto" onClick={() => setShowNew(true)}>
              + New exam
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total exams"
          value={counts.total}
          icon="fact_check"
          delta={counts.yearDelta != null ? `${counts.yearDelta >= 0 ? "+" : ""}${counts.yearDelta}` : undefined}
          sub={counts.yearDelta != null ? "vs last year" : undefined}
        />
        <StatCard label="Active exams" value={counts.active} icon="play_circle" sub={`${counts.conductWindow} in conduct window`} />
        <StatCard
          label="Registration open"
          value={counts.registrationOpen}
          icon="how_to_reg"
          sub={counts.nearestClose != null ? `closes in ${counts.nearestClose} day${counts.nearestClose === 1 ? "" : "s"}` : undefined}
        />
        <StatCard
          label="Fee demand raised"
          value={counts.feeRaised > 0 ? currencyShort(counts.feeRaised) : "—"}
          icon="payments"
          sub={counts.feeCollectedPct != null ? `${counts.feeCollectedPct}% collected` : "fee data pending"}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <PillTabs
            options={CATEGORY_TABS.map((t) => ({
              ...t,
              label: t.key === "all" ? `${t.label} (${counts.total})` : `${t.label} (${counts[t.key]})`,
            }))}
            value={category}
            onChange={(k) => setCategory(k as typeof category)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search by exam name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[280px]" />
            <Select value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)} className="w-auto min-w-[140px]">
              <option value="all">All types</option>
              {(examTypes.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="w-auto min-w-[150px]">
              <option value="all">All programmes</option>
              {(batches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-auto min-w-[130px]">
              <option value="all">All status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {exams.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Exams</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No exams match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Exam</div>
                <div className="w-[100px]">Type</div>
                <div className="w-[170px]">Registration window</div>
                <div className="w-[80px]">Courses</div>
                <div className="w-[90px]">Candidates</div>
                <div className="w-[90px]">Fee</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[110px] text-right">Actions</div>
              </div>
              {rows.map((e) => {
                const courses = mappingsByExam.get(e.id)?.size ?? 0;
                const reg = registrationsByExam.get(e.id);
                const candidates = reg?.total ?? 0;
                const batch = batchesById.get(e.batch_id);
                const examType = examTypesById.get(e.exam_type_id);
                const feeTotal = e.fee_amount != null && candidates > 0 ? e.fee_amount * candidates : null;
                return (
                  <div key={e.id} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold text-ink">
                        {examType?.name || `Exam #${e.id}`} · {e.academic_year} · Sem {e.semester}
                      </div>
                      <div className="text-[11.5px] text-muted">{examType?.code ?? batch?.name ?? `Batch #${e.batch_id}`}</div>
                    </div>
                    <div className="w-[100px]">
                      <Badge tone="neutral">{(e.exam_category ?? "regular").toUpperCase()}</Badge>
                    </div>
                    <div className="w-[170px] text-[12px] text-ink">
                      {e.registration_opens_at && e.registration_closes_at
                        ? `${formatDate(e.registration_opens_at)} – ${formatDate(e.registration_closes_at)}`
                        : "Not scheduled"}
                    </div>
                    <div className="w-[80px] text-[12.5px] text-ink">{courses}</div>
                    <div className="w-[90px] text-[12.5px] text-ink">{candidates}</div>
                    <div className="w-[90px] text-[12.5px] text-ink">{feeTotal != null ? currencyShort(feeTotal) : "—"}</div>
                    <div className="w-[110px]">
                      <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status].toUpperCase()}</Badge>
                    </div>
                    <div className="flex w-[110px] items-center justify-end gap-3 text-[12.5px] font-bold text-primary">
                      <button type="button" className="cursor-pointer hover:underline" onClick={() => setViewing(e)}>
                        View
                      </button>
                      <button type="button" className="cursor-pointer hover:underline" onClick={() => setEditing(e)}>
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <NewExamModal open={showNew} onClose={() => setShowNew(false)} createExam={createExam} />
      {editing && <EditExamModal exam={editing} onClose={() => setEditing(null)} updateExam={updateExam} />}
      {viewing && (
        <ViewExamModal
          exam={viewing}
          onClose={() => setViewing(null)}
          examTypeName={examTypesById.get(viewing.exam_type_id)?.name}
          batchName={batchesById.get(viewing.batch_id)?.name}
          courses={mappingsByExam.get(viewing.id)?.size ?? 0}
          candidates={registrationsByExam.get(viewing.id)?.total ?? 0}
        />
      )}
    </div>
  );
}

function NewExamModal({ open, onClose, createExam }: { open: boolean; onClose: () => void; createExam: ReturnType<typeof useCreateExam> }) {
  const examTypes = useExamTypes();
  const batches = useBatches();
  const [title, setTitle] = useState("");
  const [examTypeId, setExamTypeId] = useState("");
  const [category, setCategory] = useState<ExamCategory>("regular");
  const [batchId, setBatchId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("1");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [notes, setNotes] = useState("");

  function handleClose() {
    createExam.reset();
    onClose();
  }

  function handleCreate() {
    createExam.mutate(
      {
        title: title.trim() || undefined,
        exam_type_id: Number(examTypeId),
        batch_id: Number(batchId),
        academic_year: academicYear,
        semester: Number(semester),
        exam_category: category,
        registration_opens_at: opensAt || undefined,
        registration_closes_at: closesAt || undefined,
        fee_amount: feeAmount ? Number(feeAmount) : undefined,
        notes_to_students: notes.trim() || undefined,
      },
      { onSuccess: handleClose },
    );
  }

  const canCreate = examTypeId !== "" && batchId !== "" && /^\d{4}-\d{4}$/.test(academicYear);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create examination"
      subtitle="Set the exam identity, window and fee rule. Every subject already assigned for this batch/semester is mapped automatically."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Exam name</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. End Semester Nov 2026" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Exam type</label>
            <Select value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)}>
              <option value="">Select…</option>
              {(examTypes.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as ExamCategory)}>
              <option value="regular">Regular</option>
              <option value="arrear">Arrear</option>
              <option value="supplementary">Supplementary</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Batch</label>
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Select…</option>
            {(batches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Academic year / semester</label>
          <div className="grid grid-cols-2 gap-4">
            <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2026-2027" />
            <Input type="number" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Semester" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Registration opens</label>
            <input type="date" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Registration closes</label>
            <input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee per candidate (₹)</label>
          <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="e.g. 4700" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Notes to students</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Shown on this exam's detail view"
            rows={2}
            className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
          />
        </div>
        {createExam.isError && <p className="text-[12px] text-danger-fg">{(createExam.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!canCreate || createExam.isPending} onClick={handleCreate}>
            {createExam.isPending ? "Creating…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EditExamModal({ exam, onClose, updateExam }: { exam: Exam; onClose: () => void; updateExam: ReturnType<typeof useUpdateExam> }) {
  const [title, setTitle] = useState(exam.title ?? "");
  const [academicYear, setAcademicYear] = useState(exam.academic_year);
  const [semester, setSemester] = useState(String(exam.semester));
  const [category, setCategory] = useState<ExamCategory>(exam.exam_category ?? "regular");
  const [opensAt, setOpensAt] = useState(exam.registration_opens_at?.slice(0, 10) ?? "");
  const [closesAt, setClosesAt] = useState(exam.registration_closes_at?.slice(0, 10) ?? "");
  const [feeAmount, setFeeAmount] = useState(exam.fee_amount != null ? String(exam.fee_amount) : "");
  const [notes, setNotes] = useState(exam.notes_to_students ?? "");

  function handleClose() {
    updateExam.reset();
    onClose();
  }

  function handleSave() {
    updateExam.mutate(
      {
        id: exam.id,
        input: {
          title: title.trim() || undefined,
          academic_year: academicYear,
          semester: Number(semester),
          exam_category: category,
          registration_opens_at: opensAt || undefined,
          registration_closes_at: closesAt || undefined,
          fee_amount: feeAmount ? Number(feeAmount) : undefined,
          notes_to_students: notes.trim() || undefined,
        },
      },
      { onSuccess: handleClose },
    );
  }

  const canSave = /^\d{4}-\d{4}$/.test(academicYear) && Number(semester) >= 1;

  return (
    <Modal open onClose={handleClose} title="Edit examination" subtitle="Update the exam identity, window and fee rule.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Exam name</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. End Semester Nov 2026" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Category</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ExamCategory)}>
            <option value="regular">Regular</option>
            <option value="arrear">Arrear</option>
            <option value="supplementary">Supplementary</option>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Academic year / semester</label>
          <div className="grid grid-cols-2 gap-4">
            <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2026-2027" />
            <Input type="number" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Semester" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Registration opens</label>
            <input type="date" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Registration closes</label>
            <input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee per candidate (₹)</label>
          <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="e.g. 4700" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Notes to students</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Shown on this exam's detail view"
            rows={2}
            className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink focus:border-border-accent focus:outline-none"
          />
        </div>
        {updateExam.isError && <p className="text-[12px] text-danger-fg">{(updateExam.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!canSave || updateExam.isPending} onClick={handleSave}>
            {updateExam.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ViewExamModal({
  exam,
  onClose,
  examTypeName,
  batchName,
  courses,
  candidates,
}: {
  exam: Exam;
  onClose: () => void;
  examTypeName?: string;
  batchName?: string;
  courses: number;
  candidates: number;
}) {
  const rows: [string, string][] = [
    ...(exam.title ? ([["Exam name", exam.title]] as [string, string][]) : []),
    ["Exam type", examTypeName ?? `#${exam.exam_type_id}`],
    ["Batch", batchName ?? `#${exam.batch_id}`],
    ["Academic year", exam.academic_year],
    ["Semester", String(exam.semester)],
    ["Category", (exam.exam_category ?? "regular").toUpperCase()],
    ["Status", STATUS_LABEL[exam.status]],
    ["Registration opens", exam.registration_opens_at ? formatDate(exam.registration_opens_at) : "Not scheduled"],
    ["Registration closes", exam.registration_closes_at ? formatDate(exam.registration_closes_at) : "Not scheduled"],
    ["Courses mapped", String(courses)],
    ["Candidates registered", String(candidates)],
    ["Fee per candidate", exam.fee_amount != null ? currencyShort(exam.fee_amount) : "—"],
  ];

  return (
    <Modal open onClose={onClose} title={`${examTypeName ?? "Exam"} · ${exam.academic_year}`} subtitle={`Sem ${exam.semester}`}>
      <div className="flex flex-col gap-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-divider py-2 last:border-0">
            <span className="text-[12.5px] font-semibold text-muted">{label}</span>
            <span className="text-[13px] font-bold text-ink">{value}</span>
          </div>
        ))}
        {exam.notes_to_students && (
          <div className="pt-1">
            <span className="text-[12.5px] font-semibold text-muted">Notes to students</span>
            <p className="mt-1 text-[13px] text-ink">{exam.notes_to_students}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
