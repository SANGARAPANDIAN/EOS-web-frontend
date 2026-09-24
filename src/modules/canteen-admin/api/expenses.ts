import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CanteenExpenseCategory {
  id: number;
  name: string;
}

export interface CanteenExpenseProduct {
  id: number;
  product_name: string;
  price_per_unit: number;
  canteen_expense_categories: CanteenExpenseCategory | null;
}

export interface CanteenExpense {
  id: number;
  name: string;
  category: CanteenExpenseCategory | null;
  vendor_name: string | null;
  quantity: number;
  total_amount: number;
  date: string;
}

export interface CanteenExpensesByCategory {
  category: string;
  amount: number;
  count: number;
}

export interface CanteenExpensesSummary {
  total_expenses: number;
  categories_count: number;
  entries_count: number;
}

export interface CanteenExpensesList {
  items: CanteenExpense[];
  summary: CanteenExpensesSummary;
  by_category: CanteenExpensesByCategory[];
}

export interface ExpensesQuery {
  category_id?: number;
  from?: string;
  to?: string;
  search?: string;
}

export interface CreateExpenseInput {
  name: string;
  category_id?: number;
  vendor_name?: string;
  quantity: number;
  total_amount: number;
  date?: string;
}

export interface CreateExpenseProductInput {
  product_name: string;
  category_id?: number;
  price_per_unit: number;
}

const expenseKeys = {
  categories: ["canteen-admin", "expense-categories"] as const,
  products: ["canteen-admin", "expense-products"] as const,
  list: (query: ExpensesQuery) => ["canteen-admin", "expenses", "list", query] as const,
  all: ["canteen-admin", "expenses"] as const,
};

/** GET /canteen-admin/expenses/categories */
export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseKeys.categories,
    queryFn: () => apiClient.get<CanteenExpenseCategory[]>("/canteen-admin/expenses/categories"),
  });
}

/** POST /canteen-admin/expenses/categories */
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<CanteenExpenseCategory>("/canteen-admin/expenses/categories", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expenseKeys.categories }),
  });
}

/** GET /canteen-admin/expenses/products */
export function useExpenseProducts() {
  return useQuery({
    queryKey: expenseKeys.products,
    queryFn: () => apiClient.get<CanteenExpenseProduct[]>("/canteen-admin/expenses/products"),
  });
}

/** POST /canteen-admin/expenses/products */
export function useCreateExpenseProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseProductInput) => apiClient.post<CanteenExpenseProduct>("/canteen-admin/expenses/products", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expenseKeys.products }),
  });
}

/** GET /canteen-admin/expenses?category_id=&from=&to=&search= */
export function useExpenses(query: ExpensesQuery) {
  return useQuery({
    queryKey: expenseKeys.list(query),
    queryFn: () =>
      apiClient.get<CanteenExpensesList>("/canteen-admin/expenses", {
        category_id: query.category_id,
        from: query.from,
        to: query.to,
        search: query.search,
      }),
  });
}

/** POST /canteen-admin/expenses */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => apiClient.post<CanteenExpense>("/canteen-admin/expenses", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}
