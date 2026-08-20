import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";

export interface BookCategory {
  id: number;
  name: string;
}

const BASE = "/library/book-categories";

/**
 * Unpaginated on purpose — the backend's response wrapping makes
 * page/page_size/total unreachable from this endpoint, so this always
 * requests page_size=100 and treats the result as a flat array.
 */
export function useCategories(q?: string) {
  return useQuery({
    queryKey: libraryKeys.categories.list({ q }),
    queryFn: () => apiClient.get<BookCategory[]>(BASE, { q, page_size: 100 }),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<BookCategory>(BASE, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.categories.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => apiClient.patch<BookCategory>(`${BASE}/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.categories.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    // Backend returns no `data` key for this endpoint — resolves undefined.
    mutationFn: (id: number) => apiClient.delete<void>(`${BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.categories.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}
