import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/script-archive/ — new, coe-only. New script_archive_bundles/
// script_retrieval_requests tables (query.md), layered over real script_bundles.

export type ArchiveStatus = "in_archive" | "issued_out" | "due_disposal";

export interface ArchiveRow {
  id: number;
  bundle_code: string;
  subject: { id: number; name: string; subject_code: string };
  scripts_count: number;
  location_label: string;
  retention_until: string;
  status: ArchiveStatus;
  active_retrieval: { id: number; purpose: string; issued_to: string | null; requested_at: string } | null;
}

export interface ArchiveStats {
  archived: number;
  in_archive: number;
  issued_out: number;
  due_disposal: number;
  retrieval_requests: number;
}

export function useArchiveBundles(status?: ArchiveStatus | null) {
  return useQuery({
    queryKey: ["coe", "script-archive", status ?? null],
    queryFn: () => apiClient.get<ArchiveRow[]>("/script-archive", { status: status ?? undefined }),
  });
}

export function useArchiveStats() {
  return useQuery({
    queryKey: ["coe", "script-archive-stats"],
    queryFn: () => apiClient.get<ArchiveStats>("/script-archive/stats"),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["coe", "script-archive"] });
  queryClient.invalidateQueries({ queryKey: ["coe", "script-archive-stats"] });
}

export function useCreateRetrieval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { archive_bundle_id: number; purpose: string; issued_to?: string }) => apiClient.post("/script-archive/retrieval", input),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useRecallBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archiveBundleId: number) => apiClient.post(`/script-archive/${archiveBundleId}/recall`),
    onSuccess: () => invalidate(queryClient),
  });
}
