"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExams } from "@/modules/coe/api/exams";
import { useExamSubjectMappings } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useFacultyDirectory } from "@/modules/coe/api/faculty";
import { useScriptBundles, useAllScriptBundles, useBundleStats, useAllocateBundle, type BundleStatus, type ScriptBundle } from "@/modules/coe/api/scriptBundles";

type TabKey = "all" | "in_valuation" | "submitted" | "second_valuation";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All bundles" },
  { key: "in_valuation", label: "In valuation" },
  { key: "submitted", label: "Marks submitted" },
  { key: "second_valuation", label: "Second valuation" },
];

const TONE: Record<BundleStatus, BadgeTone> = { submitted: "accentDark", under_valuation: "accent", allotted: "neutral" };
const LABEL: Record<BundleStatus, string> = { submitted: "Submitted", under_valuation: "Under valuation", allotted: "Allotted" };
const ACTION_LABEL: Record<BundleStatus, string> = { submitted: "Verify", under_valuation: "Open", allotted: "Allocate" };

export default function CoeExamValuationPage() {
  const exams = useExams();
  const departments = useDepartments();
  const [examId, setExamId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | BundleStatus>("all");
  const [search, setSearch] = useState("");
  const [showAllocate, setShowAllocate] = useState(false);

  // Defaulting to the highest-id exam often lands on one with zero real
  // bundles yet; default instead to whichever exam actually has the most
  // script bundles allocated, so the page shows real data out of the box.
  const allScriptBundles = useAllScriptBundles();
  const busiestExamId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const b of allScriptBundles.data ?? []) counts.set(b.exam_id, (counts.get(b.exam_id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [allScriptBundles.data]);
  const effectiveExamId = examId ?? busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;
  const stats = useBundleStats(effectiveExamId);
  const allBundles = useScriptBundles(effectiveExamId, {});
  const bundles = useScriptBundles(effectiveExamId, {
    department_id: departmentId,
    status: statusFilter === "all" ? null : statusFilter,
    search,
  });

  const rows = useMemo(() => {
    let list = bundles.data ?? [];
    if (tab === "in_valuation") list = list.filter((b) => b.status === "under_valuation");
    else if (tab === "submitted") list = list.filter((b) => b.status === "submitted");
    else if (tab === "second_valuation") list = list.filter((b) => b.is_second_valuation);
    return list;
  }, [bundles.data, tab]);

  const tabCounts = useMemo(() => {
    const all = allBundles.data ?? [];
    return {
      all: all.length,
      in_valuation: all.filter((b) => b.status === "under_valuation").length,
      submitted: all.filter((b) => b.status === "submitted").length,
      second_valuation: all.filter((b) => b.is_second_valuation).length,
    };
  }, [allBundles.data]);

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
        { header: "Status", value: (b: ScriptBundle) => LABEL[b.status] },
      ],
      rows,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Exam Valuation"
        subtitle="Valuator allocation, dummy-numbered script bundles, valuation status and mark submission."
        actions={
          <>
            <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-56">
              {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.exam_category} · {e.academic_year} · Sem {e.semester}
                </option>
              ))}
            </Select>
            <Button variant="secondary" className="w-auto" disabled={rows.length === 0} onClick={handleExport}>
              Export
            </Button>
            <Button variant="primarySmall" className="w-auto" onClick={() => setShowAllocate(true)}>
              + Allocate bundle
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Scripts valued"
          value={stats.data?.scripts_valued ?? (stats.isLoading ? "…" : 0)}
          icon="fact_check"
          sub={stats.data ? `${stats.data.total_scripts > 0 ? Math.round((stats.data.scripts_valued / stats.data.total_scripts) * 100) : 0}% of ${stats.data.total_scripts}` : undefined}
        />
        <StatCard
          label="Valuators on camp"
          value={stats.data?.valuators_on_camp ?? (stats.isLoading ? "…" : 0)}
          icon="groups"
          sub={stats.data ? `${stats.data.bundles_count} bundles assigned` : undefined}
        />
        <StatCard label="Daily throughput" value={stats.data?.daily_throughput ?? (stats.isLoading ? "…" : 0)} icon="trending_up" sub="scripts entered today" />
        <StatCard
          label="Second valuation"
          value={stats.data?.second_valuation_count ?? (stats.isLoading ? "…" : 0)}
          icon="difference"
          sub="bundles flagged for re-valuation"
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <PillTabs options={TABS.map((t) => ({ ...t, label: `${t.label} (${tabCounts[t.key]})` }))} value={tab} onChange={(k) => setTab(k as TabKey)} />
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search bundle, course or valuator…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[280px]" />
            <Select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[150px]">
              <option value="">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-auto min-w-[140px]">
              <option value="all">All status</option>
              <option value="allotted">Allotted</option>
              <option value="under_valuation">Under valuation</option>
              <option value="submitted">Submitted</option>
            </Select>
          </div>
        </div>
      </Card>

      {bundles.isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Script bundles</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No bundles allocated for this exam yet.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[150px]">Bundle</div>
                <div className="flex-1">Course</div>
                <div className="w-[70px]">Scripts</div>
                <div className="w-[150px]">Valuator</div>
                <div className="w-[90px]">Progress</div>
                <div className="w-[130px]">Status</div>
                <div className="w-[80px] text-right">Actions</div>
              </div>
              {rows.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="w-[150px]">
                    <div className="text-[13.5px] font-bold text-ink">{b.bundle_code}</div>
                    <div className="text-[11px] text-muted">
                      Dummy {b.dummy_range_start}–{b.dummy_range_end}
                    </div>
                  </div>
                  <div className="flex-1 text-[12.5px] text-ink">
                    {b.subject.subject_code} · {b.subject.name}
                    {b.is_second_valuation && (
                      <Badge tone="danger" className="ml-2">
                        2ND VAL
                      </Badge>
                    )}
                  </div>
                  <div className="w-[70px] text-[12.5px] text-ink">{b.scripts_count}</div>
                  <div className="w-[150px] text-[12.5px] text-ink">{b.valuator ? `${b.valuator.first_name} ${b.valuator.last_name}` : "— Unallocated"}</div>
                  <div className="w-[90px] text-[12.5px] text-ink">
                    {b.entered_count}/{b.scripts_count}
                  </div>
                  <div className="w-[130px]">
                    <Badge tone={TONE[b.status]}>{LABEL[b.status].toUpperCase()}</Badge>
                  </div>
                  <div className="w-[80px] text-right">
                    <Link href={`/coe/exam-valuation/mark-entry-sheet/${b.id}`} className="text-[12.5px] font-bold text-primary hover:underline">
                      {ACTION_LABEL[b.status]}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <AllocateModal open={showAllocate} onClose={() => setShowAllocate(false)} examId={effectiveExamId} />
    </div>
  );
}

