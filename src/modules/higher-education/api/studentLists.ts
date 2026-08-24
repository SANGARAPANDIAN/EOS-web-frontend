import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/**
 * The student lists behind an application window and behind a test.
 *
 * Both share one picker (`useHdcStudentSearch`) so "add a student" behaves the
 * same in either place. Name, roll no and department always come from the
 * student record server-side rather than being typed in here.
 */

export interface HdcStudentMatch {
  student_id: number;
  name: string;
  roll_no: string | null;
  register_no: string | null;
  student_id_no: string | null;
  department_name: string | null;
  department_code: string | null;
  batch_name: string | null;
}

/** GET /me/higher-education-student-search?q= — case-insensitive, 2+ chars. */
export function useHdcStudentSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ["me", "higher-education-student-search", q],
    queryFn: () => apiClient.get<HdcStudentMatch[]>("/me/higher-education-student-search", { q }),
    enabled: q.length >= 2,
    placeholderData: (prev) => prev,
  });
}

// ─────────────────────── application window students ───────────────────────

export type ApplicationStudentStatus = "applied" | "selected" | "rejected" | "withdrawn";

export interface ApplicationStudentRow extends HdcStudentMatch {
  id: number;
  status: ApplicationStudentStatus;
  applied_on: string | null;
  decided_on: string | null;
  remarks: string | null;
}

export interface ApplicationStudentsResponse {
  window_id: number;
  total: number;
  applied: number;
  selected: number;
  rejected: number;
  withdrawn: number;
  students: ApplicationStudentRow[];
}

/** GET /me/higher-education-application-windows/:id/students */
export function useApplicationStudents(windowId: number | null) {
  return useQuery({
    queryKey: ["me", "higher-education-application-windows", windowId, "students"],
    queryFn: () => apiClient.get<ApplicationStudentsResponse>(`/me/higher-education-application-windows/${windowId}/students`),
    enabled: windowId != null,
  });
}

/** POST /me/higher-education-application-windows/:id/students */
export function useAddApplicationStudent(windowId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_id?: number; register_no?: string; status?: ApplicationStudentStatus; applied_on?: string; remarks?: string }) =>
      apiClient.post<{ id: number }>(`/me/higher-education-application-windows/${windowId}/students`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-application-windows", windowId, "students"] });
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-applications"] });
    },
  });
}

/** PATCH /me/higher-education-application-students/:id — Applied <-> Selected etc. */
export function useUpdateApplicationStudent(windowId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; status?: ApplicationStudentStatus; applied_on?: string; decided_on?: string; remarks?: string }) =>
      apiClient.patch(`/me/higher-education-application-students/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-application-windows", windowId, "students"] }),
  });
}

/** DELETE /me/higher-education-application-students/:id */
export function useRemoveApplicationStudent(windowId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/higher-education-application-students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-application-windows", windowId, "students"] });
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-applications"] });
    },
  });
}

// ───────────────────────────── test students ─────────────────────────────

export interface TestStudentRow extends HdcStudentMatch {
  id: number;
  enrolled_on: string | null;
  attempted_on: string | null;
  cleared_on: string | null;
  score: string | null;
  remarks: string | null;
  /** Derived server-side from the three dates — never stored. */
  enrolled: boolean;
  attempted: boolean;
  cleared: boolean;
}

export interface TestStudentsResponse {
  test_name: string;
  total: number;
  enrolled: number;
  attempted: number;
  cleared: number;
  students: TestStudentRow[];
}

/** GET /me/higher-education-test-register/:testName/students */
export function useTestStudents(testName: string | null) {
  return useQuery({
    queryKey: ["me", "higher-education-test-register", testName, "students"],
    queryFn: () => apiClient.get<TestStudentsResponse>(`/me/higher-education-test-register/${encodeURIComponent(testName ?? "")}/students`),
    enabled: !!testName,
  });
}

/** POST /me/higher-education-test-register/:testName/students */
export function useAddTestStudent(testName: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_id?: number; register_no?: string; enrolled_on?: string }) =>
      apiClient.post<{ id: number }>(`/me/higher-education-test-register/${encodeURIComponent(testName ?? "")}/students`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-test-register", testName, "students"] });
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-test-readiness"] });
    },
  });
}

/**
 * PATCH /me/higher-education-test-students/:id
 *
 * Advances Enrolled -> Attempted -> Cleared. The server refuses a cleared date
 * with no attempt, and any out-of-order pair, so its message is worth showing.
 */
export function useUpdateTestStudent(testName: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; enrolled_on?: string; attempted_on?: string; cleared_on?: string; score?: string; remarks?: string }) =>
      apiClient.patch(`/me/higher-education-test-students/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-test-register", testName, "students"] }),
  });
}

/** DELETE /me/higher-education-test-students/:id */
export function useRemoveTestStudent(testName: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/higher-education-test-students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-test-register", testName, "students"] });
      queryClient.invalidateQueries({ queryKey: ["me", "higher-education-test-readiness"] });
    },
  });
}
