import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";
import type { Paginated } from "@/modules/library/api/books";

export type BorrowerType = "student" | "faculty";
/** Persisted statuses — "overdue" below is query-side derived and never actually stored. */
export type BorrowStatus = "borrowed" | "returned" | "lost" | "damaged";
export type BorrowStatusFilter = BorrowStatus | "overdue";

export interface BorrowRecordBookRef {
  id: number;
  title: string;
  qr_code: string;
}

export interface BorrowRecordStudentRef {
  id: number;
  student_id_no: string;
  name: string;
}

export interface BorrowRecordFacultyRef {
  id: number;
  name: string;
}

export interface BorrowRecord {
  id: number;
  book: BorrowRecordBookRef;
  borrower_type: BorrowerType;
  student: BorrowRecordStudentRef | null;
  faculty: BorrowRecordFacultyRef | null;
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: BorrowStatus;
  renewal_count: number;
  last_renewed_at: string | null;
  is_overdue: boolean;
  days_overdue: number;
  returned_late: boolean;
  days_late: number;
  fine_amount: number;
  fine_paid: boolean;
  fine_paid_amount: number | null;
  fine_paid_at: string | null;
  is_lost: boolean;
  is_damaged: boolean;
  damage_lost_charge_amount: number | null;
  damage_lost_declared_at: string | null;
  damage_lost_settled: boolean;
  damage_lost_settled_at: string | null;
}

export interface BorrowRecordListParams {
  [key: string]: string | number | boolean | undefined;
  borrower_type?: BorrowerType;
  student_id?: number;
  faculty_id?: number;
  book_id?: number;
  status?: BorrowStatusFilter;
  overdue?: boolean;
  fine_paid?: boolean;
  damage_lost_settled?: boolean;
  page?: number;
  page_size?: number;
}

export interface CreateBorrowRecordInput {
  book_id: number;
  borrower_type: BorrowerType;
  student_id?: number;
  faculty_id?: number;
  due_date: string;
}

export type BorrowRecordAction = "return" | "renew" | "damaged" | "lost";

export interface UpdateBorrowRecordInput {
  action: BorrowRecordAction;
  return_date?: string;
  new_due_date?: string;
}

const BASE = "/library/borrow-records";

export function useBorrowRecords(params: BorrowRecordListParams) {
  return useQuery({
    queryKey: libraryKeys.borrowRecords.list(params),
    queryFn: () => apiClient.get<Paginated<BorrowRecord>>(BASE, params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Circulation actions ripple through copy counts, the dashboard, and member
 * status simultaneously — every mutation below invalidates the whole
 * library module rather than picking individual keys, on purpose.
 */
export function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: libraryKeys.all });
}

export function useCreateBorrowRecord() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: CreateBorrowRecordInput) => apiClient.post<BorrowRecord>(BASE, input),
    onSuccess: invalidate,
  });
}

export function useUpdateBorrowRecord() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBorrowRecordInput }) =>
      apiClient.patch<BorrowRecord>(`${BASE}/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useCollectFine() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<BorrowRecord>(`${BASE}/${id}/collect-fine`),
    onSuccess: invalidate,
  });
}

export function useSettleCharge() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<BorrowRecord>(`${BASE}/${id}/settle-charge`),
    onSuccess: invalidate,
  });
}

export function useDeleteBorrowRecord() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/${id}`),
    onSuccess: invalidate,
  });
}

export function useSendOverdueReminders() {
  return useMutation({
    mutationFn: () => apiClient.post<{ message: string; sent: number; checked: number }>(`${BASE}/send-overdue-reminders`),
  });
}

export function useCreateReplacementIndent() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ message: string; purchase_indent_id: number }>(`${BASE}/${id}/create-replacement-indent`),
    onSuccess: invalidate,
  });
}
