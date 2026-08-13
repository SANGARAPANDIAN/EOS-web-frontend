"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, StatCard, SegmentedTabs, Select, SkeletonTable, Avatar } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { useHodClasses, useHodClassDetail, type HodClassStudentRow } from "@/modules/hod/api/classRecords";
import { cn } from "@/lib/utils/cn";

type FilterKey = "all" | "lowAttendance" | "feesPending" | "hasArrears" | "cgpaHigh" | "cgpaLow";
type SortKey = "roll" | "cgpaDesc" | "cgpaAsc" | "attendanceAsc" | "dueDesc";

// Exact hex values from the design reference (HOD Portal.dc.html:3779-3784)
// rather than the app's existing accent/neutral/danger tokens, which don't
// match these specific shades closely enough for this table.
const FLAG_TONE_CLASS: Record<string, string> = {
  red: "text-[#b91c1c] bg-[#fef2f2] border border-[#fbdcdc]",
  amber: "text-[#92400e] bg-[#fef7ec] border border-[#f6e2c3]",
  green: "text-[#15803d] bg-[#effaf3] border border-[#cdeed9]",
  grey: "text-[#8b93a5] bg-[#f4f6fa] border border-[#e8ebf2]",
};

function cgpaColor(cgpa: number | null): string {
  if (cgpa == null) return "text-ink";
  if (cgpa >= 8.5) return "text-[#15803d]";
  if (cgpa < 7) return "text-[#b91c1c]";
  return "text-ink";
}

