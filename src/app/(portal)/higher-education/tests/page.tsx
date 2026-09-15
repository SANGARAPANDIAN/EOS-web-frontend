"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, Badge, Button, Input, Select, DataTable, EmptyState, type BadgeTone, type DataTableColumn } from "@/components/ui";
import {
  useHigherEducationTestReadiness,
  useCreateTest,
  type TestSummaryRow,
  type TestReadinessLevel,
} from "@/modules/higher-education/api/testReadiness";
import { TestStudentsPanel } from "@/modules/higher-education/components/StudentListPanels";

/** Matches the Transport dashboard/routes hover-lift convention. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

const READINESS_LABEL: Record<TestReadinessLevel, string> = {
  on_track: "On track",
  watch: "Watch",
  behind: "Behind",
};

const READINESS_TONE: Record<TestReadinessLevel, BadgeTone> = {
  on_track: "accent",
  watch: "accentDark",
  behind: "danger",
};

const READINESS_OPTIONS: TestReadinessLevel[] = ["on_track", "watch", "behind"];

function AddTestModal({ onClose }: { onClose: () => void }) {
  const createTest = useCreateTest();
  const [testName, setTestName] = useState("");
  const [enrolled, setEnrolled] = useState("");
  const [cleared, setCleared] = useState("");
  const [nextWindowLabel, setNextWindowLabel] = useState("");
  const [nextWindowDate, setNextWindowDate] = useState("");
  const [readiness, setReadiness] = useState<TestReadinessLevel>("on_track");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!testName.trim()) {
      setError("Test name is required.");
      return;
    }
    setError(null);
    try {
      await createTest.mutateAsync({
        test_name: testName.trim(),
        enrolled_count: enrolled ? Number(enrolled) : undefined,
        cleared_count: cleared ? Number(cleared) : undefined,
        next_window_label: nextWindowLabel.trim() || undefined,
        next_window_date: nextWindowDate || undefined,
        readiness,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this test.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-14">
      <div className="w-full max-w-[600px] rounded-modal bg-surface">
        <div className="flex items-start justify-between gap-5 border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add test</div>
            <div className="mt-1 text-[13px] text-muted">Fields left blank stay unrecorded and can be filled later.</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-[26px] py-[22px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Test</label>
            <Input className="mt-1.5" placeholder="e.g. GATE, GRE, IELTS" value={testName} onChange={(e) => setTestName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Enrolled</label>
            <Input className="mt-1.5" type="number" value={enrolled} onChange={(e) => setEnrolled(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Cleared</label>
            <Input className="mt-1.5" type="number" value={cleared} onChange={(e) => setCleared(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Next window</label>
            <Input className="mt-1.5" placeholder="e.g. GATE 2027 registration opens" value={nextWindowLabel} onChange={(e) => setNextWindowLabel(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Window date</label>
            <Input className="mt-1.5" type="date" value={nextWindowDate} onChange={(e) => setNextWindowDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Readiness</label>
            <Select className="mt-1.5" value={readiness} onChange={(e) => setReadiness(e.target.value as TestReadinessLevel)}>
              {READINESS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {READINESS_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createTest.isPending}>
            Save test
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HigherEducationTestReadinessPage() {
  const testReadiness = useHigherEducationTestReadiness();
  const data = testReadiness.data;
  const isLoading = testReadiness.isLoading;
  const [showAdd, setShowAdd] = useState(false);

  // Clicking a test opens its register underneath — the tab where students
  // are added and moved through Enrolled / Attempted / Cleared.
  const [openTest, setOpenTest] = useState<string | null>(null);

  const columns: DataTableColumn<TestSummaryRow>[] = [
    { key: "test", header: "Test", render: (row) => <span className="font-bold text-ink">{row.testName}</span> },
    { key: "enrolled", header: "Enrolled", align: "right", render: (row) => <span className="font-mono text-body">{row.enrolled ?? "—"}</span> },
    { key: "attempted", header: "Attempted", align: "right", render: (row) => <span className="font-mono text-ink">{row.attempted}</span> },
    { key: "cleared", header: "Cleared", align: "right", render: (row) => <span className="font-mono text-body">{row.cleared ?? "—"}</span> },
    { key: "mean", header: "Mean score", align: "right", render: (row) => <span className="font-mono text-body">{row.meanScore ?? "—"}</span> },
    { key: "next", header: "Next window", render: (row) => <span className="text-body">{row.nextWindow ?? row.nextWindowDate ?? "—"}</span> },
    {
      key: "readiness",
      header: "Readiness",
      align: "right",
      render: (row) => (row.readiness ? <Badge tone={READINESS_TONE[row.readiness]}>{READINESS_LABEL[row.readiness]}</Badge> : <span className="text-subtle">—</span>),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Test readiness</h1>
          <p className="mt-1 text-[13px] text-muted">Entrance and language tests tracked for every aspirant · coaching batches and retake windows.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
          Add test
        </Button>
      </div>

      {showAdd && <AddTestModal onClose={() => setShowAdd(false)} />}

      <Card className={`overflow-hidden p-0 ${HOVERABLE}`}>
        <DataTable
          columns={columns}
          data={data?.tests ?? []}
          rowKey={(row) => row.testName}
          emptyMessage={isLoading ? "Loading…" : "No tests recorded yet."}
          hoverableRows
          onRowClick={(row) => setOpenTest((cur) => (cur === row.testName ? null : row.testName))}
        />
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className={HOVERABLE}>
          <h2 className="mb-3.5 text-[17px] font-extrabold text-ink">Coaching batches</h2>
          {!data || data.coachingBatches.length === 0 ? (
            <EmptyState message="No coaching batches recorded yet." />
          ) : (
            <div className="flex flex-col gap-3 text-[14px]">
              {data.coachingBatches.map((b) => (
                <div key={b.batch_name} className="flex items-center justify-between gap-3">
                  <span className="text-muted">{b.batch_name}</span>
                  <span className="font-bold text-ink">{b.detail}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={HOVERABLE}>
          <h2 className="mb-3.5 text-[17px] font-extrabold text-ink">Retake watchlist</h2>
          {!data || data.retakeWatchlist.length === 0 ? (
            <EmptyState message="No retake items recorded yet." />
          ) : (
            <div className="flex flex-col gap-3 text-[14px]">
              {data.retakeWatchlist.map((w) => (
                <div key={w.label} className="flex items-center justify-between gap-3">
                  <span className="text-muted">{w.label}</span>
                  <span className="font-bold text-primary">{w.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={`border-border-accent ${HOVERABLE}`}>
          <h2 className="mb-3.5 text-[17px] font-extrabold text-primary">Upcoming test dates</h2>
          {!data || data.upcoming.length === 0 ? (
            <EmptyState message="No upcoming windows recorded yet." />
          ) : (
            <div className="flex flex-col gap-3 text-[14px]">
              {data.upcoming.map((u) => (
                <div key={u.testName} className="flex items-center justify-between gap-3">
                  <span className="text-muted">{u.testName}</span>
                  <span className="font-bold text-primary">{u.window}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Clicking a test above opens its register here. */}
      {openTest && <TestStudentsPanel testName={openTest} />}
    </div>
  );
}
