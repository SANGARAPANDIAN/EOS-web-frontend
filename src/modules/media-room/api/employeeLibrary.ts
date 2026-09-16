import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MediaRoomLibraryRecord {
  id: number;
  book: { id: number; title: string; qr_code: string; author: string | null };
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: "borrowed" | "returned" | "lost" | "damaged";
  renewal_count: number;
  is_overdue: boolean;
  fine_amount: number;
}

export interface MediaRoomLibraryOverview {
  ready: boolean;
  card_no: string | null;
  max_renewals: number;
  borrowed: MediaRoomLibraryRecord[];
  history: MediaRoomLibraryRecord[];
}

/** GET /media-room/employee/library */
export function useMediaRoomLibraryOverview() {
  return useQuery({
    queryKey: ["media-room", "employee", "library"],
    queryFn: () => apiClient.get<MediaRoomLibraryOverview>("/media-room/employee/library"),
  });
}

/** PATCH /media-room/employee/library/:id/renew */
export function useRenewMediaRoomLibraryBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<MediaRoomLibraryRecord>(`/media-room/employee/library/${id}/renew`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "library"] }),
  });
}

/** POST /media-room/employee/library/request — self-issues the book to the caller. */
export function useRequestMediaRoomLibraryBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) => apiClient.post<MediaRoomLibraryRecord>("/media-room/employee/library/request", { book_id: bookId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "library"] }),
  });
}

// The catalogue endpoints below have no @Roles guard on their GET routes —
// any authenticated user may read them — so these hit the real, shared
// library catalogue directly rather than through a new wrapper (same as HOD).

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

/** GET /library/books?q= — real, role-agnostic. With no query, returns a default browsable page. */
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
  pages: number | null;
}

/** GET /library/e-resources?publish_state=published — real, role-agnostic. */
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
