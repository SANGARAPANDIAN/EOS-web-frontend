import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type IngredientStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface CanteenIngredient {
  id: number;
  name: string;
  stock_quantity: number;
  price_per_unit: number;
  threshold: number;
  value: number;
  status: IngredientStatus;
  created_at: string | null;
}

export interface CanteenIngredientsSummary {
  total_items: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
}

export interface CanteenIngredientsList {
  items: CanteenIngredient[];
  summary: CanteenIngredientsSummary;
}

export interface CreateIngredientInput {
  name: string;
  stock_quantity?: number;
  price_per_unit: number;
  threshold?: number;
}

export type UpdateIngredientInput = Partial<CreateIngredientInput>;

const ingredientKeys = {
  all: ["canteen-admin", "ingredients"] as const,
  list: (search?: string) => ["canteen-admin", "ingredients", "list", search ?? ""] as const,
};

/** GET /canteen-admin/ingredients?search= */
export function useCanteenIngredients(search?: string) {
  return useQuery({
    queryKey: ingredientKeys.list(search),
    queryFn: () => apiClient.get<CanteenIngredientsList>("/canteen-admin/ingredients", { search }),
  });
}

function useInvalidateIngredients() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
}

/** POST /canteen-admin/ingredients */
export function useCreateIngredient() {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: (input: CreateIngredientInput) => apiClient.post<CanteenIngredient>("/canteen-admin/ingredients", input),
    onSuccess: invalidate,
  });
}

/** PATCH /canteen-admin/ingredients/:id */
export function useUpdateIngredient() {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateIngredientInput }) =>
      apiClient.patch<CanteenIngredient>(`/canteen-admin/ingredients/${id}`, input),
    onSuccess: invalidate,
  });
}

/** DELETE /canteen-admin/ingredients/:id */
export function useDeleteIngredient() {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/canteen-admin/ingredients/${id}`),
    onSuccess: invalidate,
  });
}
