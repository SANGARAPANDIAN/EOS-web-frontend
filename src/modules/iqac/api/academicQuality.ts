import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AttendanceTrendPoint {
  month: string;
  percentage: number | null;
  marked: number;
}

export interface AttendanceDepartmentRow {
  id: number;
  code: string;
  name: string;
  attendance_percentage: number | null;
  students_count: number;
}

export interface AttendanceRegisterRow {
  class_id: number;
  department_code: string;
  department_name: string;
  section: string;
  batch_label: string;
  semester: number | null;
  class_advisor: string | null;
  this_year: number | null;
  last_year: number | null;
  target: number | null;
  attainment: number | null;
}

export interface AttendanceSummary {
  this_year: number | null;
  last_year: number | null;
  target: number | null;
  attainment: number | null;
  marked_total: number;
  students_below_threshold: number;
  threshold_percentage: number;
  trend: AttendanceTrendPoint[];
  departments: AttendanceDepartmentRow[];
  register: AttendanceRegisterRow[];
}

/** GET /me/iqac/academic-quality/attendance — real attendance_records for the current term. */
export function useAcademicAttendance() {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "attendance"],
    queryFn: () => apiClient.get<AttendanceSummary>("/me/iqac/academic-quality/attendance"),
  });
}

export interface ExamFilters {
  batches: { id: number; label: string }[];
  exam_types: { id: number; name: string; code: string }[];
}

/** GET /me/iqac/academic-quality/exam-filters — delegates to PrincipalExamsService.filters(). */
export function useExamFilters() {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "exam-filters"],
    queryFn: () => apiClient.get<ExamFilters>("/me/iqac/academic-quality/exam-filters"),
  });
}

export function useExamSemesters(batchId: number | null) {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "exam-semesters", batchId],
    queryFn: () => apiClient.get<number[]>("/me/iqac/academic-quality/exam-semesters", { batch_id: batchId! }),
    enabled: batchId != null,
  });
}

export interface ExamInstance {
  id: number;
  title: string;
  academic_year: string;
  semester: number;
  status: string;
  exam_types: { name: string; code: string };
}

export function useExamsForBatchSemester(batchId: number | null, semester: number | null) {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "exams", batchId, semester],
    queryFn: () => apiClient.get<ExamInstance[]>("/me/iqac/academic-quality/exams", { batch_id: batchId!, semester: semester! }),
    enabled: batchId != null && semester != null,
  });
}

export interface SubjectResultRow {
  subject_code: string;
  name: string;
  department_id: number | null;
  appeared: number;
  passed: number;
  failed: number;
  pass_percentage: number | null;
}

export interface ResultsDepartmentRow {
  id: number;
  code: string | null;
  name: string | null;
  appeared: number;
  passed: number;
  pass_percentage: number | null;
}

export interface ExamResultsSummary {
  exam: { title: string | null; academic_year: string; semester: number; type: string | null } | null;
  overall_pass_percentage: number | null;
  target: number | null;
  attainment: number | null;
  candidate_appearances: number;
  subject_count: number;
  subjects: SubjectResultRow[];
  departments: ResultsDepartmentRow[];
  /** Real, from every candidate's own class section — unfiltered, always lists every section that sat this exam. */
  sections: string[];
}

/** GET /me/iqac/academic-quality/results?batch_id=&section= — subject-wise pass rate for the latest real exam for a batch (or overall), optionally scoped to one real class section. */
export function useAcademicResults(batchId: number | null, section?: string) {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "results", batchId, section],
    queryFn: () => apiClient.get<ExamResultsSummary>("/me/iqac/academic-quality/results", { batch_id: batchId ?? undefined, section: section || undefined }),
  });
}

export interface GradeBandRow {
  grade_label: string;
  is_pass: boolean;
  count: number;
  share_percentage: number;
}

export interface GradeDistributionDepartmentRow {
  id: number;
  code: string;
  name: string;
  mean_grade_point: number | null;
}

export interface GradeDistributionRegisterRow {
  class_id: number;
  department_code: string;
  department_name: string;
  section: string;
  batch_label: string;
  semester: number | null;
  class_advisor: string | null;
  mean_grade_point: number | null;
  target: number | null;
  attainment: number | null;
}

export interface GradeDistribution {
  exam: { title: string | null; academic_year: string; semester: number } | null;
  graded_attempts: number;
  mean_grade_point: number | null;
  target: number | null;
  attainment: number | null;
  distribution: GradeBandRow[];
  departments: GradeDistributionDepartmentRow[];
  register: GradeDistributionRegisterRow[];
}

