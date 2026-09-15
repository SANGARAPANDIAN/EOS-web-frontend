import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/**
 * A camp's roster — who is actually registered.
 *
 * `medical_camps` only ever held a `registered_count` integer, incremented by a
 * "register a batch" button that recorded nobody. These endpoints back that
 * figure with named people, and the count is recomputed from the roster on
 * every change, so what the card shows can always be traced to a list.
 */

export type CampPersonKind = "student" | "faculty";

export interface CampRegistration {
  id: number;
  camp_id: number;
  kind: CampPersonKind;
  student_id: number | null;
  faculty_id: number | null;
  name: string;
  /** Roll number for a student, staff code for a faculty member. */
  identifier: string | null;
  department: string | null;
  designation: string | null;
  remarks: string | null;
  registered_at: string;
}

export function useCampRegistrations(campId: number | null) {
  return useQuery({
    queryKey: ["me", "medical-centre-camps", campId, "registrations"],
    queryFn: () => apiClient.get<CampRegistration[]>(`/me/medical-centre-camps/${campId}/registrations`),
    enabled: campId !== null,
  });
}

/**
 * One search across students and staff, reusing the OPD counter search rather
 * than duplicating it: same role, same tables, and it already matches name,
 * roll number, register number, student id and staff code case-insensitively.
 */
export interface PersonSearchResult {
  kind: CampPersonKind;
  student_id: number | null;
  faculty_id: number | null;
  name: string;
  identifier: string | null;
  department: string | null;
}

export function usePeopleSearch(term: string, kind: "all" | CampPersonKind = "all") {
  const q = term.trim();
  return useQuery({
    queryKey: ["me", "medical-centre-people-search", q, kind],
    queryFn: () =>
      apiClient.get<PersonSearchResult[]>("/me/medical-centre-opd-queue/search", { q, kind }),
    // The endpoint requires at least 2 characters, so do not fire below that.
    enabled: q.length >= 2,
  });
}

export interface CampRegistrationInput {
  student_id?: number;
  faculty_id?: number;
  remarks?: string;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, campId: number) {
  queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-camps", campId, "registrations"] });
  // The card's registered figure is derived from the roster, so the camp list
  // has to be refetched too.
  queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-camps"] });
}

/** POST /me/medical-centre-camps/:id/registrations/bulk — what Save sends. */
export function useSaveCampRegistrations(campId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (people: CampRegistrationInput[]) =>
      apiClient.post<{ added: number; skipped: number; registered_count: number }>(
        `/me/medical-centre-camps/${campId}/registrations/bulk`,
        { people },
      ),
    onSuccess: () => invalidate(queryClient, campId),
  });
}

/** PATCH — remarks only; which person a row refers to is not editable. */
export function useUpdateCampRegistration(campId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ registrationId, remarks }: { registrationId: number; remarks: string }) =>
      apiClient.patch(`/me/medical-centre-camps/${campId}/registrations/${registrationId}`, { remarks }),
    onSuccess: () => invalidate(queryClient, campId),
  });
}

export function useRemoveCampRegistration(campId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (registrationId: number) =>
      apiClient.delete(`/me/medical-centre-camps/${campId}/registrations/${registrationId}`),
    onSuccess: () => invalidate(queryClient, campId),
  });
}
