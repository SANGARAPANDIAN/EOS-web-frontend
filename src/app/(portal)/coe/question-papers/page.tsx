"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Banner, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExams, type Exam } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useFacultyDirectory, type FacultyDirectoryEntry } from "@/modules/coe/api/faculty";
import {
  useQuestionPapers,
  useQuestionPaperStats,
  useUpsertQuestionPaper,
  useRemindQuestionPaperSetter,
  type QuestionPaperRow,
  type QuestionPaperStatus,
} from "@/modules/coe/api/questionPapers";

type TabKey = "all" | QuestionPaperStatus;
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All papers" },
  { key: "awaiting_upload", label: "Awaiting upload" },
  { key: "under_moderation", label: "Under moderation" },
  { key: "sealed", label: "Sealed" },
];

const STATUS_LABEL: Record<QuestionPaperStatus, string> = { sealed: "Sealed", under_moderation: "Submitted", awaiting_upload: "Awaiting" };

function examLabel(e: Exam): string {
  return `${e.exam_category} · ${e.academic_year} · Sem ${e.semester}`;
}

export default function CoeQuestionPapersPage() {
  const exams = useExams();
  const departments = useDepartments();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const [requestOpen, setRequestOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<QuestionPaperRow | null>(null);
  const [remindError, setRemindError] = useState<string | null>(null);

  const stats = useQuestionPaperStats(examFilter);
  // Unfiltered-by-tab fetch — tab/search/department are applied client-side, same pattern as the other rebuilt COE pages.
  const papers = useQuestionPapers(examFilter, {});
  const allRows = papers.data ?? [];

  const tabCounts = {
    all: allRows.length,
    awaiting_upload: allRows.filter((r) => r.status === "awaiting_upload").length,
    under_moderation: allRows.filter((r) => r.status === "under_moderation").length,
    sealed: allRows.filter((r) => r.status === "sealed").length,
  };

  const filtered = allRows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (departmentId != null && r.department?.id !== departmentId) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const setterName = r.setter ? `${r.setter.first_name} ${r.setter.last_name}` : "";
      const hay = [r.subject.subject_code, r.subject.name, setterName].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE)));
  const pageRows = filtered.slice((currentPage - 1) * DEFAULT_PAGE_SIZE, currentPage * DEFAULT_PAGE_SIZE);

  function resetToFirstPage() {
    setPage(1);
  }

  function handleExport() {
    downloadCsv(
      "question-papers",
      [
        { header: "Course code", value: (r: QuestionPaperRow) => r.subject.subject_code },
        { header: "Course name", value: (r: QuestionPaperRow) => r.subject.name },
        { header: "Department", value: (r: QuestionPaperRow) => r.department?.code ?? "" },
        { header: "Setter", value: (r: QuestionPaperRow) => (r.setter ? `${r.setter.first_name} ${r.setter.last_name}` : "") },
        { header: "Sets", value: (r: QuestionPaperRow) => r.sets_count },
        { header: "Moderator", value: (r: QuestionPaperRow) => (r.moderator ? `${r.moderator.first_name} ${r.moderator.last_name}` : "") },
        { header: "Vault", value: (r: QuestionPaperRow) => (r.vaulted ? "Strong room" : "Pending") },
        { header: "Status", value: (r: QuestionPaperRow) => STATUS_LABEL[r.status] },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Question Papers"
        subtitle="Secure setter upload, moderation, sealing and hall-wise distribution tracking."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setRequestOpen(true)}>
              <Icon name="add" size={16} />
              Request paper
            </Button>
          </>
        }
      />

      {remindError && (
        <Banner className="border-danger-border bg-danger-bg text-danger-fg">
          <div className="flex items-center justify-between gap-3">
            <span>{remindError}</span>
            <button type="button" className="font-bold hover:underline" onClick={() => setRemindError(null)}>
              Dismiss
            </button>
          </div>
        </Banner>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Papers required" value={stats.data?.required ?? 0} icon="description" sub="Set A+B per course" />
        <StatCard
          label="Sealed & vaulted"
          value={stats.data?.sealed ?? 0}
          icon="lock"
          sub={stats.data?.required ? `${Math.round((stats.data.sealed / stats.data.required) * 1000) / 10}% complete` : undefined}
        />
        <StatCard
          label="Awaiting setter upload"
          value={stats.data?.awaiting_upload ?? 0}
          icon="upload"
          sub={
            stats.data
              ? stats.data.awaiting_flagged > 0
                ? `${stats.data.awaiting_flagged} setters flagged`
                : `${stats.data.awaiting_without_setter} without a setter`
              : undefined
          }
        />
        <StatCard
          label="Distribution ready"
          value={stats.data?.distribution_ready ?? 0}
          icon="local_shipping"
          sub={stats.data?.distribution_total ? `of ${stats.data.distribution_total} sessions` : undefined}
        />
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-7 border-b border-divider px-5 pt-4">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  resetToFirstPage();
                }}
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
          <SearchBar
            placeholder="Search by course code or setter…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetToFirstPage();
            }}
            className="max-w-[300px]"
          />
          <Select
            value={departmentId ?? ""}
            onChange={(e) => {
              setDepartmentId(e.target.value ? Number(e.target.value) : null);
              resetToFirstPage();
            }}
            className="w-auto min-w-[150px]"
          >
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select
            value={examFilter ?? ""}
            onChange={(e) => {
              setExamFilter(e.target.value ? Number(e.target.value) : null);
              resetToFirstPage();
            }}
            className="w-auto min-w-[140px]"
          >
            <option value="">All exams</option>
            {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
              <option key={e.id} value={e.id}>
                {examLabel(e)}
              </option>
            ))}
          </Select>
          <Select
            value={tab}
            onChange={(e) => {
              setTab(e.target.value as TabKey);
              resetToFirstPage();
            }}
            className="w-auto min-w-[130px]"
          >
            <option value="all">All status</option>
            <option value="awaiting_upload">Awaiting</option>
            <option value="under_moderation">Submitted</option>
            <option value="sealed">Sealed</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {papers.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No courses match the current filters.</p>
        ) : (
          <>
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Course</div>
                <div className="w-[150px]">Setter</div>
                <div className="w-[60px]">Sets</div>
                <div className="w-[150px]">Moderator</div>
                <div className="w-[120px]">Vault</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[90px] text-right"> </div>
              </div>
              {pageRows.map((r) => (
                <QuestionPaperRowView
                  key={r.exam_subject_mapping_id}
                  row={r}
                  onEdit={() => setEditingRow(r)}
                  onRemindError={(message) => setRemindError(message)}
                />
              ))}
            </div>

            <Pagination page={currentPage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <RequestPaperModal open={requestOpen} onClose={() => setRequestOpen(false)} />
      <ManagePaperModal row={editingRow} onClose={() => setEditingRow(null)} />
    </div>
  );
}

