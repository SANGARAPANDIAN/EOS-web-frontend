export const stationeryStoreKeys = {
  dashboard: () => ["stationery-store", "dashboard"] as const,
  reports: () => ["stationery-store", "reports"] as const,
  products: {
    all: () => ["stationery-store", "products"] as const,
  },
  orders: {
    all: () => ["stationery-store", "orders"] as const,
    list: (status: string) => ["stationery-store", "orders", "list", status] as const,
    detail: (id: number) => ["stationery-store", "orders", "detail", id] as const,
  },
};
