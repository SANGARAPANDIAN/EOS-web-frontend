"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { KpiCard } from "@/modules/admin/components/ui/KpiCard";
import { SegmentedPillToggle } from "@/modules/admin/components/ui/SegmentedPillToggle";
import { useBatches, useClasses, useCourses, useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { DepartmentRail } from "@/modules/academic-structure/components/DepartmentRail";
import { StructurePanel } from "@/modules/academic-structure/components/StructurePanel";
import { BatchesTab } from "@/modules/academic-structure/components/BatchesTab";
import { DepartmentDialog } from "@/modules/academic-structure/components/DepartmentDialog";
import { CourseDialog } from "@/modules/academic-structure/components/CourseDialog";
import { BatchDialog } from "@/modules/academic-structure/components/BatchDialog";
import type { Batch, Course, Department } from "@/modules/academic-structure/types";

type Tab = "structure" | "batches";

export default function AcademicStructurePage() {
  const [tab, setTab] = useState<Tab>("structure");
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const { data: departments = [] } = useDepartments();
  const { data: courses = [] } = useCourses();
  const { data: batches = [] } = useBatches();
  const { data: classes = [] } = useClasses();

  const [departmentDialog, setDepartmentDialog] = useState<{ open: boolean; department: Department | null }>({
    open: false,
    department: null,
  });
  const [courseDialog, setCourseDialog] = useState<{ open: boolean; course: Course | null } | null>(null);
  const [batchDialog, setBatchDialog] = useState<{ open: boolean; batch: Batch | null }>({ open: false, batch: null });

  // No effect: default to the first department purely at render time until
  // the user explicitly picks one — matches this codebase's established
  // pattern of avoiding setState-in-effect for a value derivable from props/state.
  const effectiveDepartmentId = departmentId ?? departments[0]?.id ?? null;
  const selectedDepartment = departments.find((d) => d.id === effectiveDepartmentId) ?? null;

  return (
    <div className="flex flex-col gap-4.5">
      <nav className="flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Academic structure</span>
      </nav>

      <h1 className="m-0 font-sans text-[30px] font-extrabold tracking-[-.02em] text-admin-ink">Academic structure</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Departments" value={departments.length} />
        <KpiCard label="Courses" value={courses.length} />
        <KpiCard label="Classes" value={classes.length} />
        <button type="button" onClick={() => setTab("batches")} className="cursor-pointer text-left" title="Open the batches tab">
          <KpiCard label="Batches" value={batches.length} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SegmentedPillToggle
          options={[
            { value: "structure", label: "Departments & classes" },
            { value: "batches", label: "Batches" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <p className="m-0 text-[12.5px] text-admin-subtle">
          Classes created here are the only ones the admission form can allocate a student to.
        </p>
      </div>

      {tab === "structure" ? (
        <div className="grid grid-cols-[260px_1fr] items-start gap-4">
          <DepartmentRail
            departments={departments}
            classes={classes}
            selectedId={effectiveDepartmentId}
            onSelect={setDepartmentId}
            onAdd={() => setDepartmentDialog({ open: true, department: null })}
          />
          {selectedDepartment ? (
            <StructurePanel
              department={selectedDepartment}
              courses={courses}
              batches={batches}
              classes={classes}
              onEditDepartment={() => setDepartmentDialog({ open: true, department: selectedDepartment })}
              onAddCourse={() => setCourseDialog({ open: true, course: null })}
              onEditCourse={(course) => setCourseDialog({ open: true, course })}
            />
          ) : (
            <div className="rounded-admin-lg border border-dashed border-admin-border p-15 text-center">
              <p className="m-0 text-[13px] text-admin-subtle">Add a department to start building the structure.</p>
            </div>
          )}
        </div>
      ) : (
        <BatchesTab
          batches={batches}
          classes={classes}
          onAdd={() => setBatchDialog({ open: true, batch: null })}
          onEdit={(batch) => setBatchDialog({ open: true, batch })}
        />
      )}

      {departmentDialog.open && (
        <DepartmentDialog
          key={departmentDialog.department?.id ?? "new"}
          open={departmentDialog.open}
          onClose={() => setDepartmentDialog({ open: false, department: null })}
          department={departmentDialog.department}
        />
      )}

      {courseDialog?.open && (
        <CourseDialog
          key={courseDialog.course?.id ?? "new"}
          open={courseDialog.open}
          onClose={() => setCourseDialog(null)}
          course={courseDialog.course}
          departments={departments}
          defaultDepartmentId={effectiveDepartmentId}
        />
      )}

      {batchDialog.open && (
        <BatchDialog
          key={batchDialog.batch?.id ?? "new"}
          open={batchDialog.open}
          onClose={() => setBatchDialog({ open: false, batch: null })}
          batch={batchDialog.batch}
        />
      )}
    </div>
  );
}
