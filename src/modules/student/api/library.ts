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

/** POST /library/borrow-records — self-checkout; borrower_type/student_id are always resolved server-side for a student caller. */
export function useBorrowBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, dueDate }: { bookId: number; dueDate: string }) =>
      apiClient.post("/library/borrow-records", { book_id: bookId, borrower_type: "student", due_date: dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "library", "borrow-records"] });
      queryClient.invalidateQueries({ queryKey: ["library", "books"] });
    },
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
