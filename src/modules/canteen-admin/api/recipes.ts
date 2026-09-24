import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CanteenRecipeIngredientLine {
  ingredient_id: number;
  name: string;
  quantity_needed: number;
  unit: string;
}

export interface CanteenRecipe {
  id: number;
  dish: { id: number; name: string };
  ingredients: CanteenRecipeIngredientLine[];
  created_at: string | null;
}

export interface CanteenRecipesSummary {
  total_recipes: number;
  available_dishes: number;
  available_ingredients: number;
}

export interface UpsertRecipeInput {
  dish_id: number;
  ingredients: { ingredient_id: number; quantity_needed: number; unit: string }[];
}

const recipeKeys = {
  all: ["canteen-admin", "recipes"] as const,
  list: (search?: string) => ["canteen-admin", "recipes", "list", search ?? ""] as const,
  summary: ["canteen-admin", "recipes", "summary"] as const,
};

/** GET /canteen-admin/recipes?search= */
export function useCanteenRecipes(search?: string) {
  return useQuery({
    queryKey: recipeKeys.list(search),
    queryFn: () => apiClient.get<CanteenRecipe[]>("/canteen-admin/recipes", { search }),
  });
}

/** GET /canteen-admin/recipes/summary */
export function useCanteenRecipesSummary() {
  return useQuery({
    queryKey: recipeKeys.summary,
    queryFn: () => apiClient.get<CanteenRecipesSummary>("/canteen-admin/recipes/summary"),
  });
}

function useInvalidateRecipes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: recipeKeys.all });
}

/** POST /canteen-admin/recipes — create-or-replace by dish_id. */
export function useUpsertRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (input: UpsertRecipeInput) => apiClient.post<{ id: number; dish_id: number }>("/canteen-admin/recipes", input),
    onSuccess: invalidate,
  });
}

/** DELETE /canteen-admin/recipes/:id */
export function useDeleteRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/canteen-admin/recipes/${id}`),
    onSuccess: invalidate,
  });
}
