import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodLibraryRecord {
  id: number;
  book: { id: number; title: string; qr_code: string; author: string | null };
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: "borrowed" | "returned" | "lost" | "damaged";
  renewal_count: number;
  last_renewed_at: string | null;
  is_overdue: boolean;
  days_overdue: number;
  returned_late: boolean;
  days_late: number;
  fine_amount: number;
}

export interface HodLibraryOverview {
  card_no: string;
  books_per_student: number;
  max_renewals: number;
  borrowed: HodLibraryRecord[];
  history: HodLibraryRecord[];
}

/** GET /hod/employee/library */
export function useHodLibraryOverview() {
  return useQuery({
    queryKey: ["hod", "employee", "library"],
    queryFn: () => apiClient.get<HodLibraryOverview>("/hod/employee/library"),
  });
}

/** PATCH /hod/employee/library/:id/renew */
export function useRenewHodLibraryBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<HodLibraryRecord>(`/hod/employee/library/${id}/renew`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "employee", "library"] }),
  });
}

/** POST /hod/employee/library/request — self-issues the book to the caller, same mechanism students use to borrow. */
export function useRequestHodLibraryBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) => apiClient.post<HodLibraryRecord>("/hod/employee/library/request", { book_id: bookId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "employee", "library"] }),
  });
}

// The catalogue endpoints below (/library/books, /library/e-resources) have
// no @Roles guard on their GET routes — any authenticated user may read
// them — so these hit the shared, role-agnostic library catalogue directly
// rather than through a new /hod/* wrapper.

export interface LibraryBookResult {
  id: number;
  qr_code: string;
  title: string;
  author: string | null;
  category_name: string;
  total_copies: number;
  available_copies: number;
}

interface LibraryPage<T> {
  page: number;
  page_size: number;
  total: number;
  data: T[];
}

/** GET /library/books?q= — with no query, returns a default browsable catalogue page rather than nothing. */
export function useLibraryBookSearch(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ["library", "books", "search", query],
    queryFn: () => apiClient.get<LibraryPage<LibraryBookResult>>("/library/books", { q: query || undefined, page_size: 20 }),
  });
}

export interface LibraryEResource {
  id: number;
  title: string;
  url: string;
  category_name: string | null;
  format: string | null;
  license_type: string | null;
  pages: number | null;
}

/** GET /library/e-resources?publish_state=published */
export function useLibraryEResources() {
  return useQuery({
    queryKey: ["library", "e-resources"],
    queryFn: () =>
      apiClient.get<LibraryPage<LibraryEResource>>("/library/e-resources", {
        publish_state: "published",
        page_size: 50,
      }),
  });
}
