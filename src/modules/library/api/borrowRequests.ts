import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";
import { useInvalidateLibrary } from "@/modules/library/api/borrowRecords";
import type { BorrowRecord } from "@/modules/library/api/borrowRecords";

export type BorrowRequestStatus = "pending" | "approved" | "rejected";
export type BorrowRequestBorrowerType = "student" | "faculty" | "staff";

export interface BorrowRequest {
  id: number;
  status: BorrowRequestStatus;
  borrower_type: BorrowRequestBorrowerType;
  requested_at: string;
  reviewed_at: string | null;
  book: { id: number; title: string; qr_code: string | null } | null;
  student: { id: number; student_id_no: string; name: string } | null;
  faculty: { id: number; name: string } | null;
}

const BASE = "/library/borrow-requests";

/** GET /library/borrow-requests — every request, pending ones first (staff queue). */
export function useBorrowRequests() {
  return useQuery({
    queryKey: [...libraryKeys.all, "borrow-requests"],
    queryFn: () => apiClient.get<BorrowRequest[]>(BASE),
  });
}

/**
 * PATCH /library/borrow-requests/:id/accept — creates the real borrow
 * record via the exact same logic the Issue desk uses (overdue block,
 * duplicate borrow, per-student cap, race-safe copy decrement all still
 * apply), so this can genuinely fail (e.g. no copies left by the time it's
 * reviewed) — errors surface as-is rather than silently marking approved.
 */
export function useAcceptBorrowRequest() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<BorrowRecord>(`${BASE}/${id}/accept`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: [...libraryKeys.all, "borrow-requests"] });
    },
  });
}

export function useRejectBorrowRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      apiClient.patch<{ id: number; status: "rejected" }>(`${BASE}/${id}/reject`, { remarks }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...libraryKeys.all, "borrow-requests"] }),
  });
}
