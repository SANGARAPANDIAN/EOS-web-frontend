import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";

const BASE = "/me/faculty";

export interface HrFacultyDocument {
  id: number;
  document_type: string;
  file_name: string;
  uploaded_at: string;
  /** A short-lived signed URL — null if the storage object is missing. */
  url: string | null;
}

export function useHrFacultyDocuments(facultyId: number | null) {
  return useQuery({
    queryKey: hrKeys.faculty.documents(facultyId ?? -1),
    queryFn: () => apiClient.get<HrFacultyDocument[]>(`${BASE}/${facultyId}/documents`),
    enabled: facultyId !== null && Number.isFinite(facultyId),
  });
}

export function useUploadHrFacultyDocument(facultyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      return apiClient.postForm<HrFacultyDocument>(`${BASE}/${facultyId}/documents`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.faculty.documents(facultyId) }),
  });
}

export function useDeleteHrFacultyDocument(facultyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) => apiClient.delete<{ id: number }>(`${BASE}/${facultyId}/documents/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.faculty.documents(facultyId) }),
  });
}
