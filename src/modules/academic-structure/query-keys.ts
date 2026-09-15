const base = ["academic-structure"] as const;

export const academicStructureKeys = {
  departments: () => [...base, "departments"] as const,
  courses: () => [...base, "courses"] as const,
  batches: () => [...base, "batches"] as const,
  classes: () => [...base, "classes"] as const,
  classSubjects: (classId: number) => [...base, "classes", classId, "subjects"] as const,
  facultyInDepartment: (departmentId: number) => [...base, "faculty", departmentId] as const,
};
