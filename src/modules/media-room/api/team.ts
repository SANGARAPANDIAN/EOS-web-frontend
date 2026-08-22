import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type TeamMemberStatus = "active" | "inactive";

export interface TeamMember {
  id: number;
  full_name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  skills: string | null;
  photo_url: string | null;
  status: TeamMemberStatus;
  joined_on: string | null;
  created_at: string;
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /me/media-team-members — ready:false until the media_team_members table exists. */
export function useTeamMembers() {
  return useQuery({
    queryKey: ["media-room", "team"],
    queryFn: () => apiClient.get<ReadyResponse<TeamMember>>("/me/media-team-members"),
  });
}

export interface CreateTeamMemberInput {
  full_name: string;
  designation?: string;
  email?: string;
  phone?: string;
  skills?: string;
  photo_url?: string;
  joined_on?: string;
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamMemberInput) => apiClient.post<TeamMember>("/me/media-team-members", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "team"] }),
  });
}

export interface UpdateTeamMemberInput {
  id: number;
  full_name?: string;
  designation?: string;
  email?: string;
  phone?: string;
  skills?: string;
  photo_url?: string;
  status?: TeamMemberStatus;
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTeamMemberInput) => apiClient.patch<TeamMember>(`/me/media-team-members/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "team"] }),
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/media-team-members/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "team"] }),
  });
}
