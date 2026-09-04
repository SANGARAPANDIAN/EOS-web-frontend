import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface LibraryBook {
  id: number;
  qr_code: string | null;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  edition: string | null;
  category_id: number | null;
  category_name: string;
  department: { id: number; name: string; code: string } | null;
  rack: { id: number; rack_code: string; subject_range: string | null } | null;
  total_copies: number;
  available_copies: number;
  price_per_copy: number | null;
  vendor_fund: boolean;
}

export function useLibraryBooks(q: string, availableOnly: boolean) {
  return useQuery({
    queryKey: ["library", "books", q, availableOnly],
    queryFn: () =>
      apiClient.get<{ data: LibraryBook[]; page: number; page_size: number; total: number }>("/library/books", {
        q: q || undefined,
        available_only: availableOnly || undefined,
      }),
  });
}

export type BorrowRecordStatus = "borrowed" | "returned" | "overdue" | "lost" | "damaged";

export interface MyBorrowRecord {
  id: number;
  book_id: number;
  title: string;
  author: string | null;
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: BorrowRecordStatus;
  renewal_count: number;
  last_renewed_at: string | null;
}

export function useMyBorrowRecords(status?: BorrowRecordStatus) {
  return useQuery({
    queryKey: ["me", "library", "borrow-records", status],
    queryFn: () => apiClient.get<MyBorrowRecord[]>("/me/library/borrow-records", { status }),
  });
}

/**
 * POST /library/borrow-records — same endpoint the librarian's Issue page
 * uses, already role-gated to allow 'student' as a self-service caller (see
 * BorrowRecordsService.create): the backend resolves the student from the
 * JWT itself, so only book_id is sent here — no student_id, no due_date
 * (the service defaults that from library_settings.default_borrowing_days
 * when a student omits it). Surfaces the backend's real ConflictException
 * messages (overdue block, duplicate borrow, per-student cap, no copies
 * left) as-is; see error handling in the Library page.
 */
export function useBorrowBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) => apiClient.post("/library/borrow-records", { book_id: bookId, borrower_type: "student" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library", "books"] });
      queryClient.invalidateQueries({ queryKey: ["me", "library"] });
    },
  });
}

export interface LibraryDuesSummary {
  total_due: number;
  overdue_count: number;
  unpaid_fine_count: number;
}

/** GET /me/library/dues-summary */
export function useLibraryDuesSummary() {
  return useQuery({
    queryKey: ["me", "library", "dues-summary"],
    queryFn: () => apiClient.get<LibraryDuesSummary>("/me/library/dues-summary"),
  });
}

export interface EResource {
  id: number;
  title: string;
  url: string;
  category_id: number | null;
  category_name: string | null;
  format: string | null;
  license_type: string | null;
  publish_state: string;
}

export function useEResources() {
  return useQuery({
    queryKey: ["library", "e-resources"],
    queryFn: () =>
      apiClient.get<{ data: EResource[]; page: number; page_size: number; total: number }>("/library/e-resources", {
        publish_state: "published",
      }),
  });
}
