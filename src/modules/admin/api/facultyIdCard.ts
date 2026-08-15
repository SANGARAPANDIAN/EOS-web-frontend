import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { facultyKeys } from "@/modules/admin/api/faculty";

export interface FacultyIdCardStatus {
  issued: boolean;
  lastIssuedAt: string | null;
  issueCount: number;
}

const BASE = "/me/faculty";

export function useFacultyIdCardBulkStatus(facultyIds: number[]) {
  const sortedIds = [...facultyIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: facultyKeys.idCardStatus(sortedIds),
    queryFn: () =>
      apiClient.get<Record<number, FacultyIdCardStatus>>(`${BASE}/id-card/status`, {
        faculty_ids: sortedIds.join(","),
      }),
    enabled: sortedIds.length > 0,
  });
}

export function useIssueFacultyIdCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (facultyId: number) => apiClient.post<FacultyIdCardStatus>(`${BASE}/${facultyId}/id-card/issue`),
    onSuccess: (_data, facultyId) => {
      queryClient.invalidateQueries({ queryKey: [...facultyKeys.all, "id-card-status"] });
      queryClient.invalidateQueries({ queryKey: facultyKeys.activity(facultyId) });
    },
  });
}
