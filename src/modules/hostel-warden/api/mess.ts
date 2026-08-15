import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MessFeedbackEntry {
  id: number;
  student_id: number;
  hostel_id: number | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface MessFeedbackPage {
  page: number;
  page_size: number;
  total: number;
  average_rating: number | null;
  data: MessFeedbackEntry[];
}

/** GET /hostel/mess-feedback — hostel_id scoping is enforced server-side. */
export function useMessFeedback(params: { page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "mess-feedback", params],
    queryFn: () => apiClient.get<MessFeedbackPage>("/hostel/mess-feedback", params),
  });
}
