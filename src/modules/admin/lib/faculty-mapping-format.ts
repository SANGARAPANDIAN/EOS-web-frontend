import type { FacultyMapping } from "@/modules/admin/api/facultyMapping";

export function subjectLabel(mapping: FacultyMapping): string {
  return mapping.subject.name;
}

export function classLabel(mapping: FacultyMapping): string {
  return `${mapping.class.department.code} · Section ${mapping.class.section}`;
}
