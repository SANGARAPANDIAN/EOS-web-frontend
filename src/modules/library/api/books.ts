import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";

export interface DepartmentRef {
  id: number;
  name: string;
  code: string;
}

export interface BookRackRef {
  id: number;
  rack_code: string;
  subject_range: string | null;
}

export interface Book {
  id: number;
  qr_code: string;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  edition: string | null;
  category_id: number;
  category_name: string;
  department: DepartmentRef | null;
  rack: BookRackRef | null;
  total_copies: number;
  available_copies: number;
  price_per_copy: number | null;
  vendor_fund: string | null;
}

export interface BookSearchResult extends Omit<Book, "rack"> {
  rack: { id: number; rack_code: string | null } | null;
  similarity: number;
}

export interface BookListParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  category_id?: number;
  department_id?: number;
  rack_id?: number;
  available_only?: boolean;
  page?: number;
  page_size?: number;
}

export interface CreateBookInput {
  qr_code: string;
  title: string;
  category_id: number;
  total_copies: number;
  author?: string;
  isbn?: string;
  publisher?: string;
  edition?: string;
  department_id?: number;
  rack_id?: number;
  available_copies?: number;
  price_per_copy?: number;
  vendor_fund?: string;
}

export type UpdateBookInput = Partial<CreateBookInput>;

export interface Paginated<T> {
  page: number;
  page_size: number;
  total: number;
  data: T[];
}

const BASE = "/library/books";

export function useBooks(params: BookListParams) {
  return useQuery({
    queryKey: libraryKeys.books.list(params),
    queryFn: () => apiClient.get<Paginated<Book>>(BASE, params),
    placeholderData: keepPreviousData,
  });
}

/** Typeahead — backend requires q.length >= 2, so this is gated client-side to match. */
export function useBookSearch(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: libraryKeys.books.search(trimmed),
    queryFn: () => apiClient.get<BookSearchResult[]>(`${BASE}/search`, { q: trimmed }),
    enabled: trimmed.length >= 2,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookInput) => apiClient.post<Book>(BASE, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.books.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBookInput }) => apiClient.patch<Book>(`${BASE}/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.books.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.books.all() });
      queryClient.invalidateQueries({ queryKey: libraryKeys.dashboard() });
    },
  });
}
