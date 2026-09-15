"use client";

import { useMemo, useState } from "react";
import { useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useCoordinatorFacultyList, useCoordinatorFacultyProfile, useCoordinatorFacultyWorkload } from "@/modules/academic-coordinator/hooks/useFacultyQueries";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { FacultyListItem } from "@/modules/academic-coordinator/types";

export default function CoordinatorFacultyPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const departments = useDepartments();
  const list = useCoordinatorFacultyList({ q: search.trim() || undefined, department_id: deptFilter === "All" ? undefined : Number(deptFilter) });
  const workload = useCoordinatorFacultyWorkload();
  const faculty = list.data?.faculty ?? [];
  const effectiveSelectedId = selectedId ?? faculty[0]?.id ?? null;
  const profile = useCoordinatorFacultyProfile(effectiveSelectedId);

  const hoursById = useMemo(() => new Map((workload.data?.summary ?? []).map((s) => [s.facultyId, s.weeklyHours])), [workload.data]);

  const overloadedCount = (workload.data?.summary ?? []).filter((s) => s.weeklyHours > s.weeklyLoadCapHours).length;
  const avgLoad = workload.data?.summary.length
    ? Math.round((workload.data.summary.reduce((sum, s) => sum + s.weeklyHours, 0) / workload.data.summary.length) * 10) / 10
    : 0;

  const columns: DataTableColumn<FacultyListItem>[] = [
    { key: "id", header: "ID", width: "0.7fr", render: (f) => <span className="font-mono text-[11px] text-muted">FAC{f.id}</span> },
    {
      key: "name",
      header: "NAME",
      width: "1.6fr",
      render: (f) => (
        <span className={`-mx-2 rounded px-2 py-1 font-semibold ${f.id === effectiveSelectedId ? "bg-accent-100 text-primary" : "text-ink"}`}>
          {f.name}
        </span>
      ),
    },
    { key: "designation", header: "DESIGNATION", width: "1.4fr", render: (f) => <>{f.designation ?? "—"}</> },
    { key: "dept", header: "DEPT", width: "0.7fr", render: (f) => <>{f.department?.code ?? "—"}</> },
    { key: "load", header: "LOAD", width: "0.7fr", render: (f) => <>{hoursById.has(f.id) ? `${hoursById.get(f.id)} hrs` : "—"}</> },
    { key: "status", header: "STATUS", width: "0.9fr", render: () => <Badge tone="accent">Active</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div>
        <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Faculty Management</h1>
        <p className="mt-1.5 text-[13px] text-muted">Directory, profiles and workload — institution-wide.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <StatCard label="Total faculty" value={list.data?.total ?? 0} />
        <StatCard label="Active" value={list.data?.total ?? 0} />
        <StatCard label="Average load" value={`${avgLoad} hrs`} href="/academic-coordinator/workload" />
        <StatCard label="Overloaded" value={overloadedCount} href="/academic-coordinator/workload" />
      </div>

      <div className="grid grid-cols-[1.7fr_minmax(300px,1fr)] items-start gap-4">
        <DataTable
          title="Faculty directory"
          titleNote={
            <div className="flex gap-2.5">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or designation" className="h-[34px] min-w-55" />
              <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-[34px]">
                <option value="All">All departments</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </Select>
            </div>
          }
          columns={columns}
          data={faculty}
          rowKey={(f) => f.id}
          loading={list.isLoading}
          hoverableRows
          onRowClick={(f) => setSelectedId(f.id)}
          emptyMessage="No faculty match these filters."
        />

        <Card className="sticky top-4">
          {!profile.data ? (
            <p className="text-[12.5px] text-subtle">Select a faculty member to view their profile.</p>
          ) : (
            <>
              <span className="text-[11px] font-bold tracking-[.04em] text-subtle">FACULTY PROFILE</span>
              <h2 className="mt-1.5 mb-0.5 text-lg font-bold text-ink">{profile.data.name}</h2>
              <p className="m-0 text-xs text-muted">
                FAC{profile.data.id} · {profile.data.designation ?? "—"} · {profile.data.department?.code ?? "—"}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                {(
                  [
                    ["Email", profile.data.email],
                    ["Phone", profile.data.phone ?? "—"],
                    ["Specialization", profile.data.specialization ?? "—"],
                    ["Employment", profile.data.employmentType ?? "—"],
                    ["Status", profile.data.status],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-divider pb-1.5 text-[12.5px]">
                    <span className="text-muted">{label}</span>
                    <span className="text-right font-semibold text-ink">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-bold tracking-[.04em] text-subtle">ASSIGNED COURSES</span>
                <div className="mt-2 flex max-h-55 flex-col gap-1.5 overflow-y-auto">
                  {profile.data.courses.length === 0 ? (
                    <p className="m-0 text-xs text-subtle">No courses assigned.</p>
                  ) : (
                    profile.data.courses.map((c) => (
                      <div key={c.mappingId} className="flex justify-between gap-2 rounded-[7px] border border-divider px-2.5 py-1.5 text-[11.5px]">
                        <span className="shrink-0 font-bold text-primary">{c.subjectCode}</span>
                        <span className="min-w-0 flex-1 truncate">{c.classLabel}</span>
                        <span className="shrink-0 text-subtle">{c.weeklyHours} hrs</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold tracking-[.04em] text-subtle">WEEKLY WORKLOAD</span>
                  <span className="text-[12.5px] font-semibold text-ink">
                    {profile.data.weeklyLoadHours} / {profile.data.weeklyLoadCapHours} hrs
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-surface-tint">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(100, Math.round((profile.data.weeklyLoadHours / profile.data.weeklyLoadCapHours) * 100))}%`,
                      background: profile.data.weeklyLoadHours > profile.data.weeklyLoadCapHours ? "#dc2626" : "#1f4fd8",
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
