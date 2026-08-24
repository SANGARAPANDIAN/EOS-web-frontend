"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddPlacementEntryModal } from "@/modules/iqac/components/studentDevelopment/AddPlacementEntryModal";
import { usePlacementsSummary, usePlacementsDepartments, usePlacementsQuality, useLeadingRecruiters, type RecruiterRow } from "@/modules/iqac/api/studentDevelopment";
import { useExamFilters, currentAcademicYearShort } from "@/modules/iqac/api/academicQuality";

const PACKAGE_BUCKETS = [
  { value: "all", label: "All package" },
  { value: "below5", label: "Below ₹5 LPA" },
  { value: "5to10", label: "₹5–10 LPA" },
  { value: "above10", label: "Above ₹10 LPA" },
];

function inPackageBucket(pkg: number | null, bucket: string): boolean {
  if (bucket === "all") return true;
  if (pkg == null) return false;
  if (bucket === "below5") return pkg < 5;
  if (bucket === "5to10") return pkg >= 5 && pkg <= 10;
  return pkg > 10;
}

export default function PlacementsPage() {
  const router = useRouter();
  const summary = usePlacementsSummary();
  const departments = usePlacementsDepartments();
  const quality = usePlacementsQuality();
  const filters = useExamFilters();
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [role, setRole] = useState("all");
  const [packageBucket, setPackageBucket] = useState("all");
  const [sort, setSort] = useState("all");

  const recruiters = useLeadingRecruiters(batchId);
  const allRecruiters = useMemo(() => recruiters.data ?? [], [recruiters.data]);

  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    for (const r of allRecruiters) for (const role of r.roles) roles.add(role);
    return Array.from(roles).sort();
  }, [allRecruiters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRecruiters.filter((r) => {
      const okQ = !q || `${r.company_name} ${r.roles.join(" ")}`.toLowerCase().includes(q);
      const okD = dept == null || r.department_codes.includes(dept);
      const okR = role === "all" || r.roles.includes(role);
      const okP = inPackageBucket(r.average_package, packageBucket);
      return okQ && okD && okR && okP;
    });
  }, [allRecruiters, search, dept, role, packageBucket]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "high") rows.sort((a, b) => (b.highest_package ?? 0) - (a.highest_package ?? 0));
    if (sort === "low") rows.sort((a, b) => (a.highest_package ?? 0) - (b.highest_package ?? 0));
    return rows;
  }, [filtered, sort]);

  const rollupItems = (departments.data ?? [])
    .filter((d) => d.eligible > 0)
    .map((d) => ({ code: d.department.code, value: d.placement_rate != null ? `${d.placement_rate}%` : "—", pct: d.placement_rate }));

  const deptRatesWithValue = (departments.data ?? []).map((d) => d.placement_rate).filter((v): v is number => v != null);
  const meanDeptRate = deptRatesWithValue.length > 0 ? Math.round((deptRatesWithValue.reduce((a, b) => a + b, 0) / deptRatesWithValue.length) * 10) / 10 : null;

  const columns = useMemo<DataTableColumn<RecruiterRow>[]>(
    () => [
      { key: "recruiter", header: "Recruiter", width: "1.6fr", sortValue: (r) => r.company_name, render: (r) => <span className="font-bold text-ink">{r.company_name}</span> },
      { key: "roles", header: "Roles", sortValue: (r) => r.roles.join(", "), render: (r) => r.roles.join(", ") || "—" },
      { key: "offers", header: "Offers", align: "right", sortValue: (r) => r.offers, render: (r) => r.offers },
      { key: "avg", header: "Avg package", align: "right", sortValue: (r) => r.average_package ?? -1, render: (r) => (r.average_package != null ? `₹${r.average_package} LPA` : "—") },
      { key: "high", header: "Highest package", align: "right", sortValue: (r) => r.highest_package ?? -1, render: (r) => (r.highest_package != null ? `₹${r.highest_package} LPA` : "—") },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Student Development · Placements" />
      <MetricHeader
        name="Placements"
        blurb="Offers accepted by placement-eligible students — real placement_drives and application data."
        addLabel="+ Add student entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddPlacementEntryModal onClose={() => setAddingEntry(false)} onCreated={() => recruiters.refetch()} />}

      <MetricCards
        cards={[
          { label: "This year", value: quality.data?.this_year ?? "—", foot: "institution level, all departments" },
          { label: "Last year", value: quality.data?.last_year ?? "—", foot: `AY ${currentAcademicYearShort()} prior term` },
          { label: "Target", value: quality.data?.target ?? "—", foot: quality.data?.target != null ? "approved by the IQAC for this AY" : "not yet set by IQAC for this AY" },
          {
            label: "Attainment",
            value: quality.data?.attainment != null ? `${quality.data.attainment}%` : "—",
            foot: meanDeptRate != null ? `mean placement rate across departments ${meanDeptRate}%` : "requires a target to compute",
            hasBar: quality.data?.attainment != null,
            barPct: quality.data?.attainment ?? 0,
          },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search placements by recruiter, role or package"
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
          {
            label: "ROLE",
            value: role,
            onChange: setRole,
            options: [{ value: "all", label: "All role" }, ...roleOptions.map((r) => ({ value: r, label: r }))],
          },
          {
            label: "PACKAGE",
            value: packageBucket,
            onChange: setPackageBucket,
            options: PACKAGE_BUCKETS,
          },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "high", label: "Highest package" },
              { value: "low", label: "Lowest package" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allRecruiters.length} recruiters`}
        onClear={() => {
          setSearch("");
          setBatchId(null);
          setRole("all");
          setPackageBucket("all");
          setDept(null);
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="placement rate" />

      <DataTable
        title="Leading recruiters"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.company_id}
        loading={recruiters.isLoading}
        emptyMessage="No placed offers found."
        onRowClick={(r) => router.push(`/iqac/quality/student/placements/${r.company_id}`)}
      />
    </div>
  );
}
