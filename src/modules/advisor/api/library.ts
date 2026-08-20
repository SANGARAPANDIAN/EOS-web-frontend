import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/library/{borrow-records,books,e-resources}/*.
// GET /library/borrow-records and GET /library/books/e-resources carry NO
// @Roles restriction at all (any authenticated user) — borrow-records'
// service layer branches on `currentUser.role === 'faculty'` and scopes
// results to the caller's own faculty_id automatically.

export interface BorrowRecordRow {
  id: number;
  // book has NO author field on the real response (RECORD_INCLUDE only
  // selects id/title/qr_code) — a previous version of this type invented
  // one, which always rendered blank.
  book: { id: number; title: string; qr_code: string | null };
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: string | null;
  is_overdue: boolean;
  days_overdue: number;
  fine_amount: number | null;
  fine_paid: boolean;
  fine_paid_amount: number | null;
  damage_lost_charge_amount: number | null;
  damage_lost_settled: boolean;
}

/** GET /library/borrow-records — self-scoped to the caller when role is
 * faculty. Real query DTO (SearchBorrowRecordsDto) uses `page_size`, not
 * `limit` — whitelist validation rejects unknown properties, so passing
 * `limit` here 400s. `status` real values: borrowed | returned | overdue |
 * lost | damaged ('overdue' is a derived filter, never actually stored). */
export function useMyBorrowRecords(status?: "borrowed" | "returned" | "overdue" | "lost" | "damaged") {
  return useQuery({
    queryKey: ["library", "borrow-records", "me", status],
    queryFn: () => apiClient.get<{ data: BorrowRecordRow[] }>("/library/borrow-records", { page_size: 100, status }),
  });
}

export interface LibraryDashboardSummary {
  total_books: number;
  total_members: number;
  books_borrowed: number;
  overdue_count: number;
}

/** GET /library/dashboard/summary */
export function useLibraryDashboardSummary() {
  return useQuery({
    queryKey: ["library", "dashboard", "summary"],
    queryFn: () => apiClient.get<LibraryDashboardSummary>("/library/dashboard/summary"),
  });
}

export interface BookRow {
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
  // Real fields are integer copy counts, not a boolean — "available" is
  // derived here as available_copies > 0, not a separate backend flag.
  total_copies: number;
  available_copies: number;
}

/** GET /library/books?q=&available_only= — open to any authenticated role,
 * no @Roles restriction (confirmed via RolesGuard: no decorator = any
 * authenticated user passes). `q` is optional on the real DTO — this now
 * always fires (browse-all catalogue when q is empty) instead of gating on
 * a non-empty query, which is what made the Search tab render nothing on
 * first open even though books exist in the DB. */
export function useSearchBooks(q: string, availableOnly: boolean) {
  return useQuery({
    queryKey: ["library", "books", q, availableOnly],
    queryFn: () => apiClient.get<{ data: BookRow[]; total: number }>("/library/books", { q: q || undefined, available_only: availableOnly || undefined, page_size: 50 }),
  });
}

export interface EResourceRow {
  id: number;
  title: string;
  url: string;
  format: string | null;
  license_type: string | null;
  category_id: number | null;
  publish_state: string;
}

/** GET /library/e-resources — open to any authenticated role. Real model
 * has no concept of a named external vendor/database (no "IEEE Xplore" /
 * "Springer Link" field anywhere in schema.prisma) — only whatever a
 * librarian actually uploaded (title/url/format/license_type). */
export function useEResources() {
  return useQuery({
    queryKey: ["library", "e-resources"],
    queryFn: () => apiClient.get<{ data: EResourceRow[] }>("/library/e-resources", { page_size: 50 }),
  });
}
