import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HealthRecord {
  studentId: number;
  name: string;
  roll: string;
  dept: string;
  year: string;
  blood: string;
  allergy: string;
  condition: string;
  last: string;
  visits: number;
  guardian: string;
  stay: string;
}

/** GET /me/medical-centre-records */
export function useHealthRecords() {
  return useQuery({
    queryKey: ["me", "medical-centre-records"],
    queryFn: () => apiClient.get<HealthRecord[]>("/me/medical-centre-records"),
  });
}

export interface UpsertHealthRecordInput {
  blood_group?: string;
  allergies?: string;
  chronic_condition?: string;
  guardian_name?: string;
  guardian_phone?: string;
}

/** PUT /me/medical-centre-records/:studentId */
export function useUpsertHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: number; input: UpsertHealthRecordInput }) =>
      apiClient.put(`/me/medical-centre-records/${studentId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-records"] }),
  });
}
