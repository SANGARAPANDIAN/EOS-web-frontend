"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, DataTable, SkeletonStatTiles, SkeletonBlock } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useHodReportsSummary,
  useHodClassPassRates,
  useHodSubjectResults,
  type HodClassPassRate,
  type HodSubjectResult,
  type HodSubjectResultGroup,
} from "@/modules/hod/api/reports";

const YEAR_TABS = [
  { key: "", label: "All classes" },
  { key: "II", label: "2nd year" },
  { key: "III", label: "3rd year" },
  { key: "IV", label: "4th year" },
];

function fmtPct(value: number | null | undefined): string {
  return value == null ? "—" : `${value}%`;
}

function ChangeCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-subtle">—</span>;
  const up = value >= 0;
  return (
    <span className={up ? "font-bold text-primary" : "font-bold text-muted"}>
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {value} pts
    </span>
  );
}

function ClassStatusBadge({ changePts }: { changePts: number | null }) {
  if (changePts == null) return null;
  return changePts >= 0 ? <Badge tone="accent">improved</Badge> : <Badge tone="neutral">needs review</Badge>;
}

function subjectRemark(subject: HodSubjectResult): string {
  if (subject.needs_remedial && subject.lowest_section_label) {
    return `${subject.lowest_section_label} below 80% · remedial needed`;
  }
  if (subject.change_pts == null) return "—";
  if (subject.change_pts > 0) return "improved against previous semester";
  if (subject.change_pts < 0) return "slipped against previous semester";
  return "unchanged against previous semester";
}

