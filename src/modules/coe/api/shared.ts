// Shared response shapes across the exams API — confirmed by reading
// EOSbackend1's controllers/services directly (src/modules/exams/**,
// src/common/dto/pagination.dto.ts), NOT from docs/api/05-exams.md, which is
// stale and does not match the real DTOs.

/** hall-plans / seating-arrangements / invigilation list endpoints extend PaginationDto and wrap results this way; exam-timetable, exam-subject-mapping, exams, exam-types, revaluation-requests, and results are plain (unpaginated) arrays. */
export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type ExamSessionCode = "FN" | "AN";
