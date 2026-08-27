import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/faculty/exam-marks/subject-records.{controller,service}.ts

export interface SubjectRecordSummary {
  exam_subject_mapping_id: number;
  class: { id: number; label: string };
  subject: { id: number; name: string; subject_code: string };
  exam: { id: number; type: string; category: "internal" | "external"; academic_year: string; semester: number };
  is_published: boolean;
  published_at: string | null;
  entered_count: number;
}

/** GET /me/subject-records */
export function useSubjectRecords() {
  return useQuery({
    queryKey: ["me", "subject-records"],
    queryFn: () => apiClient.get<SubjectRecordSummary[]>("/me/subject-records"),
  });
}

export interface SubjectRecordDetail extends SubjectRecordSummary {
  total_students: number;
  grade_distribution: { grade: "O" | "A+" | "A" | "B+" | "B" | "RA"; count: number }[];
  toppers: { rank: number; name: string; roll_no: string; score: number }[];
}

/** GET /me/subject-records/:exam_subject_mapping_id */
export function useSubjectRecordDetail(mappingId: number | undefined) {
  return useQuery({
    queryKey: ["me", "subject-records", mappingId],
    queryFn: () => apiClient.get<SubjectRecordDetail>(`/me/subject-records/${mappingId}`),
    enabled: Boolean(mappingId),
  });
}

/** POST /me/subject-records/:exam_subject_mapping_id/publish */
export function usePublishSubjectRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) => apiClient.post<SubjectRecordSummary>(`/me/subject-records/${mappingId}/publish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "subject-records"] }),
  });
}