function SubjectResultsTable({ group }: { group: HodSubjectResultGroup }) {
  const columns: DataTableColumn<HodSubjectResult>[] = [
    {
      key: "subject",
      header: "SUBJECT",
      width: "2.2fr",
      render: (s) => (
        <div>
          <div className="font-bold text-ink">{s.name}</div>
          <div className="text-[12px] text-muted">
            {s.code}
            {s.faculty_label ? ` · ${s.faculty_label}` : ""}
          </div>
        </div>
      ),
    },
    ...group.sections.map((section) => ({
      key: `sec-${section}`,
      header: `SEC ${section}`,
      width: "1fr",
      align: "right" as const,
      render: (s: HodSubjectResult) => fmtPct(s.sections.find((x) => x.section === section)?.pass_percent),
    })),
    {
      key: "average",
      header: "AVERAGE",
      width: "1fr",
      align: "right",
      render: (s) => fmtPct(s.average_pass_percent),
    },
    {
      key: "change",
      header: "CHANGE",
      width: "1fr",
      align: "right",
      render: (s) => <ChangeCell value={s.change_pts} />,
    },
    {
      key: "remark",
      header: "REMARK",
      width: "2.2fr",
      render: (s) => <span className="text-[12px] text-muted">{subjectRemark(s)}</span>,
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={group.subjects}
      rowKey={(s) => s.subject_id}
      rowClassName="hod-hover-row"
    />
  );
}

export default function HodReportsAnalyticsPage() {
  const summary = useHodReportsSummary();
  const [year, setYear] = useState("");
  const classRates = useHodClassPassRates(year || null);
  const subjectResults = useHodSubjectResults();

  const s = summary.data;
  const c = classRates.data;

  const classColumns: DataTableColumn<HodClassPassRate>[] = [
    { key: "class", header: "CLASS", width: "1fr", render: (r) => <span className="font-bold text-ink">{r.year}-{r.section}</span> },
    {
      key: "current",
      header: "CURRENT",
      width: "1fr",
      render: (r) => <span className="font-extrabold text-ink">{fmtPct(r.current_pass_percent)}</span>,
    },
    {
      key: "previous",
      header: "PREVIOUS",
      width: "1.6fr",
      render: (r) =>
        r.previous_semester != null ? (
          <span className="text-muted">
            Semester {r.previous_semester} · {fmtPct(r.previous_pass_percent)}
          </span>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    { key: "change", header: "CHANGE", width: "1fr", render: (r) => <ChangeCell value={r.change_pts} /> },
    { key: "status", header: "STATUS", width: "1fr", render: (r) => <ClassStatusBadge changePts={r.change_pts} /> },
  ];

  const anyError = summary.isError || classRates.isError || subjectResults.isError;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {anyError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load some report data — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Reports & Analytics</h1>
        <p className="mt-1 text-[13px] text-muted">Overall department results · current semester vs previous semester</p>
      </div>

      {summary.isLoading && !s ? (
        <div className="flex flex-col gap-5">
          <SkeletonStatTiles count={4} />
          <div className="grid grid-cols-3 gap-4">
            <SkeletonBlock />
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
          <SkeletonBlock />
        </div>
      ) : (
        <>
      <div className="grid grid-cols-4 gap-4">
        <Card className="hod-hover-card">
          <div className="text-[13px] font-bold text-body">Department pass %</div>
          <div className="mt-2.5 text-[32px] font-extrabold tracking-[-.03em] text-ink">{fmtPct(s?.pass_percent)}</div>
          {s?.pass_percent_change != null && (
            <div className="mt-0.5 text-[12.5px] font-semibold text-primary">
              {s.pass_percent_change >= 0 ? "+" : ""}
              {s.pass_percent_change} vs last semester
            </div>
          )}
        </Card>
        <Card className="hod-hover-card">
          <div className="text-[13px] font-bold text-body">Average CGPA</div>
          <div className="mt-2.5 text-[32px] font-extrabold tracking-[-.03em] text-ink">{s?.average_cgpa ?? "—"}</div>
          {s?.average_cgpa_change != null && (
            <div className="mt-0.5 text-[12.5px] font-semibold text-primary">
              {s.average_cgpa_change >= 0 ? "+" : ""}
              {s.average_cgpa_change} vs last semester
            </div>
          )}
        </Card>
        <Card className="hod-hover-card">
          <div className="text-[13px] font-bold text-body">Students with arrears</div>
          <div className="mt-2.5 text-[32px] font-extrabold tracking-[-.03em] text-ink">{s?.arrears_count ?? "—"}</div>
          {s?.arrears_count_change != null && (
            <div className="mt-0.5 text-[12.5px] font-semibold text-primary">
              {s.arrears_count_change >= 0 ? "+" : ""}
              {s.arrears_count_change} vs last semester
            </div>
          )}
        </Card>
        <Card className="hod-hover-card">
          <div className="text-[13px] font-bold text-body">Distinction (CGPA 8.5+)</div>
          <div className="mt-2.5 text-[32px] font-extrabold tracking-[-.03em] text-ink">{s?.distinction_count ?? "—"}</div>
          {s && (
            <div className="mt-0.5 text-[12.5px] font-semibold text-primary">
              {s.distinction_count_change >= 0 ? "+" : ""}
              {s.distinction_count_change} vs last semester
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="hod-hover-card">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> Best movement
          </div>
          {c?.best_movement ? (
            <>
              <div className="text-[19px] font-extrabold text-primary">
                {c.best_movement.year}-{c.best_movement.section}
              </div>
              <div className="text-[12px] text-muted">
                {c.best_movement.change_pts != null && c.best_movement.change_pts >= 0 ? "+" : ""}
                {c.best_movement.change_pts} pts · now {fmtPct(c.best_movement.current_pass_percent)}
              </div>
            </>
          ) : (
            <div className="text-[13px] text-subtle">No data yet</div>
          )}
        </Card>
        <Card className="hod-hover-card">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> Classes declining
          </div>
          <div className="text-[19px] font-extrabold text-primary">
            {c ? `${c.declining_count} of ${c.classes.length}` : "—"}
          </div>
          <div className="text-[12px] text-muted">{c?.declining_classes.join(", ") || "None"}</div>
        </Card>
        <Card className="hod-hover-card">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> Lowest pass % · also biggest gain
          </div>
          {c?.lowest_but_improving ? (
            <>
              <div className="text-[19px] font-extrabold text-primary">
                {c.lowest_but_improving.year}-{c.lowest_but_improving.section}
              </div>
              <div className="text-[12px] text-muted">
                {fmtPct(c.lowest_but_improving.current_pass_percent)} · improving, keep watching
              </div>
            </>
          ) : (
            <div className="text-[13px] text-subtle">No data yet</div>
          )}
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-extrabold text-ink">Pass percentage by class</h2>
            <p className="text-[12px] text-muted">Ranked high to low · current semester vs previous</p>
          </div>
          <SegmentedTabs options={YEAR_TABS} value={year} onChange={setYear} />
        </div>
        <Card>
          <DataTable
            columns={classColumns}
            data={c?.classes ?? []}
            rowKey={(r) => r.class_id}
            rowClassName="hod-hover-row"
          />
        </Card>
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-[16px] font-extrabold text-ink">Subject-wise results · every section</h2>
          <p className="text-[12px] text-muted">Current-semester pass % per section</p>
        </div>
        <div className="flex flex-col gap-4">
          {(subjectResults.data?.groups ?? []).map((group) => (
            <Card key={group.semester}>
              <h3 className="mb-3 text-[14px] font-extrabold text-ink">
                {group.year} Year · Semester {group.semester} · sections {group.sections.join(", ")}
              </h3>
              <SubjectResultsTable group={group} />
            </Card>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
