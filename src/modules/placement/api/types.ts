// Cross-cutting types shared by several placement api/*.ts files — kept
// separate from each domain file (companies.ts, drives.ts, ...) to avoid
// circular type-only imports between them.

export interface Paginated<T> {
  page: number;
  page_size: number;
  total: number;
  data: T[];
}

// Mirrors the real backend exactly: student_drive_applications tracks a
// single flat status per student per drive — there's no per-named-round
// breakdown on the backend.
export type ApplicationStatus = "applied" | "r1_cleared" | "r2_cleared" | "r3_cleared" | "rejected" | "placed";

// Persisted on student_drive_applications.offer_response.
export type OfferResponseStatus = "accepted" | "pending" | "declined";
