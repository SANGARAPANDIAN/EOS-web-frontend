import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface OrderFoodDishCategory {
  id: number;
  name: string;
  dish_count: number;
}

export interface OrderFoodDish {
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

export interface OrderFoodSettings {
  gst_percentage: number;
  parcel_charge: number;
}

export interface PlaceOrderItemInput {
  dish_id: number;
  quantity: number;
  is_parcel?: boolean;
}

export type OrderStatus = "placed" | "accepted" | "preparing" | "ready" | "collected" | "cancelled";

export interface PlacedOrder {
  order_id: number;
  pickup_token: string;
  status: OrderStatus;
  subtotal: number;
  parcel_total: number;
  gst_percentage: number;
  gst_amount: number;
  total_amount: number;
  wallet_balance: number;
}

export interface OrderSummary {
  id: number;
  status: OrderStatus;
  total_amount: number;
  pickup_token: string | null;
  created_at: string;
  items: { name: string; quantity: number; is_parcel: boolean; price: number }[];
}

const orderingKeys = {
  myOrders: ["order-food", "orders"] as const,
  order: (id: number) => ["order-food", "orders", id] as const,
};

/** GET /me/canteen-ordering/dish-categories */
export function useOrderFoodCategories() {
  return useQuery({
    queryKey: ["order-food", "dish-categories"],
    queryFn: () => apiClient.get<OrderFoodDishCategory[]>("/me/canteen-ordering/dish-categories"),
  });
}

/** GET /me/canteen-ordering/dishes?category_id=&search= */
export function useOrderFoodDishes(categoryId?: number, search?: string) {
  return useQuery({
    queryKey: ["order-food", "dishes", categoryId ?? null, search ?? ""],
    queryFn: () => apiClient.get<OrderFoodDish[]>("/me/canteen-ordering/dishes", { category_id: categoryId, search }),
    refetchInterval: 20_000,
  });
}

/** GET /me/canteen-ordering/settings — live GST/parcel rates, for the cart's total preview. */
export function useOrderFoodSettings() {
  return useQuery({
    queryKey: ["order-food", "settings"],
    queryFn: () => apiClient.get<OrderFoodSettings>("/me/canteen-ordering/settings"),
    staleTime: 60_000,
  });
}

/** POST /me/canteen-ordering/orders — debits the wallet and places the order in one step. */
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: PlaceOrderItemInput[]) => apiClient.post<PlacedOrder>("/me/canteen-ordering/orders", { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.myOrders });
      queryClient.invalidateQueries({ queryKey: ["order-food", "dishes"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

/** GET /me/canteen-ordering/orders — recent history including any still-active order. */
export function useMyOrders() {
  return useQuery({
    queryKey: orderingKeys.myOrders,
    queryFn: () => apiClient.get<OrderSummary[]>("/me/canteen-ordering/orders"),
    refetchInterval: 15_000,
  });
}

/** GET /me/canteen-ordering/orders/:id */
export function useOrderDetail(orderId: number | undefined) {
  return useQuery({
    queryKey: orderingKeys.order(orderId ?? -1),
    queryFn: () => apiClient.get<OrderSummary>(`/me/canteen-ordering/orders/${orderId}`),
    enabled: orderId !== undefined,
    refetchInterval: 10_000,
  });
}

/** POST /me/canteen-ordering/orders/:id/cancel — only while still 'placed' or 'accepted'; refunds the wallet. */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => apiClient.post<{ success: boolean }>(`/me/canteen-ordering/orders/${orderId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderingKeys.myOrders });
      queryClient.invalidateQueries({ queryKey: ["order-food", "dishes"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
