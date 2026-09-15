"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useStudentCount } from "../hooks/useStudentCount";
import { useCreateClass, useDeleteCourse, useDeleteDepartment } from "../hooks/useAcademicStructureMutations";
import { CannotDeleteModal } from "./CannotDeleteModal";
import { HodPickerDialog } from "./HodPickerDialog";
import { SectionsDialog } from "./SectionsDialog";
import { ClassDialog } from "./ClassDialog";
import { formatBlockers } from "../lib/formatBlockers";
import type { Batch, Course, Department, SchoolClass } from "../types";

interface StructurePanelProps {
  department: Department;
  courses: Course[];
  batches: Batch[];
  classes: SchoolClass[];
  onEditDepartment?: () => void;
  onAddCourse?: () => void;
  onEditCourse?: (course: Course) => void;
  /** Hides every write affordance (edit/delete/add buttons, HOD assignment, section creation) — for viewers without write access to this data, e.g. the Academic Coordinator. */
  readOnly?: boolean;
}

function IconButton({
  icon,
  danger,
  disabled,
  title,
  onClick,
  pending,
}: {
  icon: string;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  pending?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex size-[30px] items-center justify-center rounded-input border border-border-default bg-surface ${
        disabled ? "cursor-not-allowed text-subtle" : danger ? "text-danger-fg hover:bg-danger-bg" : "text-muted hover:bg-surface-tint"
      }`}
    >
      {pending ? (
        <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        <Icon name={icon} size={15} />
      )}
    </button>
  );
}

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-extrabold text-ink">{value}</span>
      <span className="text-[10.5px] text-subtle">{label}</span>
    </div>
  );
}

export function StructurePanel({ department, courses, batches, classes, onEditDepartment, onAddCourse, onEditCourse, readOnly = false }: StructurePanelProps) {
  const [deptBlockers, setDeptBlockers] = useState<string[] | null>(null);
  const [hodPickerOpen, setHodPickerOpen] = useState(false);
  const [sectionsCourse, setSectionsCourse] = useState<Course | null>(null);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const deleteDepartment = useDeleteDepartment();
  const { show } = useToast();

  const departmentCourses = courses.filter((c) => c.department_id === department.id);
  const departmentClasses = classes.filter((c) => c.department_id === department.id);
  const { data: rollCount } = useStudentCount({ department_id: department.id });
  const hod = department.faculty_departments_head_of_department_faculty_idTofaculty;

  function handleDeleteDepartment() {
    deleteDepartment
      .mutateAsync(department.id)
      .then(() => show("Deleted", "success"))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.details) {
          setDeptBlockers(formatBlockers(err.details));
        } else {
          show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
        }
      });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-border-default bg-surface p-4.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="m-0 text-lg font-extrabold text-ink">{department.name}</h2>
              <span className="rounded-[4px] bg-surface-tint px-[7px] py-[3px] font-mono text-[10.5px] font-bold text-muted">
                {department.code}
              </span>
            </div>
            <div className="mt-2 text-[12.5px] text-muted">
              Head of Department: {hod ? `${hod.first_name} ${hod.last_name}${hod.designation ? ` — ${hod.designation}` : ""}` : "Not assigned"}
              {!readOnly && (
                <button type="button" onClick={() => setHodPickerOpen(true)} className="ml-2 text-xs font-semibold text-primary">
                  {hod ? "Change" : "Assign"}
                </button>
              )}
            </div>
          </div>
          {!readOnly && (
            <div className="flex gap-1.5">
              <IconButton icon="edit" title="Edit" onClick={onEditDepartment} />
              <IconButton
                icon="delete"
                danger
                title={
                  departmentCourses.length > 0 || departmentClasses.length > 0
                    ? `Cannot be deleted while it has ${departmentCourses.length} courses and ${departmentClasses.length} classes`
                    : "Delete department"
                }
                disabled={departmentCourses.length > 0 || departmentClasses.length > 0 || deleteDepartment.isPending}
                pending={deleteDepartment.isPending}
                onClick={handleDeleteDepartment}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-7">
          <Figure label={departmentCourses.length === 1 ? "course" : "courses"} value={departmentCourses.length} />
          <Figure label={departmentClasses.length === 1 ? "class" : "classes"} value={departmentClasses.length} />
          <Figure label="on the roll" value={rollCount ?? "…"} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="m-0 text-sm font-bold text-body">Courses</h3>
        {!readOnly && (
          <Button variant="secondary" className="flex w-auto items-center gap-1.5" onClick={onAddCourse}>
            <Icon name="add" size={16} /> Add course
          </Button>
        )}
      </div>

      {departmentCourses.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-default bg-surface p-10 text-center">
          <Icon name="menu_book" size={28} className="mx-auto mb-2.5 text-subtle" />
          <p className="m-0 text-[13px] font-semibold text-body">No courses in {department.code} yet.</p>
          <p className="mx-auto my-1.5 max-w-90 text-xs text-muted">
            A course is the degree — B.E. Computer Science and Engineering, M.E. Structural Engineering. Classes hang off it.
          </p>
          {!readOnly && (
            <Button variant="secondary" className="mx-auto w-auto" onClick={onAddCourse}>
              Add the first course
            </Button>
          )}
        </div>
      ) : (
        departmentCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            batches={batches}
            classes={classes.filter((c) => c.course_id === course.id)}
            allClasses={classes}
            onEdit={() => onEditCourse?.(course)}
            onAddSections={() => setSectionsCourse(course)}
            onEditClass={setEditingClass}
            readOnly={readOnly}
          />
        ))
      )}

      {!readOnly && hodPickerOpen && (
        <HodPickerDialog open={hodPickerOpen} onClose={() => setHodPickerOpen(false)} department={department} />
      )}

      {!readOnly && sectionsCourse && (
        <SectionsDialog
          open={!!sectionsCourse}
          onClose={() => setSectionsCourse(null)}
          course={sectionsCourse}
          batches={batches}
          classes={classes}
        />
      )}

      {!readOnly && editingClass && (
        <ClassDialog
          open={!!editingClass}
          onClose={() => setEditingClass(null)}
          classItem={editingClass}
          course={departmentCourses.find((c) => c.id === editingClass.course_id) ?? departmentCourses[0]}
          batches={batches}
          classes={classes}
        />
      )}

      {!readOnly && deptBlockers && (
        <CannotDeleteModal open={!!deptBlockers} onClose={() => setDeptBlockers(null)} label={`department "${department.name}"`} blockers={deptBlockers} />
      )}
    </div>
  );
}

interface CourseCardProps {
  course: Course;
  batches: Batch[];
  classes: SchoolClass[];
  allClasses: SchoolClass[];
  onEdit: () => void;
  onAddSections: () => void;
  onEditClass: (c: SchoolClass) => void;
  readOnly?: boolean;
}

function CourseCard({ course, batches, classes, allClasses, onEdit, onAddSections, onEditClass, readOnly = false }: CourseCardProps) {
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const { data: studentCount } = useStudentCount({ course_id: course.id });
  const deleteCourse = useDeleteCourse();
  const { show } = useToast();

  const batchIdsInUse = Array.from(new Set(classes.map((c) => c.batch_id)));
  const batchesInUse = batches.filter((b) => batchIdsInUse.includes(b.id));

  function handleDelete() {
    deleteCourse
      .mutateAsync(course.id)
      .then(() => show("Deleted", "success"))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.details) {
          setBlockers(formatBlockers(err.details));
        } else {
          show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
        }
      });
  }

  return (
    <div className="overflow-hidden rounded-card border border-border-default bg-surface">
      <div className="flex items-start justify-between border-b border-divider px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">{course.name}</span>
            <span className="rounded-[4px] bg-surface-tint px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted">{course.code}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-subtle">
            {course.duration_years} year{course.duration_years === 1 ? "" : "s"} · {course.duration_years * 2} semesters
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex gap-4.5">
            <Figure label={classes.length === 1 ? "class" : "classes"} value={classes.length} />
            <Figure label="students" value={studentCount ?? "…"} />
          </div>
          {!readOnly && (
            <div className="flex gap-1.5">
              <IconButton icon="edit" title="Edit" onClick={onEdit} />
              <IconButton
                icon="delete"
                danger
                title={classes.length > 0 ? `Has ${classes.length} classes — remove those first` : "Delete course"}
                disabled={classes.length > 0 || deleteCourse.isPending}
                pending={deleteCourse.isPending}
                onClick={handleDelete}
              />
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {batchesInUse.length === 0 ? (
          <div className="py-6 text-center">
            <Icon name="layers" size={22} className="mx-auto mb-2 text-subtle" />
            <p className="m-0 text-[12.5px] font-semibold text-body">No classes yet.</p>
            <p className="mt-1 text-[11.5px] text-muted">
              Until a section exists, the admission form has nowhere to allocate a student on this course.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {batchesInUse.map((batch) => (
              <BatchRow
                key={batch.id}
                batch={batch}
                classes={classes.filter((c) => c.batch_id === batch.id)}
                allClasses={allClasses}
                course={course}
                onEditClass={onEditClass}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
        {!readOnly && (
          <Button variant="secondary" className="mt-3.5 w-full" onClick={onAddSections}>
            {batchesInUse.length === 0 ? "Add the first sections" : "Sections for another batch"}
          </Button>
        )}
      </div>

      {!readOnly && blockers && (
        <CannotDeleteModal open={!!blockers} onClose={() => setBlockers(null)} label={`course "${course.name}"`} blockers={blockers} />
      )}
    </div>
  );
}

interface BatchRowProps {
  batch: Batch;
  classes: SchoolClass[];
  allClasses: SchoolClass[];
  course: Course;
  onEditClass: (c: SchoolClass) => void;
  readOnly?: boolean;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** First letter A-Z not already used as a section in this batch+course — the label a slot click will create. Renaming a class away from a plain letter frees that letter up again, which is expected. */
function nextAvailableLetter(takenSections: Set<string>): string | null {
  return ALPHABET.find((l) => !takenSections.has(l)) ?? null;
}

function BatchRow({ batch, classes, course, onEditClass, readOnly = false }: BatchRowProps) {
  const classIds = classes.map((c) => c.id);
  const { data: studentCount } = useStudentCount(classIds.length > 0 ? { class_id: classIds[0] } : {});
  const addSlot = useAddSlotClass(course, batch);

  const takenSections = new Set(classes.map((c) => c.section));
  const nextLetter = readOnly ? null : nextAvailableLetter(takenSections);

  return (
    <div className="rounded-card-sm border border-divider p-3">
      <div className="mb-2.5 flex justify-between">
        <span className="text-[12.5px] font-semibold text-body">{batch.name}</span>
        <span className="text-[11px] text-subtle">
          {classes.length} {classes.length === 1 ? "class" : "classes"}
          {studentCount ? ` · ${studentCount} students` : ""}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {classes.map((cls) =>
          readOnly ? (
            <div key={cls.id} className="rounded-input border border-border-default bg-surface-tint p-2 text-left">
              <div className="text-[13px] font-bold text-ink">{cls.section}</div>
              <div className="mt-0.5 text-[10px] text-subtle">
                {cls.current_semester ? `Semester ${cls.current_semester}` : "No semester set"}
              </div>
            </div>
          ) : (
            <button
              key={cls.id}
              type="button"
              onClick={() => onEditClass(cls)}
              className="rounded-input border border-border-default bg-surface-tint p-2 text-left hover:border-primary"
            >
              <div className="text-[13px] font-bold text-ink">{cls.section}</div>
              <div className="mt-0.5 text-[10px] text-subtle">
                {cls.current_semester ? `Semester ${cls.current_semester}` : "No semester set"}
              </div>
            </button>
          ),
        )}

        {nextLetter && (
          <button
            type="button"
            onClick={() => addSlot.create(nextLetter)}
            disabled={addSlot.pending}
            title={`Create section ${nextLetter} for ${batch.name} — rename it afterward from the class editor if you want something else`}
            className="rounded-input border border-dashed border-border-default bg-surface p-2 text-left text-subtle hover:border-primary hover:text-primary"
          >
            <div className="text-[13px] font-bold">{nextLetter}</div>
            <div className="mt-0.5 text-[10px]">+ Add</div>
          </button>
        )}
      </div>
    </div>
  );
}

/** Instant single-section creation (empty slot click) — no dialog, matches the reference. Not restricted to A-D. */
function useAddSlotClass(course: Course, batch: Batch) {
  const { show } = useToast();
  const createClass = useCreateClass();

  function create(section: string, onDone?: () => void) {
    createClass
      .mutateAsync({
        batch_id: batch.id,
        department_id: course.department_id,
        course_id: course.id,
        section,
      })
      .then(() => {
        show(`Section ${section} created`, "success");
        onDone?.();
      })
      .catch((err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
      });
  }

  return { create, pending: createClass.isPending };
}
