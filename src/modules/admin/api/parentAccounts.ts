import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ParentRelationship = "father" | "mother" | "guardian";

export interface StudentParentAccount {
  id: number;
  email: string;
  phone: string | null;
  status: "active" | "inactive";
  relationship: ParentRelationship;
}

/** GET /students/:id/parents */
export function useStudentParents(studentId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "parents", studentId],
    queryFn: () => apiClient.get<StudentParentAccount[]>(`/students/${studentId}/parents`),
    enabled,
  });
}

export interface CreateParentAccountInput {
  email: string;
  phone?: string;
  relationship: ParentRelationship;
}

export interface CreateParentAccountResult {
  id: number;
  email: string;
  phone: string | null;
  relationship: ParentRelationship;
  status: "active";
  temporary_password: string;
}

/** POST /students/:id/parents — creates a new parent login and links it to this student. */
export function useCreateParentAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: number; input: CreateParentAccountInput }) =>
      apiClient.post<CreateParentAccountResult>(`/students/${studentId}/parents`, input),
    onSuccess: (_data, { studentId }) => queryClient.invalidateQueries({ queryKey: ["students", "parents", studentId] }),
  });
}

/** POST /students/:id/parents/link — links an already-existing parent account (e.g. a sibling's parent). */
export function useLinkParentAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, parent_user_id, relationship }: { studentId: number; parent_user_id: number; relationship: ParentRelationship }) =>
      apiClient.post(`/students/${studentId}/parents/link`, { parent_user_id, relationship }),
    onSuccess: (_data, { studentId }) => queryClient.invalidateQueries({ queryKey: ["students", "parents", studentId] }),
  });
}

/** DELETE /students/:id/parents/:parentUserId */
export function useUnlinkParentAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, parentUserId }: { studentId: number; parentUserId: number }) =>
      apiClient.delete(`/students/${studentId}/parents/${parentUserId}`),
    onSuccess: (_data, { studentId }) => queryClient.invalidateQueries({ queryKey: ["students", "parents", studentId] }),
  });
}

export interface ParentSearchChild {
  student_id: number;
  roll_no: string | null;
  student_id_no: string;
  name: string | null;
  relationship: ParentRelationship;
}

export interface ParentSearchResult {
  id: number;
  email: string;
  phone: string | null;
  children: ParentSearchChild[];
}

/** GET /parents/search?q= — powers the "Link existing parent" picker. */
export function useSearchParents(q: string) {
  return useQuery({
    queryKey: ["parents", "search", q],
    queryFn: () => apiClient.get<ParentSearchResult[]>("/parents/search", { q: q || undefined }),
  });
}
