"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Avatar, Badge, Input, Select, SkeletonStatTiles, SkeletonTable } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useHodEdc, type HodEdcRow } from "@/modules/hod/api/edc";

// Same green hex as class-records'/placements'/higher-education's status
// pills — Badge has no green tone, so this one case borrows the raw-span
// pattern already established there instead of adding a new Badge tone.
const GREEN_PILL_CLASS = "text-[#15803d] bg-[#effaf3] border border-[#cdeed9]";

function stageTone(stage: string): "green" | "accent" | "neutral" {
  const s = stage.toLowerCase();
  if (s.includes("scaled") || s.includes("funded") || s.includes("operating")) return "green";
  if (s.includes("idea")) return "neutral";
  return "accent";
}

function StagePill({ stage }: { stage: string }) {
  const tone = stageTone(stage);
  if (tone === "green") {
    return (
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-pill border px-[9px] py-1 text-[10.5px] font-extrabold tracking-[.06em] ${GREEN_PILL_CLASS}`}
      >
        {stage}
      </span>
    );
  }
  return <Badge tone={tone}>{stage}</Badge>;
}

export default function HodEdcPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const overview = useHodEdc(search, batchId, departmentId);
  const o = overview.data;
  const rows = o?.rows ?? [];

  const columns: DataTableColumn<HodEdcRow>[] = [
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
      key: "venture",
      header: "Venture",
      width: "1.4fr",
      render: (r) => <span className="text-[13.5px] font-bold text-ink">{r.venture}</span>,
    },
    {
      key: "domain",
      header: "Domain",
      width: "1.2fr",
      render: (r) => <span className="text-[13px] text-ink">{r.domain ?? "—"}</span>,
    },
    {
      key: "role",
      header: "Role",
      width: "1fr",
      render: (r) => (r.role ? <span className="text-[13px] text-ink">{r.role}</span> : <span className="text-subtle">—</span>),
    },
    {
      key: "monthly_revenue",
      header: "Monthly rev.",
      width: "110px",
      align: "right",
      render: (r) => (
        <span className="text-[13px] font-bold text-ink">
          {r.monthly_revenue != null ? `₹${r.monthly_revenue.toLocaleString("en-IN")}` : "—"}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      width: "150px",
      render: (r) => (r.stage ? <StagePill stage={r.stage} /> : <span className="text-subtle">—</span>),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Entrepreneurship Development Cell</h1>
          <p className="mt-1 text-[13px] text-muted">
            Students building ventures through the EDC · open a student for the full entrepreneurship file
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
            value={departmentId ?? "all"}
            onChange={(e) => setDepartmentId(e.target.value === "all" ? null : Number(e.target.value))}
            className="max-w-[200px] font-bold"
          >
            <option value="all">All departments</option>
            {(o?.filters.departments ?? []).map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.code}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {overview.isLoading ? (
        <SkeletonStatTiles count={4} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <Card className="hod-hover-card">
            <div className="text-[13.5px] text-[#5c6573]">Students in EDC</div>
            <div className="mt-1.5 text-[30px] font-extrabold text-ink">{o?.stats.total ?? 0}</div>
            <div className="mt-1 text-[12.5px] text-subtle">Across all departments and batches</div>
          </Card>
          <Card className="hod-hover-card">
            <div className="text-[13.5px] text-[#5c6573]">Startups</div>
            <div className="mt-1.5 text-[30px] font-extrabold text-ink">{o?.stats.startups_beyond_idea ?? 0}</div>
            <div className="mt-1 text-[12.5px] text-subtle">Beyond idea stage and still active</div>
          </Card>
          <Card className="hod-hover-card">
            <div className="text-[13.5px] text-[#5c6573]">Registered ventures</div>
            <div className="mt-1.5 text-[30px] font-extrabold text-ink">{o?.stats.registered_ventures ?? 0}</div>
            <div className="mt-1 text-[12.5px] text-subtle">
              {o?.stats.private_limited_count ?? 0} private limited · rest LLP or proprietorship
            </div>
          </Card>
          <Card className="hod-hover-card border-border-accent bg-accent-50">
            <div className="text-[13.5px] text-[#5c6573]">Startups inside college</div>
            <div className="mt-1.5 text-[30px] font-extrabold text-ink">{o?.stats.startups_inside_college ?? 0}</div>
            <div className="mt-1 text-[12.5px] text-subtle">Seated in the campus incubation centre</div>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, register number, venture, domain or stage"
          className="flex-1"
        />
        <span className="shrink-0 text-[12.5px] text-subtle">
          Showing {rows.length} of {o?.stats.total ?? 0} EDC record{rows.length === 1 ? "" : "s"}
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
          onRowClick={(r) => router.push(`/hod/edc/student/${r.id}`)}
          emptyMessage="No EDC records found."
        />
      )}
    </div>
  );
}
