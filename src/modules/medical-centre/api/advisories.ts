import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AdvisoryCategory = "academic" | "department" | "emergency" | "event" | "general";

export interface Advisory {
  id: number;
  tag: AdvisoryCategory;
  title: string;
  body: string;
  when: string;
  by: string;
}

/** GET /me/medical-centre-advisories */
export function useAdvisories() {
  return useQuery({
    queryKey: ["me", "medical-centre-advisories"],
    queryFn: () => apiClient.get<Advisory[]>("/me/medical-centre-advisories"),
  });
}

export interface CreateAdvisoryInput {
  title: string;
  content: string;
  category?: AdvisoryCategory;
}

/** POST /me/medical-centre-advisories */
export function useCreateAdvisory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdvisoryInput) => apiClient.post<Advisory>("/me/medical-centre-advisories", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-advisories"] });
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-dashboard"] });
    },
  });
}
