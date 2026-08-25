"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddCertificationEntryModal } from "@/modules/iqac/components/studentDevelopment/AddCertificationEntryModal";
import { useCertifications, useCertificationsQuality, type CertificationRow } from "@/modules/iqac/api/studentDevelopment";
import { useExamFilters, currentAcademicYearShort } from "@/modules/iqac/api/academicQuality";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "enrolled", label: "Enrolled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export default function CertificationsPage() {
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("all");

  const certifications = useCertifications(batchId);
  const quality = useCertificationsQuality();
  const filters = useExamFilters();

  const allRows = useMemo(() => certifications.data ?? [], [certifications.data]);

  const rollupItems = useMemo(() => {
    const byDept = new Map<string, number>();
    for (const r of allRows) {
      const code = r.student.department?.code;
      if (!code) continue;
      byDept.set(code, (byDept.get(code) ?? 0) + 1);
    }
    const max = Math.max(1, ...byDept.values());
    return [...byDept.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, count]) => ({ code, value: String(count), pct: Math.round((count / max) * 100) }));
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const okQ =
        !q || `${r.student.name} ${r.platform ?? ""} ${r.track ?? ""}`.toLowerCase().includes(q);
      const okD = dept == null || r.student.department?.code === dept;
      const okS = status === "all" || r.status === status;
      return okQ && okD && okS;
    });
  }, [allRows, search, dept, status]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "recent") rows.sort((a, b) => (b.completed_on ?? "").localeCompare(a.completed_on ?? ""));
    if (sort === "platform") rows.sort((a, b) => (a.platform ?? "").localeCompare(b.platform ?? ""));
    return rows;
  }, [filtered, sort]);

  const columns = useMemo<DataTableColumn<CertificationRow>[]>(
    () => [
      {
        key: "student",
        header: "Student",
        width: "1.4fr",
        sortValue: (r) => r.student.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.student.name}</div>
            <div className="text-[12px] text-subtle">{r.student.roll_no}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.student.department?.code ?? "", render: (r) => r.student.department?.code ?? "—" },
      { key: "platform", header: "Platform", sortValue: (r) => r.platform ?? "", render: (r) => r.platform ?? "—" },
      { key: "track", header: "Track", width: "1.4fr", sortValue: (r) => r.track ?? "", render: (r) => r.track ?? "—" },
      { key: "score", header: "Score", align: "right", sortValue: (r) => r.score ?? "", render: (r) => r.score ?? "—" },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => r.status.replace("_", " ") },
      { key: "completed_on", header: "Completed on", align: "right", sortValue: (r) => r.completed_on ?? "", render: (r) => (r.completed_on ? r.completed_on.slice(0, 10) : "—") },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Student Development · Certifications" />
      <MetricHeader
        name="Certifications"
        blurb="Skill and course certifications (Coursera/NPTEL/AWS-style) — real student_certificates data."
        addLabel="+ Add student entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddCertificationEntryModal onClose={() => setAddingEntry(false)} onCreated={() => certifications.refetch()} />}

      <MetricCards
        cards={[
          { label: "This year", value: quality.data?.this_year ?? "—", foot: "institution level, all departments" },
          { label: "Last year", value: quality.data?.last_year ?? "—", foot: `AY ${currentAcademicYearShort()} prior term` },
          { label: "Target", value: quality.data?.target ?? "—", foot: quality.data?.target != null ? "approved by the IQAC for this AY" : "not yet set by IQAC for this AY" },
          {
            label: "Attainment",
            value: quality.data?.attainment != null ? `${quality.data.attainment}%` : "—",
            foot: "requires a target to compute",
            hasBar: quality.data?.attainment != null,
            barPct: quality.data?.attainment ?? 0,
          },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search student, platform or track"
        selects={[
          {
            label: "BATCH",
            value: batchId != null ? String(batchId) : "all",
            onChange: (v) => setBatchId(v === "all" ? null : Number(v)),
            options: [{ value: "all", label: "All batches" }, ...(filters.data?.batches.map((b) => ({ value: String(b.id), label: b.label })) ?? [])],
          },
          {
            label: "DEPARTMENT",
            value: dept ?? "all",
            onChange: (v) => setDept(v === "all" ? null : v),
            options: [{ value: "all", label: "All departments" }, ...rollupItems.map((d) => ({ value: d.code, label: d.code }))],
          },
          { label: "STATUS", value: status, onChange: setStatus, options: STATUS_OPTIONS },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "recent", label: "Most recent" },
              { value: "platform", label: "Platform" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allRows.length} certifications`}
        onClear={() => {
          setSearch("");
          setBatchId(null);
          setDept(null);
          setStatus("all");
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="certifications on file" />

      <DataTable
        title="Certifications register"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.id}
        loading={certifications.isLoading}
        emptyMessage="No certifications recorded yet."
      />
    </div>
  );
}
