import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { BorrowRecordStatus, MyBorrowRecord } from "@/modules/student/api/library";

export type { BorrowRecordStatus, MyBorrowRecord } from "@/modules/student/api/library";

/** GET /me/children/:id/library-records?status= */
export function useChildBorrowRecords(childId: number | null, status?: BorrowRecordStatus) {
  return useQuery({
    queryKey: ["me", "children", childId, "library-records", status],
    queryFn: () => apiClient.get<MyBorrowRecord[]>(`/me/children/${childId}/library-records`, { status }),
    enabled: childId !== null,
  });
}
