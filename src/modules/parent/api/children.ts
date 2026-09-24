import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MyChild {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  relationship: string;
  section: string | null;
  semester: number | null;
  department: { id: number; name: string; code: string } | null;
}

/** GET /me/children — one row per linked child, however many there are. */
export function useMyChildren() {
  return useQuery({
    queryKey: ["me", "children"],
    queryFn: () => apiClient.get<MyChild[]>("/me/children"),
  });
}
