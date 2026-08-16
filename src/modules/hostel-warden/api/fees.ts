import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type HostelFeeStatus = "unpaid" | "partially_paid" | "paid";

export interface HostelFeeRow {
  student_id: number;
  name: string;
  student_id_no: string;
  hostel: { id: number; name: string; code: string } | null;
  room_number: string | null;
  sharing: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: HostelFeeStatus;
}

export interface HostelFeesPage {
  page: number;
  page_size: number;
  total: number;
  data: HostelFeeRow[];
}

/** GET /hostel/fees?status=&page=&page_size= — hostel_id scoping is enforced server-side. */
export function useHostelFees(params: { status?: HostelFeeStatus; page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "fees", params],
    queryFn: () => apiClient.get<HostelFeesPage>("/hostel/fees", params),
  });
}
