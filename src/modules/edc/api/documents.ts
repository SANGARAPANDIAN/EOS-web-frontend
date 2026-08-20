import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";

// Real backend connection — GET/POST /me/edc-documents (EdcDocumentsController,
// added this session on a real `edc_documents` table — confirmed via a live
// DB audit that no generic document table existed anywhere before). The
// actual file upload reuses the EXISTING `POST /announcements/attachments`
// endpoint (EDC_COORDINATOR already had access to it — same Supabase
// Storage plumbing the rest of the app uses); this module only records the
// resulting key/url/name against a venture plus the verification workflow.

export const EDC_DOCUMENT_TYPES = ["Pitch Deck", "Business Plan", "Company Registration", "Financial Documents", "IP Documents", "Competition Documents"] as const;
export type EdcDocumentType = (typeof EDC_DOCUMENT_TYPES)[number];
export type EdcDocumentVerificationStatus = "Pending" | "Verified" | "Rejected";

export interface EdcDocumentRow {
  id: number;
  student_entrepreneurship_id: number | null;
  venture_name: string | null;
  document_type: EdcDocumentType;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  verification_status: EdcDocumentVerificationStatus;
  reviewer_note: string | null;
  reviewed_at: string | null;
}

export function useEdcDocuments() {
  return useQuery({
    queryKey: ["edc", "documents"],
    queryFn: () => apiClient.get<EdcDocumentRow[]>("/me/edc-documents"),
  });
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

/** Uploads the raw file via the existing shared attachments endpoint —
 * apiClient.post() doesn't support FormData, so this does a plain fetch
 * with the same auth header apiClient injects. */
async function uploadFile(file: File): Promise<{ file_key: string; file_name: string; url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL.replace(/\/+$/, "")}/announcements/attachments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? "Upload failed");
  return json.data;
}

export interface CreateEdcDocumentInput {
  file: File;
  document_type: EdcDocumentType;
  student_entrepreneurship_id?: number;
}

export function useUploadEdcDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEdcDocumentInput) => {
      const uploaded = await uploadFile(input.file);
      return apiClient.post<EdcDocumentRow>("/me/edc-documents", {
        document_type: input.document_type,
        student_entrepreneurship_id: input.student_entrepreneurship_id,
        file_name: uploaded.file_name,
        file_url: uploaded.url,
        file_key: uploaded.file_key,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "documents"] }),
  });
}

export function useReviewEdcDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verification_status, reviewer_note }: { id: number; verification_status: EdcDocumentVerificationStatus; reviewer_note?: string }) =>
      apiClient.patch<EdcDocumentRow>(`/me/edc-documents/${id}/review`, { verification_status, reviewer_note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "documents"] }),
  });
}

export function useDeleteEdcDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/edc-documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "documents"] }),
  });
}
