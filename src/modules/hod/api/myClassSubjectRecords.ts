import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodSubjectRecordsHandledClass {
  class_id: number;
  subject_id: number;
  section: string;
  semester: number | null;
  subject_name: string;
  subject_code: string;
}

export interface HodSubjectRecordsColumn {
  mapping_id: number;
  label: string;
  max_marks: number | null;
  average: number | null;
}

export interface HodSubjectRecordsCell {
  mapping_id: number;
  marks_obtained: number | null;
  is_absent: boolean;
}

export interface HodSubjectRecordsStudentRow {
  student_id: number;
  student_id_no: string;
  name: string;
  email: string | null;
  cells: HodSubjectRecordsCell[];
  grade: string | null;
}

export interface HodSubjectRecordsOverview {
  handled_classes: HodSubjectRecordsHandledClass[];
  selected_class: HodSubjectRecordsHandledClass | null;
  semesters: number[];
  selected_semester: number | null;
  columns: HodSubjectRecordsColumn[];
  students: HodSubjectRecordsStudentRow[];
  student_count: number;
}

/** GET /hod/my-class/subject-records?class_id=&subject_id=&semester= */
export function useHodSubjectRecords(classId?: number, subjectId?: number, semester?: number) {
  return useQuery({
    queryKey: ["hod", "my-class", "subject-records", classId, subjectId, semester],
    queryFn: () =>
      apiClient.get<HodSubjectRecordsOverview>("/hod/my-class/subject-records", {
        class_id: classId,
        subject_id: subjectId,
        semester,
      }),
  });
}
