"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExams, useExamSubjectMappings } from "@/modules/coe/api/exams";
import { useSubjects, useClasses } from "@/modules/coe/api/reference";
import { useDepartments } from "@/modules/shared/api/departments";
import { useFacultyDirectory, type FacultyDirectoryEntry } from "@/modules/coe/api/faculty";
import {
  useScriptBundles,
  useAllScriptBundles,
  useBundleStats,
  useAllocateBundle,
  type BundleStatus,
  type ScriptBundle,
} from "@/modules/coe/api/scriptBundles";

type TabKey = "all" | "in_valuation" | "submitted" | "second_valuation";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All bundles" },
  { key: "in_valuation", label: "In valuation" },
  { key: "submitted", label: "Marks submitted" },
  { key: "second_valuation", label: "Second valuation" },
];

const STATUS_TONE: Record<BundleStatus, "accent" | "accentDark" | "neutral"> = { submitted: "accentDark", under_valuation: "accent", allotted: "neutral" };
const STATUS_LABEL: Record<BundleStatus, string> = { submitted: "Submitted", under_valuation: "Under valuation", allotted: "Allotted" };
const ACTION_LABEL: Record<BundleStatus, string> = { submitted: "Verify", under_valuation: "Open", allotted: "Allocate" };

const DEFAULT_BUNDLE_SIZE = 60;

