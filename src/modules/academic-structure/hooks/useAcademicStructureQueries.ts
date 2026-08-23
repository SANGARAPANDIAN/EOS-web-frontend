import { useQuery } from "@tanstack/react-query";
import { academicStructureService } from "../services/academic-structure.service";
import { academicStructureKeys } from "../query-keys";

export function useDepartments() {
  return useQuery({
    queryKey: academicStructureKeys.departments(),
    queryFn: academicStructureService.listDepartments,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: academicStructureKeys.courses(),
    queryFn: academicStructureService.listCourses,
  });
}

export function useBatches() {
  return useQuery({
    queryKey: academicStructureKeys.batches(),
    queryFn: academicStructureService.listBatches,
  });
}

export function useClasses() {
  return useQuery({
    queryKey: academicStructureKeys.classes(),
    queryFn: academicStructureService.listClasses,
  });
}

export function useClassSubjects(classId: number | null) {
  return useQuery({
    queryKey: academicStructureKeys.classSubjects(classId ?? 0),
    queryFn: () => academicStructureService.classSubjects(classId as number),
    enabled: classId != null,
  });
}

export function useFacultyInDepartment(departmentId: number | null) {
  return useQuery({
    queryKey: academicStructureKeys.facultyInDepartment(departmentId ?? 0),
    queryFn: () => academicStructureService.facultyInDepartment(departmentId as number),
    enabled: departmentId != null,
  });
}