function QuestionPaperRowView({
  row: r,
  onEdit,
  onRemindError,
}: {
  row: QuestionPaperRow;
  onEdit: () => void;
  onRemindError: (message: string | null) => void;
}) {
  const remind = useRemindQuestionPaperSetter();

  async function handleRemind() {
    onRemindError(null);
    try {
      await remind.mutateAsync(r.exam_subject_mapping_id);
    } catch (err) {
      onRemindError((err as Error).message || "Could not send a reminder for this course.");
    }
  }

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">
          {r.subject.subject_code} · {r.subject.name}
        </div>
        <div className="truncate text-[11.5px] text-muted">
          {r.department?.code ?? "—"} · Semester {r.semester ?? "—"}
        </div>
      </div>
      <div className="w-[150px] min-w-0 shrink-0">
        {r.setter ? (
          <span className="block truncate text-[12.5px] text-ink">
            {r.setter.first_name} {r.setter.last_name}
          </span>
        ) : (
          <>
            <div className="text-[12.5px] text-ink">—</div>
            <div className="text-[11px] text-muted">Not uploaded</div>
          </>
        )}
      </div>
      <div className="w-[60px] shrink-0 text-[12.5px] text-ink">{r.sets_count}</div>
      <div className="w-[150px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{r.moderator ? `${r.moderator.first_name} ${r.moderator.last_name}` : "—"}</div>
      <div className="w-[120px] min-w-0 shrink-0">
        <Badge tone="neutral" className="max-w-full truncate">
          {r.vaulted ? "Strong room" : "Pending"}
        </Badge>
      </div>
      <div className="w-[110px] min-w-0 shrink-0">
        <Badge tone={r.status === "sealed" ? "accentDark" : "accent"} className="max-w-full truncate">
          {STATUS_LABEL[r.status]}
        </Badge>
      </div>
      <div className="flex w-[90px] shrink-0 justify-end">
        {r.status === "sealed" && (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onEdit}>
            Track
          </button>
        )}
        {r.status === "under_moderation" && (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onEdit}>
            Moderate
          </button>
        )}
        {r.status === "awaiting_upload" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
            disabled={remind.isPending}
            onClick={handleRemind}
          >
            Remind
          </button>
        )}
      </div>
    </div>
  );
}

