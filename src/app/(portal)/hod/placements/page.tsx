"use client";

import { useMemo, useState } from "react";
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

function StatusPill({
  dotClassName,
  count,
  label,
  active,
  onClick,
}: {
  dotClassName: string;
  count: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-pill border px-3.5 py-2 text-[13px] font-bold",
        active ? "border-border-accent bg-accent-50 text-primary" : "border-border-default bg-surface text-ink hover:bg-nav-hover",
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", dotClassName)} />
      {count} {label}
    </button>
  );
}

function CompanyMark({ name }: { name: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-divider text-[11px] font-extrabold text-muted">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

type StatusFilter = "all" | "placed" | "in_process" | "unplaced";
type SortKey = "roll" | "companyAz" | "packageDesc" | "offersDesc";

function StudentRecordsTab() {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("roll");
  // Always fetch the full department roster — year/section are applied
  // client-side below so either can be picked independently (the API only
  // takes one class_id, which conflates the two).
  const students = useHodPlacementStudents(search, null);
  const c = students.data?.counts;
  const classes = students.data?.classes ?? [];

  const yearOptions = [...new Set(classes.map((cl) => cl.year_label))];
  const sectionOptions = [
    ...new Set(classes.filter((cl) => !year || cl.year_label === year).map((cl) => cl.section)),
  ].sort();

  const rows = useMemo(() => {
    const classInfoByLabel = new Map((students.data?.classes ?? []).map((cl) => [cl.class_label, cl]));
    let out = students.data?.rows ?? [];
    if (year) out = out.filter((r) => r.class_label != null && classInfoByLabel.get(r.class_label)?.year_label === year);
    if (section) out = out.filter((r) => r.class_label != null && classInfoByLabel.get(r.class_label)?.section === section);
    if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);
    out = [...out];
    if (sort === "companyAz") {
      out.sort((a, b) => {
        if (a.company == null) return b.company == null ? 0 : 1;
        if (b.company == null) return -1;
        return a.company.localeCompare(b.company);
      });
    } else if (sort === "packageDesc") {
      out.sort((a, b) => (b.package_lpa ?? -1) - (a.package_lpa ?? -1));
    } else if (sort === "offersDesc") {
      out.sort((a, b) => b.offers - a.offers);
    }
    return out;
  }, [students.data?.rows, students.data?.classes, year, section, statusFilter, sort]);

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
      {students.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load placement records — please try again.
        </div>
      )}
      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student, company or register number"
          className="max-w-[380px]"
        />
        <Select
          value={year || "all"}
          onChange={(e) => {
            const next = e.target.value === "all" ? "" : e.target.value;
            setYear(next);
            // A section chosen under the old year may not exist under the new one.
            if (section && !classes.some((cl) => cl.year_label === next && cl.section === section)) {
              setSection("");
            }
          }}
          className="max-w-[160px] font-bold"
        >
          <option value="all">All years</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y} year
            </option>
          ))}
        </Select>
        <Select
          value={section || "all"}
          onChange={(e) => setSection(e.target.value === "all" ? "" : e.target.value)}
          className="max-w-[160px] font-bold"
        >
          <option value="all">All sections</option>
          {sectionOptions.map((s) => (
            <option key={s} value={s}>
              Section {s}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="max-w-[220px]">
          <option value="roll">Sort · Register number</option>
          <option value="companyAz">Sort · Company (A–Z)</option>
          <option value="packageDesc">Sort · Package (high to low)</option>
          <option value="offersDesc">Sort · Offers (high to low)</option>
        </Select>
        <div className="ml-auto flex gap-2.5">
          <StatusPill
            dotClassName="bg-[#15803d]"
            count={c?.placed ?? 0}
            label="placed"
            active={statusFilter === "placed"}
            onClick={() => setStatusFilter((f) => (f === "placed" ? "all" : "placed"))}
          />
          <StatusPill
            dotClassName="bg-[#92400e]"
            count={c?.in_process ?? 0}
            label="in process"
            active={statusFilter === "in_process"}
            onClick={() => setStatusFilter((f) => (f === "in_process" ? "all" : "in_process"))}
          />
          <StatusPill
            dotClassName="bg-[#8b93a5]"
            count={c?.unplaced ?? 0}
            label="unplaced"
            active={statusFilter === "unplaced"}
            onClick={() => setStatusFilter((f) => (f === "unplaced" ? "all" : "unplaced"))}
          />
        </div>
      </div>
      {students.isLoading ? (
        <SkeletonTable rows={8} />
      ) : students.isError ? null : (
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.student_id}
          rowClassName="hod-hover-row"
          emptyMessage={statusFilter !== "all" ? "No students match this status." : undefined}
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
  if (drives.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load upcoming drives — please try again.
      </div>
    );
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
  if (history.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load placement history — please try again.
      </div>
    );
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
