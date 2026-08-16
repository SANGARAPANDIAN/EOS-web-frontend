import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type FeeStatus = "not_applicable" | "unpaid" | "partially_paid" | "paid";
export type ResidentStatus = "on_leave" | "in_hostel";

export interface Resident {
  id: number;
  student_id_no: string;
  roll_no: string | null;
  name: string;
  course: string;
  batch: string;
  hostel: { id: number; name: string; code: string } | null;
  room: { id: number; room_number: string } | null;
  sharing: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  fee_status: FeeStatus;
  allocated_date: string | null;
  current_status: ResidentStatus;
}

export interface ResidentsPage {
  page: number;
  page_size: number;
  total: number;
  data: Resident[];
}

/** GET /hostel/residents?q=&page=&page_size= — hostel_id scoping is enforced server-side. */
export function useResidents(params: { q?: string; page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "residents", params],
    queryFn: () => apiClient.get<ResidentsPage>("/hostel/residents", params),
  });
}

export interface ResidentDetail extends Resident {
  movements: { id: number; direction: "in" | "out"; at: string }[];
  outings: { id: number; reason: string | null; from_date: string; to_date: string; status: "pending" | "approved" | "rejected" }[];
  complaints: { id: number; title: string; category: string; status: string; created_at: string }[];
}

/** GET /hostel/residents/:id — full profile for the shared student-detail modal. */
export function useStudentDetail(id: number | null) {
  return useQuery({
    queryKey: ["hostel", "residents", id],
    queryFn: () => apiClient.get<ResidentDetail>(`/hostel/residents/${id}`),
    enabled: id != null,
  });
}
