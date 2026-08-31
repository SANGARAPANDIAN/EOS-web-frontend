import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const MAX_PAGE_SIZE = 100; // backend SearchHostelFeesDto caps page_size at 100

/**
 * GET /hostel/fees?status=&page=&page_size= — hostel_id scoping is enforced
 * server-side. A hostel commonly has 700+ residents, well past the
 * backend's page_size cap, so this fetches every page and merges them —
 * "Fees & dues" has no pagination UI of its own, it means "show me
 * everyone," and silently truncating at page 1 would just reproduce the
 * "looks empty/incomplete" bug in a subtler form.
 */
export function useHostelFees(params: { status?: HostelFeeStatus } = {}) {
  return useQuery({
    queryKey: ["hostel", "fees", "all", params],
    queryFn: async () => {
      const first = await apiClient.get<HostelFeesPage>("/hostel/fees", { ...params, page: 1, page_size: MAX_PAGE_SIZE });
      const rows = [...first.data];
      const totalPages = Math.ceil(first.total / MAX_PAGE_SIZE);
      for (let page = 2; page <= totalPages; page++) {
        const next = await apiClient.get<HostelFeesPage>("/hostel/fees", { ...params, page, page_size: MAX_PAGE_SIZE });
        rows.push(...next.data);
      }
      return { page: 1, page_size: rows.length, total: first.total, data: rows } satisfies HostelFeesPage;
    },
  });
}

export interface ReconcileHostelFeesResult {
  fee_structure_id: number;
  fee_structure_items_created: number;
  residents_linked: number;
  demands_created: number;
  residents_skipped_no_matching_room_type: number;
}

/**
 * POST /hostel/fees/reconcile — links residents to the hostel fee structure
 * and generates their fee demand where missing. Idempotent: safe to run
 * again after new residents are allocated to rooms.
 */
export function useReconcileHostelFees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ReconcileHostelFeesResult>("/hostel/fees/reconcile", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "fees"] }),
  });
}
