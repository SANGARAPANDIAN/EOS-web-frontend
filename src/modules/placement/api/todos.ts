import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";

// Backend reference: EOSbackend1/src/modules/student-todos/*. Posted here,
// read by the student mobile app's existing Placement > Todo tab
// (TodoTabBody.tsx) via /me/todos. Scoped server-side to students with
// career_path='placement' — this is not a general-audience announcement.

export interface PlacementTodo {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  pdfUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
  completedCount: number;
  totalStudents: number;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  deadline?: string;
  pdfUrl?: string;
  linkUrl?: string;
}

export type UpdateTodoInput = Partial<CreateTodoInput>;

interface BackendTodo {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  pdf_url: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
  completed_count: number;
  total_students: number;
}

function toTodo(t: BackendTodo): PlacementTodo {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    deadline: t.deadline,
    pdfUrl: t.pdf_url,
    linkUrl: t.link_url,
    isActive: t.is_active,
    createdAt: t.created_at,
    completedCount: t.completed_count,
    totalStudents: t.total_students,
  };
}

const BASE = "/placement/todos";

export function usePlacementTodos() {
  return useQuery({
    queryKey: placementKeys.todos(),
    queryFn: async () => {
      const rows = await apiClient.get<BackendTodo[]>(BASE);
      return rows.map(toTodo);
    },
  });
}

export function useCreatePlacementTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTodoInput) =>
      apiClient.post<{ id: number }>(BASE, {
        title: input.title,
        description: input.description,
        deadline: input.deadline,
        pdfUrl: input.pdfUrl,
        linkUrl: input.linkUrl,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placementKeys.todos() }),
  });
}

export function useUpdatePlacementTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTodoInput }) =>
      apiClient.patch<{ id: number }>(`${BASE}/${id}`, {
        title: input.title,
        description: input.description,
        deadline: input.deadline,
        pdfUrl: input.pdfUrl,
        linkUrl: input.linkUrl,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placementKeys.todos() }),
  });
}

/**
 * POST /placement/todos/pdf-upload — standalone, no to-do id required.
 * Returns a public URL to pass straight into the create payload's pdfUrl.
 */
export function useUploadTodoPdf() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.uploadFile<{ pdf_url: string }>(`${BASE}/pdf-upload`, formData);
    },
  });
}

/** DELETE /placement/todos/:id — soft delete (is_active=false). */
export function useDeletePlacementTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number }>(`${BASE}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placementKeys.todos() }),
  });
}
