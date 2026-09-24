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
import { DepartmentDialog } from "@/modules/academic-structure/components/DepartmentDialog";
import { CourseDialog } from "@/modules/academic-structure/components/CourseDialog";
import { BatchDialog } from "@/modules/academic-structure/components/BatchDialog";
import { StatCard } from "@/components/ui/StatCard";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/modules/admin/components/ui";
import type { Batch, Course, Department } from "@/modules/academic-structure/types";

type Tab = "structure" | "batches";

export default function AdminAcademicStructurePage() {
  const [tab, setTab] = useState<Tab>("structure");
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const [departmentDialog, setDepartmentDialog] = useState<{ open: boolean; department?: Department }>({ open: false });
  const [courseDialog, setCourseDialog] = useState<{ open: boolean; course?: Course } | null>(null);
  const [batchDialog, setBatchDialog] = useState<{ open: boolean; batch?: Batch }>({ open: false });

  const { data: departments = [] } = useDepartments();
  const { data: courses = [] } = useCourses();
  const { data: batches = [] } = useBatches();
  const { data: classes = [] } = useClasses();

  const hasSelection = departmentId != null && departments.some((d) => d.id === departmentId);
  const effectiveDepartmentId = hasSelection ? departmentId : (departments[0]?.id ?? null);
  const selectedDepartment = departments.find((d) => d.id === effectiveDepartmentId) ?? null;

  return (
    <div className="flex flex-col gap-4.5">
      <PageHeader
        title="Academic Structure"
        description="Departments, courses, batches, and classes — the institution's foundational structure. Faculty assignment, admissions, and timetables all depend on this existing first."
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <StatCard label="Departments" value={departments.length} />
        <StatCard label="Courses" value={courses.length} />
        <StatCard label="Batches" value={batches.length} />
        <StatCard label="Classes" value={classes.length} />
      </div>

      <SegmentedTabs
        options={[
          { key: "structure", label: "Departments & classes" },
          { key: "batches", label: "Batches" },
        ]}
        value={tab}
        onChange={(k) => setTab(k as Tab)}
        className="self-start"
      />

      {tab === "structure" ? (
        <div className="grid grid-cols-[260px_1fr] items-start gap-4">
          <DepartmentRail
            departments={departments}
            classes={classes}
            selectedId={effectiveDepartmentId}
            onSelect={setDepartmentId}
            onAdd={() => setDepartmentDialog({ open: true })}
          />
          {selectedDepartment ? (
            <StructurePanel
              department={selectedDepartment}
              courses={courses}
              batches={batches}
              classes={classes}
              onEditDepartment={() => setDepartmentDialog({ open: true, department: selectedDepartment })}
              onAddCourse={() => setCourseDialog({ open: true })}
              onEditCourse={(course) => setCourseDialog({ open: true, course })}
            />
          ) : (
            <Card className="border-dashed p-15 text-center">
              <p className="m-0 text-[13px] text-subtle">No departments have been set up yet. Add the first one to begin.</p>
            </Card>
          )}
        </div>
      ) : (
        <BatchesTab
          batches={batches}
          classes={classes}
          onAdd={() => setBatchDialog({ open: true })}
          onEdit={(batch) => setBatchDialog({ open: true, batch })}
        />
      )}

      {departmentDialog.open && (
        <DepartmentDialog
          open={departmentDialog.open}
          onClose={() => setDepartmentDialog({ open: false })}
          department={departmentDialog.department}
        />
      )}

      {courseDialog?.open && selectedDepartment && (
        <CourseDialog
          open={courseDialog.open}
          onClose={() => setCourseDialog(null)}
          department={selectedDepartment}
          course={courseDialog.course}
        />
      )}

      {batchDialog.open && (
        <BatchDialog open={batchDialog.open} onClose={() => setBatchDialog({ open: false })} batch={batchDialog.batch} />
      )}
    </div>
  );
}
