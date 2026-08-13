"use client";

import { useState } from "react";
import { Card, Badge, Avatar, Input, Select, EmptyState, SkeletonTable, SkeletonRows, PillTabs } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  useHodPlacementStudents,
  useHodUpcomingDrives,
  useHodPlacementHistory,
  type HodPlacementStudentRow,
  type HodPlacementDrive,
} from "@/modules/hod/api/placements";
import { formatDisplayDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type PlacementsTab = "students" | "drives" | "history";

function statusTone(status: HodPlacementStudentRow["status"]): "accent" | "neutral" {
  return status === "placed" ? "accent" : "neutral";
}

function statusLabel(status: HodPlacementStudentRow["status"]): string {
  if (status === "placed") return "Placed";
  if (status === "in_process") return "In process";
  return "Unplaced";
}

export default function HodPlacementsPage() {
  const [tab, setTab] = useState<PlacementsTab>("students");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Placements</h1>
        <p className="mt-1 text-[13px] text-muted">
          Department placement standing, drives, offers and history
        </p>
      </div>

      <PillTabs
        value={tab}
        onChange={(k) => setTab(k as PlacementsTab)}
        options={[
          { key: "students", label: "Student records" },
          { key: "drives", label: "Upcoming drives" },
          { key: "history", label: "History" },
        ]}
      />

      {tab === "students" && <StudentRecordsTab />}
      {tab === "drives" && <UpcomingDrivesTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

function StatusPill({ dotClassName, count, label }: { dotClassName: string; count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-pill border border-border-default bg-surface px-3.5 py-2 text-[13px] font-bold text-ink">
      <span className={cn("size-2 shrink-0 rounded-full", dotClassName)} />
      {count} {label}
    </span>
  );
}

function CompanyMark({ name }: { name: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-divider text-[11px] font-extrabold text-muted">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function StudentRecordsTab() {
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const students = useHodPlacementStudents(search, classId);
  const c = students.data?.counts;
  const classes = students.data?.classes ?? [];

  const yearsSpanned = [...new Set(classes.map((cl) => cl.year_label))].join(", ");

  const columns: DataTableColumn<HodPlacementStudentRow>[] = [
    {
      key: "student",
      header: "Student",
      width: "2fr",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name ?? row.student_id_no} size={34} className="bg-icon-chip text-primary" />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink">
              {row.name ?? row.student_id_no}
            </div>
            <div className="truncate text-[11.5px] text-subtle">{row.student_id_no}</div>
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      width: "90px",
      render: (row) => <span className="text-[13px] text-ink">{row.class_label ?? "—"}</span>,
    },
    {
      key: "company",
      header: "Company",
      width: "1.4fr",
      render: (row) =>
        row.company ? (
          <div className="flex items-center gap-2.5">
            <CompanyMark name={row.company} />
            <span className="text-[13.5px] font-bold text-ink">{row.company}</span>
          </div>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      key: "package",
      header: "Package",
      width: "110px",
      align: "right",
      render: (row) => (
        <span className="text-[13.5px] font-extrabold text-ink">
          {row.package_lpa != null ? `₹${row.package_lpa} LPA` : "—"}
        </span>
      ),
    },
    {
      key: "offers",
      header: "Offers",
      width: "70px",
      align: "right",
      render: (row) => <span className="text-[13px] text-ink">{row.offers}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (row) => <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student, company or register number"
          className="max-w-[380px]"
        />
        <Select
          value={classId ?? "all"}
          onChange={(e) => setClassId(e.target.value === "all" ? null : Number(e.target.value))}
          className="max-w-[260px] font-bold"
        >
          <option value="all">All classes{yearsSpanned ? ` · ${yearsSpanned} year` : ""}</option>
          {classes.map((cl) => (
            <option key={cl.class_id} value={cl.class_id}>
              {cl.class_label}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex gap-2.5">
          <StatusPill dotClassName="bg-[#15803d]" count={c?.placed ?? 0} label="placed" />
          <StatusPill dotClassName="bg-[#92400e]" count={c?.in_process ?? 0} label="in process" />
          <StatusPill dotClassName="bg-[#8b93a5]" count={c?.unplaced ?? 0} label="unplaced" />
        </div>
      </div>
      {students.isLoading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={students.data?.rows ?? []}
          rowKey={(r) => r.student_id}
          rowClassName="hod-hover-row"
        />
      )}
    </div>
  );
}

function UpcomingDrivesTab() {
  const drives = useHodUpcomingDrives();

  if (drives.isLoading) {
    return <SkeletonRows count={4} />;
  }
  if (!drives.data || drives.data.length === 0) {
    return (
      <Card>
        <EmptyState message="No upcoming drives scheduled." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {drives.data.map((d: HodPlacementDrive) => (
        <div
          key={d.id}
          className="hod-hover-row flex items-center justify-between gap-5 rounded-[11px] border border-border-default px-5 py-4"
        >
          <div className="w-[220px] min-w-0">
            <div className="truncate text-[15px] font-extrabold text-ink">{d.company_name}</div>
            <div className="truncate text-[12.5px] text-muted">{d.job_role ?? "—"}</div>
          </div>
          <div className="w-[130px]">
            <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">
              Drive date
            </div>
            <div className="mt-0.5 text-[13.5px] font-bold text-ink">
              {formatDisplayDate(d.scheduled_date)}
            </div>
          </div>
          <div className="w-[130px]">
            <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">
              Package
            </div>
            <div className="mt-0.5 text-[13.5px] font-bold text-ink">
              {d.package_lpa != null ? `₹${d.package_lpa} LPA` : "—"}
            </div>
          </div>
          <div className="w-[170px]">
            <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">
              Eligibility
            </div>
            <div className="mt-0.5 text-[13.5px] font-bold text-ink">
              {d.eligibility_cgpa != null ? `CGPA ≥ ${d.eligibility_cgpa}` : "—"}
            </div>
          </div>
          <Badge tone="accent" className="shrink-0">
            {d.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function HistoryTab() {
  const history = useHodPlacementHistory();

  const columns: DataTableColumn<import("@/modules/hod/api/placements").HodPlacementHistoryRow>[] = [
    { key: "batch", header: "Batch", width: "1fr", render: (r) => <span className="font-bold text-ink">{r.batch_label}</span> },
    { key: "eligible", header: "Eligible", width: "1fr", align: "right", render: (r) => <span>{r.eligible_count}</span> },
    { key: "placed", header: "Placed", width: "1fr", align: "right", render: (r) => <span className="font-bold text-ink">{r.placed_count}</span> },
    {
      key: "percent",
      header: "Placement %",
      width: "1fr",
      align: "right",
      render: (r) => <span className="font-bold text-[#15803d]">{r.placement_percent}%</span>,
    },
    {
      key: "avg",
      header: "Avg package",
      width: "1fr",
      align: "right",
      render: (r) => <span>{r.average_package_lpa != null ? `₹${r.average_package_lpa} LPA` : "—"}</span>,
    },
    {
      key: "top",
      header: "Top recruiter",
      width: "1.4fr",
      align: "right",
      render: (r) => <span>{r.top_recruiter ? `${r.top_recruiter.name} · ${r.top_recruiter.offers} offers` : "—"}</span>,
    },
  ];

  if (history.isLoading) {
    return <SkeletonTable rows={6} />;
  }

  return (
    <DataTable
      columns={columns}
      data={history.data?.rows ?? []}
      rowKey={(r) => r.batch_id}
      rowClassName="hod-hover-row"
      emptyMessage="No placement history yet for this department."
    />
  );
}
