import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { facultyKeys } from "@/modules/admin/api/faculty";

export interface FacultyDocument {
  id: number;
  document_type: string;
  file_name: string;
  uploaded_at: string;
  /** A short-lived signed URL — null if the storage object is missing. */
  url: string | null;
}

const BASE = "/me/faculty";

export function useFacultyDocuments(facultyId: number | null) {
  return useQuery({
    queryKey: facultyKeys.documents(facultyId ?? -1),
    queryFn: () => apiClient.get<FacultyDocument[]>(`${BASE}/${facultyId}/documents`),
    enabled: facultyId !== null && Number.isFinite(facultyId),
  });
}

export function useUploadFacultyPhoto(facultyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.postForm<{ profile_url: string | null }>(`${BASE}/${facultyId}/photo`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: facultyKeys.detail(facultyId) }),
  });
}

export function useRemoveFacultyPhoto(facultyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<{ profile_url: string | null }>(`${BASE}/${facultyId}/photo`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: facultyKeys.detail(facultyId) }),
  });
}

export function useUploadFacultyDocument(facultyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      return apiClient.postForm<FacultyDocument>(`${BASE}/${facultyId}/documents`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: facultyKeys.documents(facultyId) }),
  });
}

export function useDeleteFacultyDocument(facultyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) => apiClient.delete<{ id: number }>(`${BASE}/${facultyId}/documents/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: facultyKeys.documents(facultyId) }),
  });
}
