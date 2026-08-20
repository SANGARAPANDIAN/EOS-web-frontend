import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/faculty/hr-queries/*. A genuinely NEW
// feature built this session — no ticket/query/request table existed
// anywhere in the database before (confirmed via exhaustive schema
// search). Built via raw SQL against a new hr_queries table (schema.prisma
// itself was not touched, per instruction) — see the migration SQL
// documented in hr-queries.service.ts's own comment.

export const HR_QUERY_CATEGORIES = [
  "PF / ESI query",
  "Increment / arrears",
  "Bank account change",
  "Leave encashment",
  "Tax / Form 16",
  "Other",
] as const;

export interface HrQueryRow {
  id: number;
  ticket_no: string;
  category: string;
  subject: string;
  description: string | null;
  file_url: string | null;
  status: "submitted" | "under_review" | "resolved";
  assigned_to_name: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

/** GET /me/hr-queries — own queries only. */
export function useMyHrQueries() {
  return useQuery({
    queryKey: ["me", "hr-queries"],
    queryFn: () => apiClient.get<HrQueryRow[]>("/me/hr-queries"),
  });
}

/** POST /me/hr-queries — multipart, file optional. */
export function useCreateHrQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, subject, description, file }: { category: string; subject: string; description?: string; file?: File }) => {
      const form = new FormData();
      form.append("category", category);
      form.append("subject", subject);
      if (description) form.append("description", description);
      if (file) form.append("file", file);
      return apiClient.postForm<{ id: number; ticket_no: string; status: string }>("/me/hr-queries", form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "hr-queries"] }),
  });
}
