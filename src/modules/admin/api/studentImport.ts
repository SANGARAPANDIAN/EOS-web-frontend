import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface BulkImportStudentRow {
  first_name: string;
  last_name?: string;
  email: string;
  student_id_no: string;
  roll_no?: string;
  register_no?: string;
  course_code: string;
  quota_name: string;
  batch_name: string;
  student_type: "hosteller" | "dayscholar";
  dayscholar_mode?: "transport" | "own_vehicle";
  vehicle_number?: string;
  gender?: string;
  date_of_birth?: string;
}

export interface BulkImportStudentsResult {
  total: number;
  created: number;
  failed: number;
  results: Array<
    | { row: number; status: "created"; student_id: number; student_id_no: string }
    | { row: number; status: "error"; student_id_no: string; message: string }
  >;
}

/** POST /soa-applications/bulk-import — reuses create() -> updateStatus() x2 -> perfectEntry() per row, same as a single admission. */
export function useBulkImportStudents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: BulkImportStudentRow[]) =>
      apiClient.post<BulkImportStudentsResult>("/soa-applications/bulk-import", { rows }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}
