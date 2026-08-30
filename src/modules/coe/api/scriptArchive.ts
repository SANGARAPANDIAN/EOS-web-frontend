import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/script-archive/ — coe-only. Layered over real
// script_bundles/script_bundle_scripts; a bundle is auto-archived (real
// shelf assignment + 6-month retention clock) the moment it's submitted in
// Exam Valuation, so this page is purely custody/retrieval/disposal, not intake.

export type ArchiveStatus = "in_archive" | "issued_out" | "due_disposal";
export type RequestType = "photocopy" | "rti";

export interface ActiveRetrieval {
  id: number;
  request_type: RequestType;
  fee_receipt_no: string | null;
  fee_receipt_url: string | null;
  purpose: string;
  issued_to: string | null;
  requested_at: string;
  reference_code: string;
}

export interface ArchiveRow {
  id: number;
  bundle_code: string;
  subject: { id: number; name: string; subject_code: string };
  exam_label: string;
  scripts_count: number;
  location_label: string;
  rack: string;
  retention_until: string;
  status: ArchiveStatus;
  active_retrieval: ActiveRetrieval | null;
}

export interface ArchiveStats {
  archived: number;
  archived_this_cycle: number;
  retention_months: number;
  open_retrieval_requests: number;
  pending_beyond_30_days: number;
  due_disposal: number;
  due_disposal_next: string | null;
}

export interface ArchiveQuery {
  [key: string]: string | undefined;
  status?: ArchiveStatus;
  search?: string;
  rack?: string;
  request_type?: RequestType;
}

export function useArchiveBundles(query: ArchiveQuery) {
  return useQuery({
    queryKey: ["coe", "script-archive", query],
    queryFn: () => apiClient.get<ArchiveRow[]>("/script-archive", query),
  });
}

export function useArchiveStats() {
  return useQuery({
    queryKey: ["coe", "script-archive-stats"],
    queryFn: () => apiClient.get<ArchiveStats>("/script-archive/stats"),
  });
}

/** Real, previously-typed requester names — used as picklist suggestions in the retrieval-request modal (still a free-typeable field for a brand-new requester). */
export function useRequesterSuggestions() {
  return useQuery({
    queryKey: ["coe", "script-archive-requesters"],
    queryFn: () => apiClient.get<string[]>("/script-archive/requesters"),
    staleTime: 60 * 1000,
  });
}

export interface UploadedFeeReceipt {
  url: string;
}

/** POST /script-archive/retrieval/attachments — real Supabase-Storage upload; returns {url} to send back as fee_receipt_url on create. */
export function useUploadFeeReceipt() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.uploadFile<UploadedFeeReceipt>("/script-archive/retrieval/attachments", formData);
    },
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["coe", "script-archive"] });
  queryClient.invalidateQueries({ queryKey: ["coe", "script-archive-stats"] });
}

/** POST /script-archive/retrieval — bundle_or_roll resolves against either a real bundle_code or a student's register/roll number. */
export function useCreateRetrieval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      bundle_or_roll: string;
      request_type: RequestType;
      requester?: string;
      fee_receipt_no?: string;
      fee_receipt_url?: string;
      purpose?: string;
    }) => apiClient.post("/script-archive/retrieval", input),
    onSuccess: () => {
      invalidate(queryClient);
      queryClient.invalidateQueries({ queryKey: ["coe", "script-archive-requesters"] });
    },
  });
}

export function useRecallBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archiveBundleId: number) => apiClient.post(`/script-archive/${archiveBundleId}/recall`),
    onSuccess: () => invalidate(queryClient),
  });
}
