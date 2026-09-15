"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useDepartments } from "@/modules/shared/api/departments";
import { usePassRules } from "@/modules/coe/api/settings";
import { useFacultyDirectory, type FacultyDirectoryEntry } from "@/modules/coe/api/faculty";
import { useMarksRoster } from "@/modules/coe/api/marksRoster";
import { useCreateExamMark, useUpdateExamMark } from "@/modules/coe/api/marks";
import {
  useCourseMarkStatus,
  useSetMarksEntryLock,
  useVerifyMapping,
  type CourseMarkStatusRow,
  type CourseMarkType,
  type CourseMarkRowStatus,
} from "@/modules/coe/api/marksRoster";

type TabKey = "all" | "in_progress" | "awaiting_verification" | "locked";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All courses" },
  { key: "in_progress", label: "Entry in progress" },
  { key: "awaiting_verification", label: "Awaiting verification" },
  { key: "locked", label: "Locked" },
];

const MARK_TYPE_LABEL: Record<CourseMarkType, string> = { internal: "Internal", external: "External", practical: "Practical" };
const STATUS_LABEL: Record<CourseMarkRowStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  verified: "Verified",
  locked: "Locked",
};

export default function CoeMarksManagementPage() {
  const departments = useDepartments();
  const status = useCourseMarkStatus(null);
  const allRows = status.data?.rows ?? [];

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [markType, setMarkType] = useState<"all" | CourseMarkType>("all");
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const [enterOpen, setEnterOpen] = useState(false);
  const [viewRow, setViewRow] = useState<CourseMarkStatusRow | null>(null);
  const [entryRow, setEntryRow] = useState<CourseMarkStatusRow | null>(null);
  const [verifyRow, setVerifyRow] = useState<CourseMarkStatusRow | null>(null);

  const tabCounts = {
    all: allRows.length,
    in_progress: allRows.filter((r) => r.status === "in_progress" || r.status === "not_started").length,
    awaiting_verification: allRows.filter((r) => r.status === "submitted").length,
    locked: allRows.filter((r) => r.status === "locked").length,
  };

  const filtered = allRows.filter((r) => {
    if (tab === "in_progress" && r.status !== "in_progress" && r.status !== "not_started") return false;
    if (tab === "awaiting_verification" && r.status !== "submitted") return false;
    if (tab === "locked" && r.status !== "locked") return false;
    if (departmentId != null && r.department.id !== departmentId) return false;
    if (markType !== "all" && r.mark_type !== markType) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [r.subject.subject_code, r.subject.name, r.entered_by, r.verified_by].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  const mainRows = allRows.filter((r) => r.mark_type !== "internal");
  const internalRows = allRows.filter((r) => r.mark_type === "internal");
  const practicalRows = allRows.filter((r) => r.mark_type === "practical");
  const lockedMain = mainRows.filter((r) => r.status === "locked").length;
  const internalEntered = internalRows.reduce((s, r) => s + r.entered_count, 0);
  const internalTotal = internalRows.reduce((s, r) => s + r.total_students, 0);
  const practicalEntered = practicalRows.reduce((s, r) => s + r.entered_count, 0);
  const practicalTotal = practicalRows.reduce((s, r) => s + r.total_students, 0);
  const practicalPending = practicalRows.filter((r) => r.status !== "locked" && r.entered_count < r.total_students).length;

  function handleExport() {
    downloadCsv(
      "marks-management",
      [
        { header: "Course", value: (r: CourseMarkStatusRow) => `${r.subject.subject_code} · ${r.subject.name}` },
        { header: "Mark type", value: (r: CourseMarkStatusRow) => MARK_TYPE_LABEL[r.mark_type] },
        { header: "Entered by", value: (r: CourseMarkStatusRow) => r.entered_by ?? "" },
        { header: "Entered", value: (r: CourseMarkStatusRow) => `${r.entered_count}/${r.total_students}` },
        { header: "Verified by", value: (r: CourseMarkStatusRow) => r.verified_by ?? "" },
        { header: "Status", value: (r: CourseMarkStatusRow) => STATUS_LABEL[r.status] },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Marks Management"
        subtitle="Internal, external and practical mark entry, verification, approval and lock."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setEnterOpen(true)}>
              <Icon name="add" size={16} />
              Enter marks
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Courses locked"
          value={`${lockedMain} / ${mainRows.length}`}
          icon="lock"
          sub={mainRows.length ? `${Math.round((lockedMain / mainRows.length) * 1000) / 10}% signed off` : undefined}
          loading={status.isLoading}
        />
        <StatCard
          label="Internal marks"
          value={internalEntered}
          icon="edit_note"
          sub={internalTotal ? `${Math.round((internalEntered / internalTotal) * 1000) / 10}% uploaded` : undefined}
          loading={status.isLoading}
        />
        <StatCard
          label="Practical marks"
          value={`${practicalEntered} / ${practicalTotal}`}
          icon="science"
          sub={practicalPending > 0 ? `${practicalPending} pending labs` : undefined}
          loading={status.isLoading}
        />
        <StatCard label="Awaiting verification" value={tabCounts.awaiting_verification} icon="fact_check" sub="submitted, not yet verified" loading={status.isLoading} />
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
          <SearchBar placeholder="Search course code or faculty…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={departmentId ?? ""} onChange={(e) => changeFilter(setDepartmentId, e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[150px]">
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={markType} onChange={(e) => changeFilter(setMarkType, e.target.value as typeof markType)} className="w-auto min-w-[130px]">
            <option value="all">All types</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="practical">Practical</option>
          </Select>
          <Select value={tab} onChange={(e) => changeFilter(setTab, e.target.value as TabKey)} className="w-auto min-w-[150px]">
            <option value="all">All status</option>
            <option value="in_progress">In progress</option>
            <option value="awaiting_verification">Submitted</option>
            <option value="locked">Locked</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {status.isLoading ? (
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
              <div className="w-[110px]">Mark type</div>
              <div className="w-[140px]">Entered by</div>
              <div className="w-[100px]">Entered</div>
              <div className="w-[140px]">Verified by</div>
              <div className="w-[110px]">Status</div>
              <div className="w-[70px] text-right"> </div>
            </div>
            {pageRows.map((r) => (
              <MarksManagementRow
                key={`${r.exam_subject_mapping_id}-${r.mark_type}`}
                row={r}
                onView={() => setViewRow(r)}
                onOpen={() => setEntryRow(r)}
                onVerify={() => setVerifyRow(r)}
              />
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <EnterMarksModal
        open={enterOpen}
        onClose={() => setEnterOpen(false)}
        rows={allRows}
        onResolved={(r) => {
          setEnterOpen(false);
          if (r.mark_type === "external") return;
          setEntryRow(r);
        }}
      />
      <RosterViewModal row={viewRow} onClose={() => setViewRow(null)} />
      <DirectEntryModal row={entryRow} onClose={() => setEntryRow(null)} />
      <VerifyModal row={verifyRow} onClose={() => setVerifyRow(null)} />
    </div>
  );
}

function MarksManagementRow({
  row: r,
  onView,
  onOpen,
  onVerify,
}: {
  row: CourseMarkStatusRow;
  onView: () => void;
  onOpen: () => void;
  onVerify: () => void;
}) {
  const setLock = useSetMarksEntryLock();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">
          {r.subject.subject_code} · {r.subject.name}
        </div>
        <div className="truncate text-[11.5px] text-muted">{r.total_students} candidates</div>
      </div>
      <div className="w-[110px] min-w-0 shrink-0">
        <Badge tone="neutral" className="max-w-full truncate">
          {MARK_TYPE_LABEL[r.mark_type]}
        </Badge>
      </div>
      <div className="w-[140px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{r.entered_by ?? "—"}</div>
      <div className="w-[100px] shrink-0 text-[12.5px] text-ink">
        {r.entered_count} / {r.total_students}
      </div>
      <div className="w-[140px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{r.verified_by ?? "—"}</div>
      <div className="w-[110px] min-w-0 shrink-0">
        <Badge tone={r.status === "locked" || r.status === "verified" ? "accentDark" : "accent"} className="max-w-full truncate">
          {STATUS_LABEL[r.status]}
        </Badge>
      </div>
      <div className="flex w-[70px] shrink-0 justify-end">
        {r.status === "locked" && (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onView}>
            View
          </button>
        )}
        {(r.status === "in_progress" || r.status === "not_started") &&
          (r.mark_type === "external" ? (
            <Link href="/coe/exam-valuation" className="text-[12.5px] font-bold text-primary hover:underline">
              Open
            </Link>
          ) : (
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onOpen}>
              Open
            </button>
          ))}
        {r.status === "submitted" && (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onVerify}>
            Verify
          </button>
        )}
        {r.status === "verified" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
            disabled={setLock.isPending}
            onClick={() => setLock.mutate({ exam_id: r.exam_id, department_id: r.department.id, is_locked: true })}
          >
            Lock
          </button>
        )}
      </div>
    </div>
  );
}

function EnterMarksModal({
  open,
  onClose,
  rows,
  onResolved,
}: {
  open: boolean;
  onClose: () => void;
  rows: CourseMarkStatusRow[];
  onResolved: (row: CourseMarkStatusRow) => void;
}) {
  const passRules = usePassRules();
  const [courseCode, setCourseCode] = useState("");
  const [markType, setMarkType] = useState<CourseMarkType>("internal");

  const matched = rows.find((r) => r.subject.subject_code.toLowerCase() === courseCode.trim().toLowerCase() && r.mark_type === markType) ?? null;
  const maxMarks = markType === "internal" ? passRules.data?.internal_max_marks : markType === "external" ? passRules.data?.external_max_marks : undefined;

  function reset() {
    setCourseCode("");
    setMarkType("internal");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleContinue() {
    if (!matched) return;
    onResolved(matched);
    reset();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Open a mark entry sheet" subtitle="Entry sheets are locked to the assigned faculty and auto-saved as you go.">
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
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Mark type</label>
          <select
            value={markType}
            onChange={(e) => setMarkType(e.target.value as CourseMarkType)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="internal">Internal assessment</option>
            <option value="external">External</option>
            <option value="practical">Practical</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Maximum marks</label>
          <div className="w-full rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink">{maxMarks ?? "—"}</div>
        </div>

        {courseCode.trim() && !matched && (
          <p className="text-[12px] text-danger-fg">No {MARK_TYPE_LABEL[markType].toLowerCase()} course found with this code.</p>
        )}
        {matched?.mark_type === "external" && (
          <p className="text-[12px] text-subtle">External marks are entered through blind script-bundle valuation — continuing takes you to Exam Valuation.</p>
        )}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!matched} onClick={handleContinue}>
            {matched?.mark_type === "external" ? "Go to Exam Valuation" : "Continue"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RosterViewModal({ row, onClose }: { row: CourseMarkStatusRow | null; onClose: () => void }) {
  const roster = useMarksRoster(row?.main_exam_subject_mapping_id ?? null);

  return (
    <Modal
      open={row != null}
      onClose={onClose}
      title={row ? `${row.subject.subject_code} · ${row.subject.name}` : ""}
      subtitle={row ? `${MARK_TYPE_LABEL[row.mark_type]} · ${row.total_students} candidates` : undefined}
    >
      {roster.isLoading ? (
        <p className="text-[13px] text-subtle">Loading…</p>
      ) : !roster.data || roster.data.roster.length === 0 ? (
        <p className="text-[13px] text-subtle">No marks recorded yet.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-divider text-left text-[10.5px] uppercase tracking-[.05em] text-subtle">
                <th className="px-2 py-2">Student</th>
                <th className="px-2 py-2 text-right">Internal</th>
                <th className="px-2 py-2 text-right">External</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {roster.data.roster.map((s) => (
                <tr key={s.student_id} className="border-b border-divider last:border-0">
                  <td className="px-2 py-2 font-bold text-ink">
                    {s.name ?? s.register_no}
                    <div className="text-[11px] font-normal text-muted">{s.register_no}</div>
                  </td>
                  <td className="px-2 py-2 text-right text-ink">{s.internal ? (s.internal.is_absent ? "AB" : (s.internal.marks_obtained ?? "—")) : "—"}</td>
                  <td className="px-2 py-2 text-right text-ink">{s.external ? (s.external.is_absent ? "AB" : (s.external.marks_obtained ?? "—")) : "—"}</td>
                  <td className="px-2 py-2 text-right font-bold text-ink">{s.total ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button variant="secondary" className="mt-4 w-auto" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}

function DirectEntryModal({ row, onClose }: { row: CourseMarkStatusRow | null; onClose: () => void }) {
  const roster = useMarksRoster(row?.main_exam_subject_mapping_id ?? null);
  const create = useCreateExamMark();
  const update = useUpdateExamMark();
  const [draft, setDraft] = useState<Record<number, { marks: string; absent: boolean }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const maxMarks = row?.mark_type === "internal" ? roster.data?.pass_rules?.internal_max_marks : (roster.data?.pass_rules?.external_max_marks ?? 100);

  // Re-hydrate the draft grid whenever a different course sheet is opened —
  // deliberate one-shot hydration on row change, not an external-data sync.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!roster.data) return;
    const next: Record<number, { marks: string; absent: boolean }> = {};
    for (const s of roster.data.roster) {
      const existing = row?.mark_type === "internal" ? s.internal : s.external;
      next[s.student_id] = { marks: existing?.marks_obtained != null ? String(existing.marks_obtained) : "", absent: existing?.is_absent ?? false };
    }
    setDraft(next);
  }, [roster.data, row?.exam_subject_mapping_id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function handleClose() {
    setDraft({});
    onClose();
  }

  async function handleSaveRow(studentId: number, existingMarkId: number | undefined) {
    if (!row || !maxMarks) return;
    const d = draft[studentId];
    if (!d) return;
    setSavingId(studentId);
    try {
      if (existingMarkId) {
        await update.mutateAsync({ id: existingMarkId, marks_obtained: d.absent ? undefined : Number(d.marks) || 0, max_marks: maxMarks });
      } else {
        await create.mutateAsync({
          exam_subject_mapping_id: row.exam_subject_mapping_id,
          student_id: studentId,
          marks_obtained: d.absent ? undefined : Number(d.marks) || 0,
          max_marks: maxMarks,
        });
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Modal
      open={row != null}
      onClose={handleClose}
      title={row ? `${row.subject.subject_code} · ${row.subject.name}` : ""}
      subtitle={row ? `${MARK_TYPE_LABEL[row.mark_type]} · max ${maxMarks ?? "—"} · ${row.total_students} candidates` : undefined}
    >
      {roster.isLoading ? (
        <p className="text-[13px] text-subtle">Loading…</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-divider text-left text-[10.5px] uppercase tracking-[.05em] text-subtle">
                <th className="px-2 py-2">Student</th>
                <th className="px-2 py-2">Marks</th>
                <th className="px-2 py-2">Absent</th>
                <th className="px-2 py-2 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {(roster.data?.roster ?? []).map((s) => {
                const existing = row?.mark_type === "internal" ? s.internal : s.external;
                const d = draft[s.student_id] ?? { marks: "", absent: false };
                return (
                  <tr key={s.student_id} className="border-b border-divider last:border-0">
                    <td className="px-2 py-2 font-bold text-ink">
                      {s.name ?? s.register_no}
                      <div className="text-[11px] font-normal text-muted">{s.register_no}</div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={d.marks}
                        disabled={d.absent}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [s.student_id]: { ...d, marks: e.target.value } }))}
                        className="w-20 rounded-input border border-border-default bg-surface px-2 py-1 text-[12.5px] disabled:bg-surface-subtle"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={d.absent}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [s.student_id]: { ...d, absent: e.target.checked } }))}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        className="text-[12px] font-bold text-primary hover:underline disabled:opacity-40"
                        disabled={savingId === s.student_id}
                        onClick={() => handleSaveRow(s.student_id, existing?.id)}
                      >
                        {savingId === s.student_id ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Button variant="secondary" className="mt-4 w-auto" onClick={handleClose}>
        Close
      </Button>
    </Modal>
  );
}

function VerifyModal({ row, onClose }: { row: CourseMarkStatusRow | null; onClose: () => void }) {
  const verify = useVerifyMapping();
  const [verifier, setVerifier] = useState<FacultyDirectoryEntry | null>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const directory = useFacultyDirectory({ search: text });

  function handleClose() {
    setVerifier(null);
    setText("");
    verify.reset();
    onClose();
  }

  function handleSave() {
    if (!row) return;
    verify.mutate({ exam_subject_mapping_id: row.exam_subject_mapping_id, verified_by_faculty_id: verifier?.id }, { onSuccess: handleClose });
  }

  return (
    <Modal open={row != null} onClose={handleClose} title={row ? `${row.subject.subject_code} · ${row.subject.name}` : ""} subtitle="Confirm every entered mark for this course is correct.">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Verified by</label>
          <input
            type="text"
            value={text}
            placeholder="Search by staff ID or name (optional)"
            onChange={(e) => {
              setText(e.target.value);
              setVerifier(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {open && text.trim() && (
            <div className="absolute z-10 mt-1 max-h-[180px] w-full overflow-y-auto rounded-input border border-border-default bg-surface shadow-modal">
              {(directory.data ?? []).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-subtle"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setVerifier(f);
                    setText(f.name);
                    setOpen(false);
                  }}
                >
                  <span className="text-[13px] font-bold text-ink">{f.name}</span>
                  <span className="text-[11px] text-muted">{[f.department_code, f.designation].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {verify.isError && <p className="text-[12px] text-danger-fg">{(verify.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={verify.isPending} onClick={handleSave}>
            {verify.isPending ? "Verifying…" : "Verify"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
