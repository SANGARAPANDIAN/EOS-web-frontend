import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface StudentIdCardStatus {
  issued: boolean;
  lastIssuedAt: string | null;
  issueCount: number;
}

const BASE = "/students";

export function useStudentIdCardBulkStatus(studentIds: number[]) {
  const sortedIds = [...studentIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["students", "id-card-status", sortedIds],
    queryFn: () =>
      apiClient.get<Record<number, StudentIdCardStatus>>(`${BASE}/id-card/status`, {
        student_ids: sortedIds.join(","),
      }),
    enabled: sortedIds.length > 0,
  });
}

export function useIssueStudentIdCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: number) => apiClient.post<StudentIdCardStatus>(`${BASE}/${studentId}/id-card/issue`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", "id-card-status"] });
    },
  });
}
