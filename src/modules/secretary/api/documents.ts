import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/secretary-portal/documents/*.
// {controller,service}.ts — new module built this session (real
// `department_documents` table, added via the Secretary module completion
// migration you ran). Institution-wide for Secretary/Admin/Principal.

export type DocumentStatus = "pending" | "verified" | "missing";

export interface DocumentRow {
  id: number;
  name: string;
  category: string;
  file_url: string | null;
  size_bytes: number | null;
  status: DocumentStatus;
  version: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  department: { id: number; name: string; code: string };
  uploaded_by: { id: number; email: string };
  verified_by: { id: number; email: string } | null;
}
export interface DocumentsResponse {
  data: DocumentRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useDocuments(params: { department_id?: number; category?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.department_id !== undefined) qs.set("department_id", String(params.department_id));
  if (params.category) qs.set("category", params.category);
  qs.set("limit", "100");
  return useQuery({
    queryKey: ["secretary", "documents", params],
    queryFn: () => apiClient.get<DocumentsResponse>(`/me/department-documents?${qs.toString()}`),
  });
}

export interface CreateDocumentInput {
  department_id: number;
  name: string;
  category: string;
  file_url?: string;
  size_bytes?: number;
}
export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDocumentInput) => apiClient.post("/me/department-documents", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "documents"] }),
  });
}

export function useToggleVerifyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/me/department-documents/${id}/verify`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "documents"] }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/department-documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "documents"] }),
  });
}
