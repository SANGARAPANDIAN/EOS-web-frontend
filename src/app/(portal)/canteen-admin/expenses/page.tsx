"use client";

import { useMemo, useState } from "react";
import { Button, Card, StatCard, SearchBar, Modal, Input, Select, DataTable, EmptyState } from "@/components/ui";
import { SkeletonStatTiles, SkeletonTable } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useExpenses,
  useCreateExpense,
  useCreateExpenseProduct,
  type CanteenExpense,
} from "@/modules/canteen-admin/api/expenses";

function money(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface ExpenseFormState {
  name: string;
  category_id: string;
  vendor_name: string;
  quantity: string;
  total_amount: string;
  date: string;
}

const EMPTY_EXPENSE_FORM: ExpenseFormState = { name: "", category_id: "", vendor_name: "", quantity: "1", total_amount: "", date: "" };

export default function CanteenExpensesPage() {
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const { data: categories } = useExpenseCategories();
  const { data, isLoading, error } = useExpenses({ category_id: categoryId, from: from || undefined, to: to || undefined, search: search || undefined });
  const createExpense = useCreateExpense();
  const createCategory = useCreateExpenseCategory();
  const createProduct = useCreateExpenseProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>(EMPTY_EXPENSE_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategoryId, setNewProductCategoryId] = useState("");
  const [productError, setProductError] = useState<string | null>(null);

  function openCreate() {
    setForm({ ...EMPTY_EXPENSE_FORM, date: new Date().toISOString().slice(0, 10) });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const totalAmount = Number(form.total_amount);
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!form.quantity || Number.isNaN(quantity) || quantity <= 0) {
      setFormError("Enter a valid quantity.");
      return;
    }
    if (!form.total_amount || Number.isNaN(totalAmount) || totalAmount <= 0) {
      setFormError("Enter a valid total amount.");
      return;
    }
    try {
      await createExpense.mutateAsync({
        name,
        category_id: form.category_id === "" ? undefined : Number(form.category_id),
        vendor_name: form.vendor_name.trim() || undefined,
        quantity,
        total_amount: totalAmount,
        date: form.date || undefined,
      });
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleCreateCategory() {
    setCategoryError(null);
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Category name is required.");
      return;
    }
    try {
      await createCategory.mutateAsync(name);
      setNewCategoryName("");
      setCategoryModalOpen(false);
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleCreateProduct() {
    setProductError(null);
    const productName = newProductName.trim();
    const price = Number(newProductPrice);
    if (!productName) {
      setProductError("Product name is required.");
      return;
    }
    if (!newProductPrice || Number.isNaN(price) || price <= 0) {
      setProductError("Enter a valid price per unit.");
      return;
    }
    try {
      await createProduct.mutateAsync({
        product_name: productName,
        category_id: newProductCategoryId === "" ? undefined : Number(newProductCategoryId),
        price_per_unit: price,
      });
      setNewProductName("");
      setNewProductPrice("");
      setNewProductCategoryId("");
      setProductModalOpen(false);
    } catch (err) {
      setProductError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns = useMemo(
    () => [
      { key: "name", header: "Expense", width: "1.6fr", render: (row: CanteenExpense) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: "category", header: "Category", width: "1.1fr", render: (row: CanteenExpense) => row.category?.name ?? "Uncategorized" },
      { key: "vendor", header: "Vendor", width: "1.1fr", render: (row: CanteenExpense) => row.vendor_name ?? "—" },
      { key: "quantity", header: "Qty", width: "0.7fr", render: (row: CanteenExpense) => row.quantity },
      { key: "amount", header: "Total", width: "1fr", render: (row: CanteenExpense) => money(row.total_amount), sortValue: (row: CanteenExpense) => row.total_amount },
      { key: "date", header: "Date", width: "1fr", render: (row: CanteenExpense) => formatDate(row.date), sortValue: (row: CanteenExpense) => row.date },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Expense Management</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted">Track canteen purchases and running costs.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" className="w-auto" onClick={() => setCategoryModalOpen(true)}>
            + Category
          </Button>
          <Button variant="secondary" className="w-auto" onClick={() => setProductModalOpen(true)}>
            + Product
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={openCreate}>
            + Add Expense
          </Button>
        </div>
      </div>

      {data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Expenses" value={money(data.summary.total_expenses)} icon="payments" />
          <StatCard label="Entries" value={data.summary.entries_count} icon="receipt_long" />
          <StatCard label="Categories" value={data.summary.categories_count} icon="category" />
        </div>
      ) : (
        <SkeletonStatTiles count={3} />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="max-w-[280px] flex-1">
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Search</label>
          <SearchBar placeholder="Search expenses…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Category</label>
          <Select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value === "" ? undefined : Number(e.target.value))} className="w-auto min-w-[160px]">
            <option value="">All Categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-bold text-muted">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        </div>
      </div>

      {data && data.by_category.length > 0 && (
        <Card>
          <h2 className="text-[15px] font-bold text-ink">By Category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.by_category.map((row) => (
              <div key={row.category} className="rounded-[10px] border border-border-default px-3.5 py-2 text-[12.5px]">
                <span className="font-bold text-ink">{row.category}</span>
                <span className="ml-2 text-muted">
                  {money(row.amount)} · {row.count} {row.count === 1 ? "entry" : "entries"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-0">
        {error ? (
          <EmptyState message={error instanceof Error ? error.message : "Could not load expenses."} />
        ) : isLoading && !data ? (
          <SkeletonTable rows={6} />
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyMessage="No expenses match your filters."
            hoverableRows
          />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Expense Name</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Vegetables purchase" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Category</label>
              <Select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                <option value="">Uncategorized</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Vendor</label>
              <Input value={form.vendor_name} onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Quantity</label>
              <Input type="number" min={0} step="0.01" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Total Amount (₹)</label>
              <Input type="number" min={0} step="0.01" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Date</label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          {formError && <p className="text-[12.5px] font-semibold text-danger-fg">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={createExpense.isPending} onClick={handleSave}>
              Add Expense
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="New Expense Category">
        <div className="flex flex-col gap-4">
          <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Utilities" />
          {categoryError && <p className="text-[12.5px] font-semibold text-danger-fg">{categoryError}</p>}
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={createCategory.isPending} onClick={handleCreateCategory}>
              Add Category
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title="New Expense Product" subtitle="A catalog entry for recurring purchases.">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Product Name</label>
            <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="e.g. Cooking Oil (15L can)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Category</label>
              <Select value={newProductCategoryId} onChange={(e) => setNewProductCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Price per Unit (₹)</label>
              <Input type="number" min={0} step="0.01" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          {productError && <p className="text-[12.5px] font-semibold text-danger-fg">{productError}</p>}
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setProductModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={createProduct.isPending} onClick={handleCreateProduct}>
              Add Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
