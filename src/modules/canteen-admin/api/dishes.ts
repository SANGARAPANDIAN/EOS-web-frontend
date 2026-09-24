import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CanteenDishCategory {
  id: number;
  name: string;
  dish_count: number;
}

export interface CanteenDish {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  parcel_available: boolean;
  category: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface DishFormInput {
  name: string;
  category_id?: number;
  price: number;
  stock_quantity?: number;
  is_veg?: boolean;
  is_available?: boolean;
  parcel_available?: boolean;
  image?: File;
}

function buildDishFormData(input: DishFormInput): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  if (input.category_id !== undefined) formData.append("category_id", String(input.category_id));
  formData.append("price", String(input.price));
  if (input.stock_quantity !== undefined) formData.append("stock_quantity", String(input.stock_quantity));
  if (input.is_veg !== undefined) formData.append("is_veg", String(input.is_veg));
  if (input.is_available !== undefined) formData.append("is_available", String(input.is_available));
  if (input.parcel_available !== undefined) formData.append("parcel_available", String(input.parcel_available));
  if (input.image) formData.append("image", input.image);
  return formData;
}

const dishKeys = {
  categories: ["canteen-admin", "dish-categories"] as const,
  dishes: (categoryId?: number, search?: string) => ["canteen-admin", "dishes", categoryId ?? null, search ?? ""] as const,
  allDishes: ["canteen-admin", "dishes"] as const,
};

/** GET /canteen-admin/dish-categories */
export function useDishCategories() {
  return useQuery({
    queryKey: dishKeys.categories,
    queryFn: () => apiClient.get<CanteenDishCategory[]>("/canteen-admin/dish-categories"),
  });
}

/** POST /canteen-admin/dish-categories */
export function useCreateDishCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<CanteenDishCategory>("/canteen-admin/dish-categories", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dishKeys.categories }),
  });
}

/** GET /canteen-admin/dishes?category_id=&search= */
export function useDishes(categoryId?: number, search?: string) {
  return useQuery({
    queryKey: dishKeys.dishes(categoryId, search),
    queryFn: () => apiClient.get<CanteenDish[]>("/canteen-admin/dishes", { category_id: categoryId, search }),
  });
}

function useInvalidateDishes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: dishKeys.allDishes });
    queryClient.invalidateQueries({ queryKey: dishKeys.categories });
  };
}

/** POST /canteen-admin/dishes (multipart — image is optional) */
export function useCreateDish() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: (input: DishFormInput) => apiClient.postForm<CanteenDish>("/canteen-admin/dishes", buildDishFormData(input)),
    onSuccess: invalidate,
  });
}

/** PATCH /canteen-admin/dishes/:id (multipart — image is optional, keeps the existing one if omitted) */
export function useUpdateDish() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: DishFormInput }) =>
      apiClient.patchForm<CanteenDish>(`/canteen-admin/dishes/${id}`, buildDishFormData(input)),
    onSuccess: invalidate,
  });
}

/** DELETE /canteen-admin/dishes/:id */
export function useDeleteDish() {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/canteen-admin/dishes/${id}`),
    onSuccess: invalidate,
  });
}
