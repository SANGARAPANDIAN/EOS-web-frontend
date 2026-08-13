"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Avatar, Input, Select, SkeletonStatTiles, SkeletonTable } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useHodHigherEducation, type HodHigherEducationRow } from "@/modules/hod/api/higherEducation";
import { cn } from "@/lib/utils/cn";

// Same exact hex tones as class-records'/placements' status pills.
const STATUS_TONE_CLASS: Record<string, string> = {
  green: "text-[#15803d] bg-[#effaf3] border border-[#cdeed9]",
  amber: "text-[#92400e] bg-[#fef7ec] border border-[#f6e2c3]",
  grey: "text-[#8b93a5] bg-[#f4f6fa] border border-[#e8ebf2]",
};

// admission_status is a real enum (higher_education_admission_status_enum):
// interested/applied/admitted/enrolled — direct map, not guesswork.
const STATUS_TONE: Record<string, keyof typeof STATUS_TONE_CLASS> = {
  interested: "grey",
  applied: "amber",
  admitted: "green",
  enrolled: "green",
};

function statusTone(status: string): keyof typeof STATUS_TONE_CLASS {
  return STATUS_TONE[status] ?? "grey";
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function HodHigherEducationPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [programme, setProgramme] = useState<string | null>(null);

  const overview = useHodHigherEducation(search, batchId, programme);
  const o = overview.data;
  const rows = o?.rows ?? [];

  const columns: DataTableColumn<HodHigherEducationRow>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.8fr",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} imageUrl={r.photo_url} size={32} className="bg-icon-chip text-primary" />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink">{r.name}</div>
            <div className="truncate text-[11.5px] text-subtle">{r.student_id_no}</div>
          </div>
        </div>
      ),
    },
    {
      key: "batch",
      header: "Dept · Batch",
      width: "1fr",
      render: (r) => <span className="text-[13px] text-ink">{[r.department_code, r.batch_label].filter(Boolean).join(" · ")}</span>,
    },
    {
      key: "programme",
      header: "Programme",
      width: "1.4fr",
      render: (r) => <span className="text-[13.5px] font-bold text-ink">{r.programme}</span>,
    },
    {
      key: "university",
      header: "University",
      width: "1.6fr",
      render: (r) => <span className="text-[13px] text-ink">{r.university ?? "—"}</span>,
    },
    {
      key: "country",
      header: "Country",
      width: "1fr",
      render: (r) => <span className="text-[13px] text-ink">{r.country}</span>,
    },
    {
      key: "scholarship",
      header: "Scholarship",
      width: "1.2fr",
      render: (r) =>
        r.scholarship ? (
          <span className="text-[13px] font-bold text-ink">{r.scholarship}</span>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (r) =>
        r.status ? (
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-pill border px-[9px] py-1 text-[10.5px] font-extrabold tracking-[.06em]",
              STATUS_TONE_CLASS[statusTone(r.status)],
            )}
          >
            {statusLabel(r.status)}
          </span>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Higher Education</h1>
          <p className="mt-1 text-[13px] text-muted">
            Students who progressed to postgraduate study · open a student for the full record
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={batchId ?? "all"}
            onChange={(e) => setBatchId(e.target.value === "all" ? null : Number(e.target.value))}
            className="max-w-[180px] font-bold"
          >
            <option value="all">All batches</option>
            {(o?.filters.batches ?? []).map((b) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.label}
              </option>
            ))}
          </Select>
          <Select
            value={programme ?? "all"}
            onChange={(e) => setProgramme(e.target.value === "all" ? null : e.target.value)}
            className="max-w-[220px] font-bold"
          >
            <option value="all">All programmes</option>
            {(o?.filters.programmes ?? []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {overview.isLoading ? (
        <SkeletonStatTiles count={3} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Card className="hod-hover-card">
            <div className="text-[13.5px] text-[#5c6573]">Total higher education</div>
            <div className="mt-1.5 text-[30px] font-extrabold text-ink">{o?.stats.total ?? 0}</div>
            <div className="mt-1 text-[12.5px] text-subtle">
              {o?.stats.domestic_count ?? 0} within India · {o?.stats.overseas_count ?? 0} overseas
            </div>
          </Card>
          <Card className="hod-hover-card">
            <div className="text-[13.5px] text-[#5c6573]">Studying abroad</div>
            <div className="mt-1.5 text-[30px] font-extrabold text-ink">{o?.stats.overseas_count ?? 0}</div>
            <div className="mt-1 text-[12.5px] text-subtle">
              Across {o?.stats.countries.length ?? 0} {o?.stats.countries.length === 1 ? "country" : "countries"}
            </div>
          </Card>
          <Card className="hod-hover-card">
            <div className="text-[13.5px] text-[#5c6573]">Countries</div>
            <div className="mt-1.5 truncate text-[16px] font-extrabold text-ink">
              {o?.stats.countries.length ? o.stats.countries.join(", ") : "—"}
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, register number, university, programme or country"
          className="flex-1"
        />
        <span className="shrink-0 text-[12.5px] text-subtle">
          Showing {rows.length} higher-education record{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {overview.isLoading ? (
        <SkeletonTable rows={7} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          rowClassName="hod-hover-row"
          onRowClick={(r) => router.push(`/hod/higher-education/student/${r.id}`)}
          emptyMessage="No higher-education records found."
        />
      )}
    </div>
  );
}
