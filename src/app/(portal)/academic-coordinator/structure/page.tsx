"use client";

import { useState } from "react";
import {
  useBatches,
  useClasses,
  useCourses,
  useDepartments,
} from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { DepartmentRail } from "@/modules/academic-structure/components/DepartmentRail";
import { StructurePanel } from "@/modules/academic-structure/components/StructurePanel";
import { BatchesTab } from "@/modules/academic-structure/components/BatchesTab";
import { StatCard } from "@/components/ui/StatCard";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab = "structure" | "batches";

export default function CoordinatorAcademicStructurePage() {
  const [tab, setTab] = useState<Tab>("structure");
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const { data: departments = [] } = useDepartments();
  const { data: courses = [] } = useCourses();
  const { data: batches = [] } = useBatches();
  const { data: classes = [] } = useClasses();

  const effectiveDepartmentId = departmentId ?? departments[0]?.id ?? null;
  const selectedDepartment = departments.find((d) => d.id === effectiveDepartmentId) ?? null;

  return (
    <div className="flex flex-col gap-4.5">
      <div>
        <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Academic Structure</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Department, course, batch, and class hierarchy — read-only view of the institution&apos;s real academic structure.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <StatCard label="Departments" value={departments.length} />
        <StatCard label="Courses" value={courses.length} />
        <StatCard label="Batches" value={batches.length} />
        <StatCard label="Classes" value={classes.length} />
      </div>

      <SegmentedTabs
        className="self-start"
        options={[
          { key: "structure", label: "Departments & classes" },
          { key: "batches", label: "Batches" },
        ]}
        value={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {tab === "structure" ? (
        <div className="grid grid-cols-[260px_1fr] items-start gap-4">
          <DepartmentRail departments={departments} classes={classes} selectedId={effectiveDepartmentId} onSelect={setDepartmentId} />
          {selectedDepartment ? (
            <StructurePanel department={selectedDepartment} courses={courses} batches={batches} classes={classes} readOnly />
          ) : (
            <div className="rounded-card-sm border border-dashed border-border-default bg-surface p-15">
              <EmptyState message="No departments have been set up yet." className="py-0 text-center" />
            </div>
          )}
        </div>
      ) : (
        <BatchesTab batches={batches} classes={classes} readOnly />
      )}
    </div>
  );
}
