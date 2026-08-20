import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";

export interface StudentSearchResult {
  id: number;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  status: string;
  email: string;
  name: string;
  course: { id: number; name: string };
  department: { id: number; name: string; code: string };
  similarity: number;
}

export interface NoDuesOverdueBook {
  borrow_record_id: number;
  title: string;
  accession: string;
  due_date: string;
}

export interface NoDuesUnpaidFine {
  borrow_record_id: number;
  title: string;
  accession: string;
}

export interface NoDuesUnsettledCharge {
  borrow_record_id: number;
  title: string;
  accession: string;
  charge_amount: number | null;
}

export interface NoDuesCheck {
  student_id: number;
  has_outstanding_library_dues: boolean;
  overdue_books: NoDuesOverdueBook[];
  unpaid_fine_records: NoDuesUnpaidFine[];
  unsettled_lost_damaged_charges: NoDuesUnsettledCharge[];
}

const BASE = "/library/students";

/** Typeahead — backend requires q.length >= 2, gated client-side to match. */
export function useStudentSearch(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: libraryKeys.students.search(trimmed),
    queryFn: () => apiClient.get<StudentSearchResult[]>(`${BASE}/search`, { q: trimmed }),
    enabled: trimmed.length >= 2,
  });
}

export function useStudentNoDues(studentId: number | undefined) {
  return useQuery({
    queryKey: libraryKeys.students.noDues(studentId ?? -1),
    queryFn: () => apiClient.get<NoDuesCheck>(`${BASE}/${studentId}/no-dues-check`),
    enabled: studentId !== undefined,
  });
}