function FacultySearchInput({
  value,
  onSelect,
  placeholder,
}: {
  value: FacultyDirectoryEntry | null;
  onSelect: (f: FacultyDirectoryEntry | null) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const directory = useFacultyDirectory({ search: text });

  // Re-hydrate the visible text whenever a different faculty member is selected —
  // deliberate one-shot sync, not the external-sync setState the rule targets.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => setText(value?.name ?? ""), [value?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  return (
    <div className="relative">
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onSelect(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
      />
      {open && text.trim() && (
        <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-input border border-border-default bg-surface shadow-modal">
          {(directory.data ?? []).length === 0 ? (
            <div className="px-3 py-2.5 text-[12.5px] text-muted">No faculty found.</div>
          ) : (
            (directory.data ?? []).map((f) => (
              <button
                key={f.id}
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-subtle"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(f);
                  setText(f.name);
                  setOpen(false);
                }}
              >
                <span className="text-[13px] font-bold text-ink">{f.name}</span>
                <span className="text-[11px] text-muted">{[f.department_code, f.designation].filter(Boolean).join(" · ")}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const SET_OPTIONS = [
  { value: 1, label: "1 set" },
  { value: 2, label: "2 sets (A & B)" },
];

function RequestPaperModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const exams = useExams();
  const upsert = useUpsertQuestionPaper();

  const sortedExams = [...(exams.data ?? [])].sort((a, b) => b.id - a.id);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [setter, setSetter] = useState<FacultyDirectoryEntry | null>(null);
  const [setsCount, setSetsCount] = useState(2);
  const [dueDate, setDueDate] = useState("");

  // One-shot default: pick the most recent exam the first time the modal opens
  // with none selected yet — not an external-data sync.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (open && examId == null && sortedExams.length > 0) setExamId(sortedExams[0].id);
  }, [open, sortedExams.length]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const papersForExam = useQuestionPapers(examId, {});
  const matchedMapping = useMemo(() => {
    const code = courseCode.trim().toLowerCase();
    if (!code) return null;
    return (papersForExam.data ?? []).find((r) => r.subject.subject_code.toLowerCase() === code) ?? null;
  }, [courseCode, papersForExam.data]);

  function reset() {
    setExamId(null);
    setCourseCode("");
    setSetter(null);
    setSetsCount(2);
    setDueDate("");
    upsert.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!matchedMapping || !setter) return;
    upsert.mutate(
      {
        exam_subject_mapping_id: matchedMapping.exam_subject_mapping_id,
        setter_faculty_id: setter.id,
        sets_count: setsCount,
        status: "awaiting_upload",
        due_date: dueDate || undefined,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Request a question paper" subtitle="Sends a secure upload link to the setter. Files are encrypted until the moderation window opens.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Course code *</label>
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="e.g. 23CS601"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {courseCode.trim() && !matchedMapping && (
            <p className="mt-1.5 text-[12px] text-danger-fg">No course with this code in the selected examination.</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Examination</label>
          <select
            value={examId ?? ""}
            onChange={(e) => {
              setExamId(e.target.value ? Number(e.target.value) : null);
              setCourseCode("");
            }}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {sortedExams.map((e) => (
              <option key={e.id} value={e.id}>
                {examLabel(e)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Setter *</label>
          <FacultySearchInput value={setter} onSelect={setSetter} placeholder="Search internal or external setter" />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Number of sets</label>
          <select
            value={setsCount}
            onChange={(e) => setSetsCount(Number(e.target.value))}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {SET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-[12px] text-subtle">Setter receives a reminder 3 days before the due date.</p>
        </div>

        {upsert.isError && <p className="text-[12px] text-danger-fg">{(upsert.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!matchedMapping || !setter || upsert.isPending} onClick={handleSave}>
            {upsert.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ManagePaperModal({ row, onClose }: { row: QuestionPaperRow | null; onClose: () => void }) {
  const upsert = useUpsertQuestionPaper();
  const [moderator, setModerator] = useState<FacultyDirectoryEntry | null>(null);
  const [setsCount, setSetsCount] = useState(2);
  const [status, setStatus] = useState<QuestionPaperStatus>("under_moderation");

  // Re-hydrate the form whenever a different row is opened for management —
  // deliberate one-shot hydration on row change, not an external-data sync.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!row) return;
    setModerator(row.moderator ? { id: row.moderator.id, name: `${row.moderator.first_name} ${row.moderator.last_name}`, designation: "", department_id: 0, department_name: "", department_code: "" } : null);
    setSetsCount(row.sets_count || 2);
    setStatus(row.status);
  }, [row?.exam_subject_mapping_id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function handleClose() {
    upsert.reset();
    onClose();
  }

  function handleSave() {
    if (!row) return;
    upsert.mutate(
      { exam_subject_mapping_id: row.exam_subject_mapping_id, moderator_faculty_id: moderator?.id, sets_count: setsCount, status },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={row != null}
      onClose={handleClose}
      title={row ? `${row.subject.subject_code} · ${row.subject.name}` : ""}
      subtitle={row?.status === "sealed" ? "Sealed & vaulted — moderator, sets and vault status." : "Assign a moderator, confirm sets, then mark it sealed."}
    >
      {row && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Setter</label>
            <div className="w-full rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink">
              {row.setter ? `${row.setter.first_name} ${row.setter.last_name}` : "—"}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Moderator</label>
            <FacultySearchInput value={moderator} onSelect={setModerator} placeholder="Search moderator" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Sets</label>
            <select
              value={setsCount}
              onChange={(e) => setSetsCount(Number(e.target.value))}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            >
              {SET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as QuestionPaperStatus)}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            >
              <option value="under_moderation">Under moderation</option>
              <option value="sealed">Sealed &amp; vaulted</option>
            </select>
          </div>

          {upsert.isError && <p className="text-[12px] text-danger-fg">{(upsert.error as Error).message}</p>}

          <div className="flex gap-3 border-t border-divider pt-5">
            <Button variant="primarySmall" className="flex-[2] py-3" disabled={upsert.isPending} onClick={handleSave}>
              {upsert.isPending ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
