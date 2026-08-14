import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { LeaveStatus } from "@/modules/student/api/leave";

/** Same status set as academic leave (LeaveStatus) - a campus outing goes through the same Advisor -> HoD chain, just on its own table. warden_approved never occurs here. */
export type CampusOutingStatus = LeaveStatus;

export interface CampusOuting {
  id: number;
  from_date: string;
  to_date: string;
  start_time: string;
  return_time: string | null;
  reason: string | null;
  status: CampusOutingStatus;
  approved_by_faculty: string | null;
  approved_by_hod: string | null;
  created_at: string;
}

/**
 * GET /me/campus-outings — the "In / out" tab's campus gate pass, open to
 * every student (day scholar or hosteller), routed to the Advisor
 * (Faculty mentor) then the HoD - unlike /me/hostel-outings, which is
 * hosteller-only and Warden-approved.
 */
export function useMyCampusOutings() {
  return useQuery({
    queryKey: ["me", "campus-outings"],
    queryFn: () =>
      apiClient.get<{ data: CampusOuting[]; page: number; page_size: number; total: number }>("/me/campus-outings"),
  });
}

export interface CreateCampusOutingInput {
  from_date: string;
  to_date: string;
  start_time: string;
  return_time?: string;
  reason?: string;
}

/** POST /me/campus-outings */
export function useCreateCampusOuting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampusOutingInput) => apiClient.post("/me/campus-outings", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "campus-outings"] }),
  });
}
