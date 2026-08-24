import { useQuery } from "@tanstack/react-query";
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

/*
 * No renew / request hooks: the Library tab is read-only for staff. Loans are
 * issued, renewed and returned at the library counter, which owns the fine and
 * borrowing-limit checks that go with those operations.
 *
 * The catalogue reads below hit the shared /library/* routes directly — their
 * GETs carry no role guard, so any authenticated user may browse them and no
 * media-room-specific wrapper is needed.
 */

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

/** GET /library/books?q= — with no query, returns a browsable catalogue page. */
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
