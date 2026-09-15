import { useMutation, useQueryClient } from "@tanstack/react-query";
import { academicStructureService } from "../services/academic-structure.service";
import { academicStructureKeys } from "../query-keys";
import type {
  AssignHodInput,
  CreateBatchInput,
  CreateClassInput,
  CreateCourseInput,
  CreateDepartmentInput,
  UpdateBatchInput,
  UpdateClassInput,
  UpdateCourseInput,
  UpdateDepartmentInput,
} from "../types";

// --- Departments ---

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) => academicStructureService.createDepartment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.departments() }),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateDepartmentInput }) =>
      academicStructureService.updateDepartment(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.departments() }),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => academicStructureService.deleteDepartment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.departments() }),
  });
}

export function useAssignHod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AssignHodInput }) =>
      academicStructureService.assignHod(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.departments() }),
  });
}

// --- Courses ---

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourseInput) => academicStructureService.createCourse(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.courses() }),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCourseInput }) =>
      academicStructureService.updateCourse(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.courses() }),
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => academicStructureService.deleteCourse(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.courses() }),
  });
}

// --- Batches ---

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBatchInput) => academicStructureService.createBatch(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.batches() }),
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBatchInput }) =>
      academicStructureService.updateBatch(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.batches() }),
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => academicStructureService.deleteBatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.batches() }),
  });
}

// --- Classes ---

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassInput) => academicStructureService.createClass(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.classes() }),
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateClassInput }) =>
      academicStructureService.updateClass(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.classes() }),
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => academicStructureService.deleteClass(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.classes() }),
  });
}

/**
 * Bulk-create sections for a course+batch — mirrors the reference's
 * `addSections`: creates one class per chosen letter, tolerating individual
 * failures (e.g. a letter another tab already took) so one clash doesn't
 * block the rest. Returns which letters actually got created.
 */
export function useCreateSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      batch_id,
      department_id,
      course_id,
      sections,
      current_semester,
    }: {
      batch_id: number;
      department_id: number;
      course_id: number;
      sections: CreateClassInput["section"][];
      current_semester?: number;
    }) => {
      const created: CreateClassInput["section"][] = [];
      const skipped: CreateClassInput["section"][] = [];
      for (const section of sections) {
        try {
          await academicStructureService.createClass({
            batch_id,
            department_id,
            course_id,
            section,
            current_semester,
          });
          created.push(section);
        } catch {
          skipped.push(section);
        }
      }
      return { created, skipped };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicStructureKeys.classes() }),
  });
}
