"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Select, Badge, SearchBar, PillTabs, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useAllScriptBundles, useScriptBundles, type BundleStatus } from "@/modules/coe/api/scriptBundles";

const TONE: Record<BundleStatus, BadgeTone> = { submitted: "accentDark", under_valuation: "accent", allotted: "neutral" };
const LABEL: Record<BundleStatus, string> = { submitted: "Submitted", under_valuation: "Under valuation", allotted: "Allotted" };

/**
 * A dedicated entry point into mark entry — the design's sidebar lists
 * "Mark Entry Sheet" as its own item, separate from "Exam Valuation" (which
 * is the full allocation/management view). This lists every real bundle
 * for the exam — already-submitted sheets included, not just the ones
 * still awaiting entry — so a submitted sheet can still be opened (in its
 * real, locked/read-only state). Opening any bundle routes into the same
 * real sheet Exam Valuation itself uses, at
 * /coe/exam-valuation/mark-entry-sheet/[bundleId] — one real entry
 * mechanism, not a separate one duplicated here.
 */
type TabKey = "all" | "pending" | "submitted";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All sheets" },
  { key: "pending", label: "Need entry" },
  { key: "submitted", label: "Submitted" },
];

export default function CoeMarkEntrySheetLandingPage() {
  const exams = useExams();
  const [examId, setExamId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");

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

  const bundles = useScriptBundles(effectiveExamId, {});
  const tabCounts = useMemo(() => {
    const all = bundles.data ?? [];
    return { all: all.length, pending: all.filter((b) => b.status !== "submitted").length, submitted: all.filter((b) => b.status === "submitted").length };
  }, [bundles.data]);
  const pending = useMemo(() => {
    let list = bundles.data ?? [];
    if (tab === "pending") list = list.filter((b) => b.status !== "submitted");
    if (tab === "submitted") list = list.filter((b) => b.status === "submitted");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.bundle_code.toLowerCase().includes(q) ||
          b.subject.name.toLowerCase().includes(q) ||
          b.subject.subject_code.toLowerCase().includes(q) ||
          (b.valuator && `${b.valuator.first_name} ${b.valuator.last_name}`.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [bundles.data, search, tab]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Mark Entry Sheet"
        subtitle="Every real bundle for this exam — open any sheet to enter marks, or to review one already submitted."
        actions={
          <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-56">
            {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
              <option key={e.id} value={e.id}>
                {e.exam_category} · {e.academic_year} · Sem {e.semester}
              </option>
            ))}
          </Select>
        }
      />

      <Card>
        <div className="flex flex-col gap-3">
          <PillTabs options={TABS.map((t) => ({ ...t, label: `${t.label} (${tabCounts[t.key]})` }))} value={tab} onChange={(k) => setTab(k as TabKey)} />
          <SearchBar placeholder="Search bundle, course or valuator…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[320px]" />
        </div>
      </Card>

      {bundles.isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Mark entry sheets</span>
            <span className="text-[12.5px] text-muted">{pending.length} records</span>
          </div>
          {pending.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No bundles match the current filter.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[150px]">Bundle</div>
                <div className="flex-1">Course</div>
                <div className="w-[150px]">Valuator</div>
                <div className="w-[90px]">Progress</div>
                <div className="w-[130px]">Status</div>
                <div className="w-[60px] text-right">Action</div>
              </div>
              {pending.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="w-[150px]">
                    <div className="text-[13.5px] font-bold text-ink">{b.bundle_code}</div>
                    <div className="text-[11px] text-muted">
                      Dummy {b.dummy_range_start}–{b.dummy_range_end}
                    </div>
                  </div>
                  <div className="flex-1 text-[12.5px] text-ink">
                    {b.subject.subject_code} · {b.subject.name}
                  </div>
                  <div className="w-[150px] text-[12.5px] text-ink">{b.valuator ? `${b.valuator.first_name} ${b.valuator.last_name}` : "— Unallocated"}</div>
                  <div className="w-[90px] text-[12.5px] text-ink">
                    {b.entered_count}/{b.scripts_count}
                  </div>
                  <div className="w-[130px]">
                    <Badge tone={TONE[b.status]}>{LABEL[b.status].toUpperCase()}</Badge>
                  </div>
                  <div className="w-[60px] text-right">
                    <Link href={`/coe/exam-valuation/mark-entry-sheet/${b.id}`} className="text-[12.5px] font-bold text-primary hover:underline">
                      {b.status === "submitted" ? "View" : "Open"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
