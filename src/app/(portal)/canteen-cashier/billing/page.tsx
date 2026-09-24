"use client";

import { useMemo, useState } from "react";
import { Button, Card, Badge, SearchBar, Select, IconButton, Icon, EmptyState, Modal, Toggle } from "@/components/ui";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import { useCashierDishes, useCashierDishCategories } from "@/modules/canteen-cashier/api/dishes";
import { useCashierSettings } from "@/modules/canteen-cashier/api/settings";
import { useCreateBill, type PaymentMode, type UnavailableItem } from "@/modules/canteen-cashier/api/bills";

interface CartLine {
  dish_id: number;
  name: string;
  price: number;
  quantity: number;
  is_parcel: boolean;
  parcel_available: boolean;
}

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CanteenBillingPage() {
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: categories } = useCashierDishCategories();
  const { data: dishes, isLoading } = useCashierDishes(categoryId, search || undefined);
  const { data: settings } = useCashierSettings();
  const createBill = useCreateBill();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<UnavailableItem[] | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const gstPercentage = settings?.gst_percentage ?? 0;
  const parcelCharge = settings?.parcel_charge ?? 0;

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const parcelTotal = cart.reduce((sum, l) => (l.is_parcel ? sum + parcelCharge * l.quantity : sum), 0);
    const gstAmount = Math.round(subtotal * (gstPercentage / 100) * 100) / 100;
    const total = Math.round((subtotal + parcelTotal + gstAmount) * 100) / 100;
    return { subtotal, parcelTotal, gstAmount, total };
  }, [cart, gstPercentage, parcelCharge]);

  function addToCart(dish: { id: number; name: string; price: number; parcel_available: boolean }) {
    setCart((prev) => {
      const existing = prev.find((l) => l.dish_id === dish.id && !l.is_parcel);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { dish_id: dish.id, name: dish.name, price: dish.price, quantity: 1, is_parcel: false, parcel_available: dish.parcel_available }];
    });
  }

  function updateQuantity(index: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l, i) => (i === index ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function toggleParcel(index: number) {
    setCart((prev) => prev.map((l, i) => (i === index ? { ...l, is_parcel: !l.is_parcel } : l)));
  }

  function removeLine(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function clearCart() {
    setCart([]);
  }

  async function submitBill(forceEmergency: boolean) {
    setSubmitError(null);
    const result = await createBill.mutateAsync({
      items: cart.map((l) => ({ dish_id: l.dish_id, quantity: l.quantity, is_parcel: l.is_parcel })),
      payment_mode: paymentMode,
      force_emergency: forceEmergency,
    });
    if (!result.ok) {
      setUnavailable(result.unavailable_items);
      return;
    }
    setUnavailable(null);
    setSuccessBanner(`Bill #${result.bill_id} completed — ${money(result.total_amount)}${result.is_emergency ? " (emergency sale)" : ""}`);
    clearCart();
  }

  async function handleCompleteSale() {
    if (cart.length === 0) return;
    try {
      await submitBill(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleProcessAnyway() {
    try {
      await submitBill(true);
    } catch (err) {
      setUnavailable(null);
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Billing</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted">Build the order, then complete the sale.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SearchBar placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[320px]" />
          <Select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value === "" ? undefined : Number(e.target.value))} className="w-auto max-w-[220px]">
            <option value="">All Categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {isLoading && !dishes ? (
          <SkeletonCardGrid count={6} columns={3} />
        ) : !dishes || dishes.length === 0 ? (
          <Card>
            <EmptyState message="No dishes match your filters." />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {dishes.map((dish) => (
              <button
                key={dish.id}
                type="button"
                disabled={!dish.is_available}
                onClick={() => addToCart(dish)}
                className="flex flex-col gap-2 rounded-card border border-border-default bg-surface p-3 text-left transition-colors enabled:hover:border-border-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-20 items-center justify-center overflow-hidden rounded-[10px] bg-surface-input">
                  {dish.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- storage domain isn't in next.config's image allowlist, same pattern as ProfilePhoto
                    <img src={dish.image_url} alt={dish.name} className="size-full object-cover" />
                  ) : (
                    <Icon name="restaurant" size={26} className="text-subtle" />
                  )}
                </div>
                <div className="text-[13px] font-bold text-ink">{dish.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-extrabold text-ink">{money(dish.price)}</span>
                  {!dish.is_available ? (
                    <Badge tone="neutral">Unavailable</Badge>
                  ) : dish.stock_quantity <= 0 ? (
                    <Badge tone="danger">Out of stock</Badge>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Card className="flex h-fit flex-col gap-4 lg:sticky lg:top-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">Cart</h2>
          {cart.length > 0 && (
            <button type="button" className="text-[12px] font-bold text-danger-fg hover:opacity-80" onClick={clearCart}>
              Clear
            </button>
          )}
        </div>

        {successBanner && (
          <div className="rounded-[10px] border border-border-accent bg-accent-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-primary-dark">{successBanner}</div>
        )}

        {cart.length === 0 ? (
          <EmptyState message="Cart is empty — tap a dish to add it." />
        ) : (
          <div className="flex flex-col gap-3 divide-y divide-border-default">
            {cart.map((line, index) => (
              <div key={`${line.dish_id}-${line.is_parcel}-${index}`} className="flex flex-col gap-2 pt-3 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ink">{line.name}</span>
                  <button type="button" className="text-danger-fg" onClick={() => removeLine(index)} title="Remove">
                    <Icon name="close" size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconButton icon="remove" size={26} iconSize={14} onClick={() => updateQuantity(index, -1)} />
                    <span className="w-6 text-center text-[13px] font-bold text-ink">{line.quantity}</span>
                    <IconButton icon="add" size={26} iconSize={14} onClick={() => updateQuantity(index, 1)} />
                  </div>
                  <span className="text-[13px] font-bold text-ink">{money(line.price * line.quantity)}</span>
                </div>
                {line.parcel_available ? (
                  <div className="flex items-center gap-2">
                    <Toggle checked={line.is_parcel} onChange={() => toggleParcel(index)} />
                    <span className="text-[11.5px] font-semibold text-muted">Parcel (+{money(parcelCharge)}/item)</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold text-subtle">Not available as parcel</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5 border-t border-border-default pt-3 text-[13px]">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          {totals.parcelTotal > 0 && (
            <div className="flex justify-between text-muted">
              <span>Parcel charge</span>
              <span>{money(totals.parcelTotal)}</span>
            </div>
          )}
          {gstPercentage > 0 && (
            <div className="flex justify-between text-muted">
              <span>GST ({gstPercentage}%)</span>
              <span>{money(totals.gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[16px] font-extrabold text-ink">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMode("cash")}
            className={`flex-1 rounded-[10px] border py-2.5 text-[13px] font-bold transition-colors ${paymentMode === "cash" ? "border-primary bg-accent-50 text-primary" : "border-border-default text-muted"}`}
          >
            Cash
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("upi")}
            className={`flex-1 rounded-[10px] border py-2.5 text-[13px] font-bold transition-colors ${paymentMode === "upi" ? "border-primary bg-accent-50 text-primary" : "border-border-default text-muted"}`}
          >
            UPI
          </button>
        </div>

        {submitError && <p className="text-[12.5px] font-semibold text-danger-fg">{submitError}</p>}

        <Button variant="primary" loading={createBill.isPending} disabled={cart.length === 0} onClick={handleCompleteSale}>
          Complete Sale
        </Button>
      </Card>

      <Modal open={!!unavailable} onClose={() => setUnavailable(null)} title="Not enough stock">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">These items don&apos;t have enough stock for this order:</p>
          <div className="flex flex-col gap-2">
            {unavailable?.map((u) => (
              <div key={u.dish_id} className="flex items-center justify-between rounded-[10px] border border-border-default px-3.5 py-2.5 text-[13px]">
                <span className="font-semibold text-ink">{u.dish_name}</span>
                <span className="text-muted">
                  Requested {u.requested} · Available {u.available}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-subtle">You can process this sale anyway — it will be flagged as an emergency sale and stock will go negative.</p>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setUnavailable(null)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={createBill.isPending} onClick={handleProcessAnyway}>
              Process Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
