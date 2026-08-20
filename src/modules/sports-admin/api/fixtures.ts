import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Ref, SportsTeamStatus } from "./types";

export interface Fixture {
  id: number;
  title: string;
  discipline: Ref | null;
  team: Ref | null;
  opponent: string | null;
  facility: Ref | null;
  is_home: boolean;
  fixture_date: string;
  fixture_time: string | null;
  status: SportsTeamStatus;
  result: string | null;
}

export interface CreateFixtureInput {
  title: string;
  discipline_id?: number;
  team_id?: number;
  opponent?: string;
  facility_id?: number;
  is_home?: boolean;
  fixture_date: string;
  fixture_time?: string;
  result?: string;
}

export function useFixtures(params?: { status?: SportsTeamStatus; discipline_id?: number; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["sports-admin", "fixtures", params],
    queryFn: () => apiClient.get<Fixture[]>("/sports-admin/fixtures", params),
  });
}

export function useCreateFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFixtureInput) => apiClient.post<Fixture>("/sports-admin/fixtures", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "fixtures"] }),
  });
}

export function useUpdateFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateFixtureInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/fixtures/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "fixtures"] }),
  });
}

export function useDeleteFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/fixtures/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "fixtures"] }),
  });
}

export function useConfirmFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/sports-admin/fixtures/${id}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "fixtures"] }),
  });
}
