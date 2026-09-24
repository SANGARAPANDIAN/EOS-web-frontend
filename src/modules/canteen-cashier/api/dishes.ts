import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CashierDishCategory {
  id: number;
  name: string;
  dish_count: number;
}

export interface CashierDish {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  parcel_available: boolean;
  category: { id: number; name: string } | null;
}

/** GET /canteen-cashier/dish-categories — read-only, reuses Admin's category data. */
export function useCashierDishCategories() {
  return useQuery({
    queryKey: ["canteen-cashier", "dish-categories"],
    queryFn: () => apiClient.get<CashierDishCategory[]>("/canteen-cashier/dish-categories"),
  });
}

/** GET /canteen-cashier/dishes?category_id=&search= — read-only, reuses Admin's dish data. */
export function useCashierDishes(categoryId?: number, search?: string) {
  return useQuery({
    queryKey: ["canteen-cashier", "dishes", categoryId ?? null, search ?? ""],
    queryFn: () => apiClient.get<CashierDish[]>("/canteen-cashier/dishes", { category_id: categoryId, search }),
    refetchInterval: 20_000,
  });
}