function AllocateModal({ open, onClose, examId }: { open: boolean; onClose: () => void; examId: number | null }) {
  const mappings = useExamSubjectMappings();
  const faculty = useFacultyDirectory();
  const allocate = useAllocateBundle();

  const [bundleCode, setBundleCode] = useState("");
  const [mappingId, setMappingId] = useState("");
  const [valuatorId, setValuatorId] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const examMappings = (mappings.data ?? []).filter((m) => m.exam_id === examId);

  function handleClose() {
    setBundleCode("");
    setMappingId("");
    setValuatorId("");
    setRangeStart("");
    setRangeEnd("");
    allocate.reset();
    onClose();
  }

  function handleAllocate() {
    allocate.mutate(
      {
        bundle_code: bundleCode,
        exam_subject_mapping_id: Number(mappingId),
        valuator_faculty_id: valuatorId ? Number(valuatorId) : undefined,
        dummy_range_start: Number(rangeStart),
        dummy_range_end: Number(rangeEnd),
      },
      { onSuccess: handleClose },
    );
  }

  const canSave = bundleCode.trim() !== "" && mappingId !== "" && rangeStart !== "" && rangeEnd !== "";

  return (
    <Modal open={open} onClose={handleClose} title="Allocate a script bundle" subtitle="Valuators are matched by subject; dummy numbers stay blind until the sheet locks.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Bundle code</label>
          <Input value={bundleCode} onChange={(e) => setBundleCode(e.target.value)} placeholder="BND-1067" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Course</label>
          <Select value={mappingId} onChange={(e) => setMappingId(e.target.value)}>
            <option value="">Select…</option>
            {examMappings.map((m) => (
              <option key={m.id} value={m.id}>
                Mapping #{m.id}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Valuator</label>
          <Select value={valuatorId} onChange={(e) => setValuatorId(e.target.value)}>
            <option value="">Not allocated</option>
            {(faculty.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Dummy range start</label>
            <Input type="number" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Dummy range end</label>
            <Input type="number" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
          </div>
        </div>
        {allocate.isError && <p className="text-[12px] text-danger-fg">{(allocate.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!canSave || allocate.isPending} onClick={handleAllocate}>
            {allocate.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
