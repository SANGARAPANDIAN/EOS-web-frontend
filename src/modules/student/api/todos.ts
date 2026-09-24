import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/student-todos/me-todos.controller.ts.
// Posted by Placement Cell (see /placement/todos on that side) — the backend
// already scopes this to students with career_path='placement' only, same
// list the mobile app's Placement > Todo tab reads.

export interface MyTodo {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  pdf_url: string | null;
  link_url: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

/** GET /me/todos */
export function useMyTodos() {
  return useQuery({
    queryKey: ["me", "todos"],
    queryFn: () => apiClient.get<MyTodo[]>("/me/todos"),
  });
}

/** POST /me/todos/:id/complete — idempotent; no "un-complete" endpoint. */
export function useCompleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<{ id: number; is_completed: boolean }>(`/me/todos/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "todos"] }),
  });
}
