import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";
import type { Paginated } from "@/modules/library/api/books";

export type EResourceFormat = "PDF" | "EPUB" | "MOBI" | "DOCX" | "Other";
export type EResourceLicenseType = "institution_licence" | "open_access" | "department_copy" | "reference_only";
export type EResourcePublishState = "draft" | "published";

export interface EResource {
  id: number;
  title: string;
  url: string;
  category_id: number | null;
  category_name: string | null;
  format: EResourceFormat | null;
  file_size_bytes: number | null;
  pages: number | null;
  license_type: EResourceLicenseType | null;
  concurrent_seats: number | null;
  publish_state: EResourcePublishState;
  uploaded_by_user_id: number | null;
  created_at: string;
}

export interface EResourceSearchResult extends EResource {
  similarity: number;
}

export interface EResourceListParams {
  [key: string]: string | number | undefined;
  q?: string;
  category_id?: number;
  format?: EResourceFormat;
  publish_state?: EResourcePublishState;
  page?: number;
  page_size?: number;
}

export interface CreateEResourceInput {
  title: string;
  url: string;
  category_id?: number;
  format?: EResourceFormat;
  file_size_bytes?: number;
  pages?: number;
  license_type?: EResourceLicenseType;
  concurrent_seats?: number;
  publish_state?: EResourcePublishState;
}

export type UpdateEResourceInput = Partial<CreateEResourceInput>;

export interface UploadEResourceInput {
  file: File;
  title: string;
  category_id?: number;
  pages?: number;
  license_type?: EResourceLicenseType;
  concurrent_seats?: number;
  publish_state?: EResourcePublishState;
}

const BASE = "/library/e-resources";

export function useEResources(params: EResourceListParams) {
  return useQuery({
    queryKey: libraryKeys.eResources.list(params),
    queryFn: () => apiClient.get<Paginated<EResource>>(BASE, params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateEResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEResourceInput) => apiClient.post<EResource>(BASE, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.eResources.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useUploadEResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, ...fields }: UploadEResourceInput) => {
      const formData = new FormData();
      formData.append("file", file);
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) formData.append(key, String(value));
      }
      return apiClient.uploadFile<EResource>(`${BASE}/upload`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.eResources.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useUpdateEResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateEResourceInput }) =>
      apiClient.patch<EResource>(`${BASE}/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.eResources.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useDeleteEResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.eResources.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}
