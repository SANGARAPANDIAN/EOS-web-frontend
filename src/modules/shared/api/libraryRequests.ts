import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type BorrowRequestStatus = "pending" | "approved" | "rejected";
export type BorrowRequestBorrowerType = "student" | "faculty" | "staff";

export interface MyBorrowRequest {
  id: number;
  status: BorrowRequestStatus;
  borrower_type: BorrowRequestBorrowerType;
  requested_at: string;
  reviewed_at: string | null;
  book: { id: number; title: string; qr_code: string | null } | null;
}

/**
 * GET /me/library/borrow-requests — role-generic: the backend resolves the
 * caller's own student or faculty profile from the JWT (BorrowRequestsService
 * .resolveCaller), so this same hook covers Student, Faculty and HoD.
 */
export function useMyBorrowRequests() {
  return useQuery({
    queryKey: ["me", "library", "borrow-requests"],
    queryFn: () => apiClient.get<MyBorrowRequest[]>("/me/library/borrow-requests"),
  });
}

/**
 * POST /me/library/borrow-requests — replaces direct self-checkout for
 * every role that has one. Only ever creates a pending request; the book is
 * actually borrowed once a librarian accepts it from the Library "Requests"
 * queue (which reuses the exact same borrow-creation logic the desk-issue
 * flow uses, including the overdue block, duplicate-borrow guard and
 * per-student/faculty cap).
 */
export function useCreateBorrowRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) => apiClient.post<MyBorrowRequest>("/me/library/borrow-requests", { book_id: bookId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "library", "borrow-requests"] });
    },
  });
}
