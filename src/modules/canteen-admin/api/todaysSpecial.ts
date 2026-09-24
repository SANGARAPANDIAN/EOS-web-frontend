import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type MealType = "lunch" | "dinner";

export interface CanteenTodaysSpecial {
  id: number;
  meal_type: MealType;
  image_url: string;
  display_order: number;
}

const specialKeys = {
  list: (mealType: MealType) => ["canteen-admin", "todays-special", mealType] as const,
};

/** GET /canteen-admin/todays-special?meal_type= — today's live specials for one meal. */
export function useTodaysSpecials(mealType: MealType) {
  return useQuery({
    queryKey: specialKeys.list(mealType),
    queryFn: () => apiClient.get<CanteenTodaysSpecial[]>("/canteen-admin/todays-special", { meal_type: mealType }),
  });
}

/** POST /canteen-admin/todays-special?meal_type= (multipart, image required) */
export function useUploadTodaysSpecial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mealType, file }: { mealType: MealType; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      return apiClient.postForm<CanteenTodaysSpecial>(`/canteen-admin/todays-special?meal_type=${mealType}`, formData);
    },
    onSuccess: (_data, { mealType }) => queryClient.invalidateQueries({ queryKey: specialKeys.list(mealType) }),
  });
}

/** DELETE /canteen-admin/todays-special/:id (soft-delete) */
export function useDeleteTodaysSpecial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/canteen-admin/todays-special/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canteen-admin", "todays-special"] }),
  });
}
