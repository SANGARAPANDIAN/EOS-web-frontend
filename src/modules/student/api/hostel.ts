import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MyHostelRoom {
  is_hostel_resident: boolean;
  student_name: string;
  register_no: string | null;
  hostel_name: string | null;
  room_number: string | null;
  room_type_name: string | null;
  mess_type: string | null;
}

/** GET /me/hostel-room */
export function useMyHostelRoom() {
  return useQuery({
    queryKey: ["me", "hostel-room"],
    queryFn: () => apiClient.get<MyHostelRoom>("/me/hostel-room"),
  });
}

export type OutingStatus = "pending" | "approved" | "rejected";

export interface HostelOuting {
  id: number;
  from_date: string;
  to_date: string;
  start_time: string;
  return_time: string | null;
  reason: string | null;
  status: OutingStatus;
  approved_by_warden: string | null;
  room_number: string | null;
  created_at: string;
}

/** GET /me/hostel-outings */
export function useMyHostelOutings() {
  return useQuery({
    queryKey: ["me", "hostel-outings"],
    queryFn: () => apiClient.get<{ data: HostelOuting[]; page: number; page_size: number; total: number }>("/me/hostel-outings"),
  });
}

export interface CreateHostelOutingInput {
  from_date: string;
  to_date: string;
  start_time: string;
  return_time?: string;
  reason?: string;
}

/** POST /me/hostel-outings — 422 NOT_A_HOSTELLER if the caller has no room assignment. */
export function useCreateHostelOuting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHostelOutingInput) => apiClient.post("/me/hostel-outings", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "hostel-outings"] }),
  });
}

export type HostelComplaintCategory = "plumbing" | "electrical" | "carpentry" | "network" | "mess" | "facilities" | "other";

/** POST /me/hostel-complaints — write-only; there is no GET endpoint for a student's own complaint history yet. */
export function useCreateHostelComplaint() {
  return useMutation({
    mutationFn: (input: { category: HostelComplaintCategory; title: string; description?: string }) =>
      apiClient.post("/me/hostel-complaints", input),
  });
}

/** POST /me/mess-feedback — write-only; there is no GET endpoint for a student's own feedback history yet. */
export function useCreateMessFeedback() {
  return useMutation({
    mutationFn: (input: { rating: number; comment?: string }) => apiClient.post("/me/mess-feedback", input),
  });
}