export default function HodClassRecordsPage() {
  const router = useRouter();
  const classes = useHodClasses();
  const [year, setYear] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("roll");
  const [filter, setFilter] = useState<FilterKey>("all");

  const years = useMemo(() => [...new Set((classes.data ?? []).map((c) => c.year))], [classes.data]);
  const effectiveYear = year ?? years[0] ?? null;
  const sectionsForYear = useMemo(
    () => (classes.data ?? []).filter((c) => c.year === effectiveYear).map((c) => c.section),
    [classes.data, effectiveYear],
  );
  const effectiveSection = section ?? sectionsForYear[0] ?? null;

  const selectedClass = (classes.data ?? []).find(
    (c) => c.year === effectiveYear && c.section === effectiveSection,
  );
  const detail = useHodClassDetail(selectedClass?.class_id ?? null);

  const roster = useMemo(() => detail.data?.students ?? [], [detail.data]);

  const counts = useMemo(
    () => ({
      all: roster.length,
      lowAttendance: roster.filter((r) => r.attendance_percent != null && r.attendance_percent < 75).length,
      feesPending: roster.filter((r) => r.fee_status !== "paid").length,
      hasArrears: roster.filter((r) => r.arrears > 0).length,
      cgpaHigh: roster.filter((r) => r.cgpa != null && r.cgpa >= 8.5).length,
      cgpaLow: roster.filter((r) => r.cgpa != null && r.cgpa < 7).length,
    }),
    [roster],
  );

  const filtered = useMemo(() => {
    let rows = roster;
    if (filter === "lowAttendance") rows = rows.filter((r) => r.attendance_percent != null && r.attendance_percent < 75);
    if (filter === "feesPending") rows = rows.filter((r) => r.fee_status !== "paid");
    if (filter === "hasArrears") rows = rows.filter((r) => r.arrears > 0);
    if (filter === "cgpaHigh") rows = rows.filter((r) => r.cgpa != null && r.cgpa >= 8.5);
    if (filter === "cgpaLow") rows = rows.filter((r) => r.cgpa != null && r.cgpa < 7);
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((r) => (r.name + " " + r.student_id_no).toLowerCase().includes(q));
    rows = [...rows];
    if (sort === "cgpaDesc") rows.sort((a, b) => (b.cgpa ?? 0) - (a.cgpa ?? 0));
    if (sort === "cgpaAsc") rows.sort((a, b) => (a.cgpa ?? 0) - (b.cgpa ?? 0));
    if (sort === "attendanceAsc") rows.sort((a, b) => (a.attendance_percent ?? 0) - (b.attendance_percent ?? 0));
    if (sort === "dueDesc") rows.sort((a, b) => b.fee_due - a.fee_due);
    if (sort === "roll") rows.sort((a, b) => a.student_id_no.localeCompare(b.student_id_no));
    return rows;
  }, [roster, filter, query, sort]);

  const columns: DataTableColumn<HodClassStudentRow>[] = [
    {
      key: "student",
      header: "STUDENT",
      width: "2.2fr",
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={s.name}
            imageUrl={s.photo_url}
            size={32}
            className={cn(
              "text-[11px] font-extrabold",
              s.at_risk ? "bg-[#fef2f2] text-[#b91c1c]" : "bg-icon-chip text-primary",
            )}
          />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink">{s.name}</div>
            <div className="text-[11.5px] text-muted">
              {s.student_id_no} · {s.class_label}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "flags",
      header: "FLAGS",
      width: "1.8fr",
      render: (s) => (
        <div className="flex flex-wrap gap-1.5">
          {s.flags.map((f) => (
            <span
              key={f.label}
              className={cn(
                "whitespace-nowrap rounded-pill px-2.5 py-1 text-[10.5px] font-bold",
                FLAG_TONE_CLASS[f.tone],
              )}
            >
              {f.label}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "gpa",
      header: "GPA",
      width: "0.7fr",
      align: "right",
      render: (s) => <span className="font-bold text-ink">{s.gpa ?? "—"}</span>,
    },
    {
      key: "cgpa",
      header: "CGPA",
      width: "0.7fr",
      align: "right",
      render: (s) => <span className={cn("font-extrabold", cgpaColor(s.cgpa))}>{s.cgpa ?? "—"}</span>,
    },
    {
      key: "arrears",
      header: "ARREARS",
      width: "0.8fr",
      align: "right",
      render: (s) => (
        <span className={cn("font-bold", s.arrears > 0 ? "text-[#b91c1c]" : "text-[#c8ccd6]")}>{s.arrears}</span>
      ),
    },
    {
      key: "attendance",
      header: "ATTENDANCE",
      width: "1fr",
      align: "right",
      render: (s) => (
        <span className={cn("font-bold", s.attendance_percent != null && s.attendance_percent < 75 ? "text-[#b91c1c]" : "text-ink")}>
          {s.attendance_percent != null ? `${s.attendance_percent}%` : "—"}
        </span>
      ),
    },
    {
      key: "fees",
      header: "FEES",
      width: "1fr",
      align: "right",
      render: (s) => (
        <span className={cn("font-bold", s.fee_due > 0 ? "text-[#b91c1c]" : "text-[#15803d]")}>
          {s.fee_due > 0 ? `₹${s.fee_due.toLocaleString("en-IN")} due` : "Paid"}
        </span>
      ),
    },
  ];

  const cls = detail.data?.class;
  const advisor = detail.data?.advisor;
  const stats = detail.data?.stats;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Class Records</h1>
          <p className="mt-1 text-[13px] text-muted">Pick a class to see its academic standing and the full student list</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SegmentedTabs
            options={years.map((y) => ({ key: y, label: `${y} Year` }))}
            value={effectiveYear ?? ""}
            onChange={(k) => {
              setYear(k);
              setSection(null);
            }}
          />
          <SegmentedTabs
            options={sectionsForYear.map((s) => ({ key: s, label: `Section ${s}` }))}
            value={effectiveSection ?? ""}
            onChange={setSection}
          />
        </div>
      </div>

      {cls && (
        <Card className="hod-hover-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-icon-chip text-[13px] font-extrabold text-primary">
                {advisor ? initials(advisor.name) : "?"}
              </div>
              <div>
                <div className="text-[19px] font-extrabold text-ink">
                  {cls.year}-{cls.section} · {cls.year} Year, Section {cls.section}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  {advisor ? (
                    <>
                      <span>
                        Class advisor · {advisor.name} · {advisor.designation} · {advisor.department_code}
                      </span>
                      {advisor.phone && (
                        <span className="rounded-pill border border-border-default px-3 py-1 text-[12.5px] font-semibold text-ink-soft">
                          {advisor.phone}
                        </span>
                      )}
                      {advisor.email && (
                        <span className="rounded-pill border border-border-default px-3 py-1 text-[12.5px] font-semibold text-ink-soft">
                          {advisor.email}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>No class advisor assigned</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <div className="text-[11px] font-extrabold tracking-[.09em] text-subtle">STRENGTH</div>
                <div className="text-[16px] font-extrabold text-ink">{cls.student_count} students</div>
              </div>
              <div>
                <div className="text-[11px] font-extrabold tracking-[.09em] text-subtle">CLASSROOM</div>
                <div className="text-[16px] font-extrabold text-ink">{cls.classroom ?? "—"}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          className="hod-hover-card"
          label="Mean attendance"
          value={stats?.mean_attendance != null ? `${stats.mean_attendance}%` : "—"}
          sub="across the class"
          barPercent={stats?.mean_attendance ?? undefined}
        />
        <StatCard
          className="hod-hover-card"
          label="Average CGPA"
          value={stats?.average_cgpa ?? "—"}
          sub={cls ? `${cls.year}-${cls.section} · Semester ${cls.semester}` : undefined}
          barPercent={stats?.average_cgpa != null ? Math.round((stats.average_cgpa / 10) * 100) : undefined}
        />
        <StatCard
          className="hod-hover-card"
          label="Placements"
          value={stats ? stats.placed_count : "—"}
          sub={stats ? `of ${stats.eligible_count} eligible` : undefined}
          barPercent={
            stats && stats.eligible_count > 0 ? Math.round((stats.placed_count / stats.eligible_count) * 100) : undefined
          }
        />
        <StatCard
          className="hod-hover-card"
          label="Students with fees pending"
          value={stats ? stats.fees_pending_count : "—"}
          sub={stats ? `of ${stats.student_count} students` : undefined}
          barPercent={
            stats && stats.student_count > 0
              ? Math.round((stats.fees_pending_count / stats.student_count) * 100)
              : undefined
          }
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Register number, name or roll number"
          className="flex-1 rounded-input border border-border-default bg-surface-input px-4 py-2.5 text-[13.5px] outline-none focus:border-primary"
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto">
          <option value="roll">Sort · Roll number</option>
          <option value="cgpaDesc">Sort · CGPA (high to low)</option>
          <option value="cgpaAsc">Sort · CGPA (low to high)</option>
          <option value="attendanceAsc">Sort · Attendance (low to high)</option>
          <option value="dueDesc">Sort · Fees due</option>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {(
          [
            ["all", "All students"],
            ["lowAttendance", "Attendance < 75%"],
            ["feesPending", "Fees pending"],
            ["hasArrears", "Has arrears"],
            ["cgpaHigh", "CGPA 8.5+"],
            ["cgpaLow", "CGPA below 7"],
          ] as [FilterKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "flex items-center gap-2 rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors",
              filter === key
                ? "border-primary bg-accent-50 text-primary"
                : "border-border-default text-body hover:bg-nav-hover",
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-[6px] px-[7px] py-0.5 font-mono text-[10.5px] font-bold",
                filter === key ? "bg-accent-200 text-primary" : "bg-divider text-muted",
              )}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      <Card className="p-0">
        {detail.isLoading ? (
          <SkeletonTable rows={8} className="rounded-none border-0 bg-transparent" />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(s) => s.student_id}
            rowClassName="hod-hover-row"
            onRowClick={(s) => router.push(`/hod/class-records/student/${s.student_id}`)}
            emptyMessage="No students match this filter."
          />
        )}
      </Card>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
