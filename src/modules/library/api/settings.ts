import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";

export interface LibrarySettings {
  id: number;
  books_per_student: number;
  default_borrowing_days: number;
  max_renewals: number;
  renewal_extension_days: number;
  fine_per_day: number;
  lost_book_processing_fee: number;
  damaged_book_charge_rate: number;
  grace_period_days: number;
  block_issue_above_fine: number;
  barcode_format: string | null;
  spine_label_prefix: string | null;
  counter_opens_at: string | null;
  counter_closes_at: string | null;
  updated_at: string;
}

export interface UpdateLibrarySettingsInput {
  books_per_student?: number;
  default_borrowing_days?: number;
  max_renewals?: number;
  renewal_extension_days?: number;
  fine_per_day?: number;
  lost_book_processing_fee?: number;
  damaged_book_charge_rate?: number;
  grace_period_days?: number;
  block_issue_above_fine?: number;
  barcode_format?: string;
  spine_label_prefix?: string;
  counter_opens_at?: string;
  counter_closes_at?: string;
}

const BASE = "/library/settings";

export function useLibrarySettings() {
  return useQuery({
    queryKey: libraryKeys.settings(),
    queryFn: () => apiClient.get<LibrarySettings>(BASE),
  });
}

export function useUpdateLibrarySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLibrarySettingsInput) => apiClient.patch<LibrarySettings>(BASE, input),
    onSuccess: (data) => queryClient.setQueryData(libraryKeys.settings(), data),
  });
}
