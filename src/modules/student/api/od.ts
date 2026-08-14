import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface FacultyDirectoryEntry {
  id: number;
  name: string;
  department_name: string;
}

/** GET /me/faculty-directory */
export function useFacultyDirectory() {
  return useQuery({
    queryKey: ["me", "faculty-directory"],
    queryFn: () => apiClient.get<FacultyDirectoryEntry[]>("/me/faculty-directory"),
  });
}

export interface OdTeamMember {
  student_id: number;
  name: string;
  is_creator: boolean;
  joined_at: string;
}

export interface OdTeam {
  id: number;
  unique_code: string;
  is_locked: boolean;
  team_name: string | null;
  reason: string | null;
  venue: string | null;
  from_date: string | null;
  to_date: string | null;
  from_time: string | null;
  to_time: string | null;
  faculty_guide_id: number | null;
  faculty_guide_name: string | null;
  is_creator: boolean;
  member_count: number;
  members: OdTeamMember[];
  joined_at: string;
  created_at: string;
  has_request: boolean;
  od_request_id: number | null;
}

/** GET /me/od-teams — every team the caller currently belongs to. */
export function useMyOdTeams() {
  return useQuery({
    queryKey: ["me", "od-teams"],
    queryFn: () => apiClient.get<{ data: OdTeam[] }>("/me/od-teams"),
  });
}

function invalidateTeams(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["me", "od-teams"] });
}

export interface CreateOdTeamInput {
  team_name: string;
  reason: string;
  venue: string;
  from_date: string;
  to_date: string;
  from_time: string;
  to_time: string;
  faculty_guide_id: number;
}

/** POST /me/od-teams — creates a team (with its full event brief) and auto-joins the caller as its first member. */
export function useCreateOdTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOdTeamInput) => apiClient.post<OdTeam>("/me/od-teams", input),
    onSuccess: () => invalidateTeams(queryClient),
  });
}

/** POST /me/od-teams/join */
export function useJoinOdTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unique_code: string) => apiClient.post("/me/od-teams/join", { unique_code }),
    onSuccess: () => invalidateTeams(queryClient),
  });
}

/** DELETE /me/od-teams/:id/members/:studentId */
export function useLeaveOdTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, studentId }: { teamId: number; studentId: number }) =>
      apiClient.delete(`/me/od-teams/${teamId}/members/${studentId}`),
    onSuccess: () => invalidateTeams(queryClient),
  });
}

export interface CreateOdRequestInput {
  from_date: string;
  to_date: string;
  reason: string;
  from_time?: string;
  to_time?: string;
  faculty_guide_id?: number;
}

/** POST /me/od-teams/:id/requests — creator-only, locks the team. */
export function useSubmitOdRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, input }: { teamId: number; input: CreateOdRequestInput }) =>
      apiClient.post(`/me/od-teams/${teamId}/requests`, input),
    onSuccess: () => {
      invalidateTeams(queryClient);
      queryClient.invalidateQueries({ queryKey: ["me", "od-requests"] });
    },
  });
}

export type OdOverallStatus = "pending_mentor" | "pending_hod" | "approved" | "rejected";

export interface OdRequestRow {
  id: number;
  team_id: number;
  unique_code: string;
  from_date: string;
  to_date: string;
  from_time: string | null;
  to_time: string | null;
  reason: string;
  faculty_guide_name: string | null;
  mentor_approval_status: string;
  overall_status: OdOverallStatus;
  member_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  created_at: string;
}

/** GET /me/od-requests */
export function useMyOdRequests() {
  return useQuery({
    queryKey: ["me", "od-requests"],
    queryFn: () => apiClient.get<{ data: OdRequestRow[]; page: number; page_size: number; total: number }>("/me/od-requests"),
  });
}