/** GET /me/iqac/academic-quality/grade-distribution?batch_id= — real grade-band spread for the latest exam for a batch, or overall (see backend doc comment for why this replaces "CGPA"). */
export function useGradeDistribution(batchId: number | null) {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "grade-distribution", batchId],
    queryFn: () => apiClient.get<GradeDistribution>("/me/iqac/academic-quality/grade-distribution", { batch_id: batchId ?? undefined }),
  });
}

export interface OutcomeRow {
  id: number;
  code: string;
  description: string;
  subject_code?: string;
  subject_name?: string;
  department: { id: number; code: string; name: string } | null;
  direct: number | null;
  indirect: number | null;
  target: number | null;
  attained: number | null;
}

export interface OutcomeAttainment {
  outcomes: OutcomeRow[];
  tracked_count: number;
  recorded_count: number;
  mean_attained: number | null;
}

/** GET /me/iqac/academic-quality/course-attainment?department_id=&batch_id= — real course_outcomes/outcome_attainments data. */
export function useCourseAttainment(departmentId: number | null, batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "course-attainment", departmentId, batchId],
    queryFn: () =>
      apiClient.get<OutcomeAttainment>("/me/iqac/academic-quality/course-attainment", {
        department_id: departmentId ?? undefined,
        batch_id: batchId ?? undefined,
      }),
  });
}

/** GET /me/iqac/academic-quality/program-attainment?department_id=&batch_id= — real program_outcomes/outcome_attainments data. */
export function useProgramAttainment(departmentId: number | null, batchId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "program-attainment", departmentId, batchId],
    queryFn: () =>
      apiClient.get<OutcomeAttainment>("/me/iqac/academic-quality/program-attainment", {
        department_id: departmentId ?? undefined,
        batch_id: batchId ?? undefined,
      }),
  });
}

export interface ClassOptions {
  batches: { id: number; label: string }[];
  courses: { id: number; name: string; code: string; department_id: number }[];
}

/** GET /me/iqac/academic-quality/class-options — real batch/course list for the "+ Add class row" form. */
export function useClassOptions() {
  return useQuery({
    queryKey: ["iqac", "academic-quality", "class-options"],
    queryFn: () => apiClient.get<ClassOptions>("/me/iqac/academic-quality/class-options"),
    staleTime: 10 * 60_000,
  });
}

export interface CreateClassRowInput {
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester?: number;
}

export interface CreatedClassRow {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number | null;
}

/** POST /me/iqac/academic-quality/class-rows — real classes-table insert, backs Attendance/CGPA's "Add department row" action. */
export function useCreateClassRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassRowInput) => apiClient.post<CreatedClassRow>("/me/iqac/academic-quality/class-rows", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "academic-quality", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["iqac", "academic-quality", "grade-distribution"] });
    },
  });
}

/** POST /me/iqac/academic-quality/class-rows/:id/mentor — real class_mentors upsert (one per class per academic_year). */
export function useAssignClassMentor() {
  return useMutation({
    mutationFn: ({ classId, faculty_id, academic_year }: { classId: number; faculty_id: number; academic_year: string }) =>
      apiClient.post(`/me/iqac/academic-quality/class-rows/${classId}/mentor`, { faculty_id, academic_year }),
  });
}

/** PATCH /me/iqac/academic-quality/class-rows/:id — real classes-table update. */
export function useUpdateClassRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, section }: { classId: number; section: string }) =>
      apiClient.patch<CreatedClassRow>(`/me/iqac/academic-quality/class-rows/${classId}`, { section }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "academic-quality", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["iqac", "academic-quality", "grade-distribution"] });
    },
  });
}

/** DELETE /me/iqac/academic-quality/class-rows/:id — blocked server-side (409 CLASS_IN_USE) while any student is enrolled in the class. */
export function useDeleteClassRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classId: number) => apiClient.delete(`/me/iqac/academic-quality/class-rows/${classId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "academic-quality", "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["iqac", "academic-quality", "grade-distribution"] });
    },
  });
}

/** "2025-26" style — same June-cutoff convention used elsewhere in this app. */
export function currentAcademicYearShort(): string {
  const now = new Date();
  const calendarYear = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = month >= 6 ? calendarYear : calendarYear - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}