export default function CoeExamValuationPage() {
  const exams = useExams();
  const departments = useDepartments();

  // No exam picker in this design — default to whichever exam actually has
  // the most script bundles, same real-data-first pattern as the other
  // rebuilt COE pages, instead of guessing the highest exam id.
  const allScriptBundles = useAllScriptBundles();
  const counts = new Map<number, number>();
  for (const b of allScriptBundles.data ?? []) counts.set(b.exam_id, (counts.get(b.exam_id) ?? 0) + 1);
  let busiestExamId: number | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      busiestExamId = id;
      bestCount = count;
    }
  }
  const effectiveExamId = busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;

  const stats = useBundleStats(effectiveExamId);
  const allBundles = useScriptBundles(effectiveExamId, {});
  const allRows = allBundles.data ?? [];

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | BundleStatus>("all");
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const tabCounts = {
    all: allRows.length,
    in_valuation: allRows.filter((b) => b.status === "under_valuation").length,
    submitted: allRows.filter((b) => b.status === "submitted").length,
    second_valuation: allRows.filter((b) => b.is_second_valuation).length,
  };

  const filtered = allRows.filter((b) => {
    if (tab === "in_valuation" && b.status !== "under_valuation") return false;
    if (tab === "submitted" && b.status !== "submitted") return false;
    if (tab === "second_valuation" && !b.is_second_valuation) return false;
    if (departmentId != null && b.department?.id !== departmentId) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const valuatorName = b.valuator ? `${b.valuator.first_name} ${b.valuator.last_name}` : "";
      const hay = [b.bundle_code, b.subject.subject_code, b.subject.name, valuatorName].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "exam-valuation",
      [
        { header: "Bundle", value: (b: ScriptBundle) => b.bundle_code },
        { header: "Dummy range", value: (b: ScriptBundle) => `${b.dummy_range_start}-${b.dummy_range_end}` },
        { header: "Course", value: (b: ScriptBundle) => `${b.subject.subject_code} · ${b.subject.name}` },
        { header: "Department", value: (b: ScriptBundle) => b.department?.code ?? "" },
        { header: "Scripts", value: (b: ScriptBundle) => b.scripts_count },
        { header: "Valuator", value: (b: ScriptBundle) => (b.valuator ? `${b.valuator.first_name} ${b.valuator.last_name}` : "Unallocated") },
        { header: "Progress", value: (b: ScriptBundle) => `${b.entered_count}/${b.scripts_count}` },
        { header: "Status", value: (b: ScriptBundle) => STATUS_LABEL[b.status] },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Exam Valuation"
        subtitle="Valuator allocation, dummy-numbered script bundles, valuation status and mark submission."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setAllocateOpen(true)}>
              <Icon name="add" size={16} />
              Allocate bundle
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Scripts valued"
          value={stats.data?.scripts_valued ?? 0}
          icon="fact_check"
          sub={stats.data?.total_scripts ? `${Math.round((stats.data.scripts_valued / stats.data.total_scripts) * 1000) / 10}% of ${stats.data.total_scripts}` : undefined}
          loading={stats.isLoading}
        />
        <StatCard label="Valuators on camp" value={stats.data?.valuators_on_camp ?? 0} icon="groups" sub={stats.data ? `${stats.data.bundles_count} bundles assigned` : undefined} loading={stats.isLoading} />
        <StatCard label="Daily throughput" value={stats.data?.daily_throughput ?? 0} icon="trending_up" sub="scripts entered today" loading={stats.isLoading} />
        <StatCard label="Second valuation" value={stats.data?.second_valuation_count ?? 0} icon="difference" sub="bundles flagged for re-check" loading={stats.isLoading} />
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
          <SearchBar placeholder="Search bundle, course or valuator…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={departmentId ?? ""} onChange={(e) => changeFilter(setDepartmentId, e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[150px]">
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => changeFilter(setStatusFilter, e.target.value as typeof statusFilter)} className="w-auto min-w-[150px]">
            <option value="all">All status</option>
            <option value="allotted">Allotted</option>
            <option value="under_valuation">Under valuation</option>
            <option value="submitted">Submitted</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {allBundles.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No bundles allocated for this exam yet.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="w-[130px]">Bundle</div>
              <div className="flex-1">Course</div>
              <div className="w-[70px]">Scripts</div>
              <div className="w-[150px]">Valuator</div>
              <div className="w-[100px]">Progress</div>
              <div className="w-[130px]">Status</div>
              <div className="w-[70px] text-right"> </div>
            </div>
            {pageRows.map((b) => (
              <div key={b.id} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                <div className="w-[130px] min-w-0 shrink-0">
                  <div className="truncate text-[13.5px] font-bold text-ink">{b.bundle_code}</div>
                  <div className="truncate text-[11px] text-muted">
                    Dummy {b.dummy_range_start}–{b.dummy_range_end}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="truncate text-[12.5px] text-ink">
                    {b.subject.subject_code} · {b.subject.name}
                  </span>
                  {b.is_second_valuation && (
                    <Badge tone="accent" className="ml-2">
                      2nd valuation
                    </Badge>
                  )}
                </div>
                <div className="w-[70px] shrink-0 text-[12.5px] text-ink">{b.scripts_count}</div>
                <div className="w-[150px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">
                  {b.valuator ? `${b.valuator.first_name} ${b.valuator.last_name}` : "— Unallocated"}
                </div>
                <div className="w-[100px] shrink-0 text-[12.5px] text-ink">
                  {b.entered_count}/{b.scripts_count}
                </div>
                <div className="w-[130px] min-w-0 shrink-0">
                  <Badge tone={STATUS_TONE[b.status]} className="max-w-full truncate">
                    {STATUS_LABEL[b.status]}
                  </Badge>
                </div>
                <div className="flex w-[70px] shrink-0 justify-end">
                  <Link href={`/coe/exam-valuation/mark-entry-sheet/${b.id}`} className="text-[12.5px] font-bold text-primary hover:underline">
                    {ACTION_LABEL[b.status]}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <AllocateModal open={allocateOpen} onClose={() => setAllocateOpen(false)} examId={effectiveExamId} existingBundles={allRows} />
    </div>
  );
}

function FacultySearchInput({
  value,
  onSelect,
  excludeDepartmentId,
  placeholder,
}: {
  value: FacultyDirectoryEntry | null;
  onSelect: (f: FacultyDirectoryEntry | null) => void;
  excludeDepartmentId: number | null;
  placeholder: string;
}) {
  const [text, setText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const directory = useFacultyDirectory({ search: text });
  const options = (directory.data ?? []).filter((f) => f.department_id !== excludeDepartmentId);

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
          {options.length === 0 ? (
            <div className="px-3 py-2.5 text-[12.5px] text-muted">No eligible faculty found.</div>
          ) : (
            options.map((f) => (
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

function AllocateModal({
  open,
  onClose,
  examId,
  existingBundles,
}: {
  open: boolean;
  onClose: () => void;
  examId: number | null;
  existingBundles: ScriptBundle[];
}) {
  const mappings = useExamSubjectMappings();
  const subjects = useSubjects();
  const classes = useClasses();
  const allocate = useAllocateBundle();

  const [bundleCode, setBundleCode] = useState("");
  const [mappingId, setMappingId] = useState("");
  const [valuator, setValuator] = useState<FacultyDirectoryEntry | null>(null);
  const [scriptsCount, setScriptsCount] = useState(DEFAULT_BUNDLE_SIZE);
  const [expectedReturn, setExpectedReturn] = useState("");

  const subjectsById = new Map((subjects.data ?? []).map((s) => [s.id, s]));
  const classesById = new Map((classes.data ?? []).map((c) => [c.id, c]));
  const examMappings = (mappings.data ?? []).filter((m) => m.exam_id === examId);
  const selectedMapping = examMappings.find((m) => m.id === Number(mappingId)) ?? null;
  const selectedDepartmentId = selectedMapping ? (classesById.get(selectedMapping.class_id)?.department_id ?? null) : null;

  const nextStart = Math.max(0, ...existingBundles.map((b) => b.dummy_range_end)) + 1;
  const nextEnd = nextStart + Math.max(1, scriptsCount) - 1;

  function reset() {
    setBundleCode("");
    setMappingId("");
    setValuator(null);
    setScriptsCount(DEFAULT_BUNDLE_SIZE);
    setExpectedReturn("");
    allocate.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAllocate() {
    if (!bundleCode.trim() || !selectedMapping) return;
    allocate.mutate(
      {
        bundle_code: bundleCode.trim(),
        exam_subject_mapping_id: selectedMapping.id,
        valuator_faculty_id: valuator?.id,
        dummy_range_start: nextStart,
        dummy_range_end: nextEnd,
        expected_return_at: expectedReturn || undefined,
      },
      { onSuccess: handleClose },
    );
  }

  const canSave = bundleCode.trim() !== "" && selectedMapping != null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Allocate a script bundle"
      subtitle="Valuators are matched by subject expertise; own-department scripts are excluded automatically."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Bundle number *</label>
          <input
            type="text"
            value={bundleCode}
            onChange={(e) => setBundleCode(e.target.value)}
            placeholder="e.g. BND-1067"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Course</label>
          <select
            value={mappingId}
            onChange={(e) => {
              setMappingId(e.target.value);
              setValuator(null);
            }}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="">Choose a course…</option>
            {examMappings.map((m) => {
              const subject = subjectsById.get(m.subject_id);
              return (
                <option key={m.id} value={m.id}>
                  {subject ? `${subject.subject_code} · ${subject.name}` : `Mapping #${m.id}`}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Valuator *</label>
          <FacultySearchInput value={valuator} onSelect={setValuator} excludeDepartmentId={selectedDepartmentId} placeholder="Search by staff ID or name" />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Scripts in this bundle</label>
          <input
            type="number"
            min={1}
            value={scriptsCount}
            onChange={(e) => setScriptsCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-[12px] text-subtle">
            Dummy range {nextStart}–{nextEnd}, assigned automatically.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Expected return</label>
          <input
            type="date"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-[12px] text-subtle">Bundles not returned by this date are flagged for follow-up.</p>
        </div>

        {allocate.isError && <p className="text-[12px] text-danger-fg">{(allocate.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!canSave || allocate.isPending} onClick={handleAllocate}>
            {allocate.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
