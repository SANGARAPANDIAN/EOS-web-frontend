import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface IssuedOdLetterNumber {
  student_id: number;
  letter_number: string;
  issued_at: string;
}

/** POST /sports-admin/od-letters/issue — one sequential reference number per student_id, for the printed letter. */
export function useIssueOdLetterNumbers() {
  return useMutation({
    mutationFn: (studentIds: number[]) =>
      apiClient.post<IssuedOdLetterNumber[]>("/sports-admin/od-letters/issue", { student_ids: studentIds }),
  });
}
