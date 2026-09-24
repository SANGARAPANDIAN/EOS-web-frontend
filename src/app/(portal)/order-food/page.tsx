"use client";

import { useMemo, useState } from "react";
import { Button, Card, Badge, SearchBar, Select, Icon, EmptyState, SegmentedTabs, Toggle } from "@/components/ui";
import { SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useWallet, useTopUpWallet } from "@/modules/shared/api/wallet";
import {
  useOrderFoodDishes,
  useOrderFoodCategories,
  useOrderFoodSettings,
  usePlaceOrder,
  useMyOrders,
  useCancelOrder,
  type OrderStatus,
  type OrderSummary,
} from "@/modules/shared/api/canteenOrdering";

interface CartLine {
  dish_id: number;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
  is_parcel: boolean;
  parcel_available: boolean;
}

type PaymentMethod = "wallet" | "razorpay";

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Standard veg/non-veg mark — green square+dot for veg, red for non-veg. */
function VegIndicator({ isVeg }: { isVeg: boolean }) {
  const color = isVeg ? "border-green-600" : "border-red-600";
  const dot = isVeg ? "bg-green-600" : "bg-red-600";
  return (
    <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border ${color}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
    </span>
  );
}

/** Just Paid → Ready now (then "Received" is the terminal badge state, shown separately, not a tracker step — matches the simplified cashier flow: no Accepted/Preparing steps). */
const STATUS_STEPS: OrderStatus[] = ["placed", "ready"];
const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Paid",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  collected: "Received",
  cancelled: "Cancelled",
};

/** One row per order, collapsed by default — token/status/time/total up front, dish-level detail (name/qty/unit price/line amount) plus the progress tracker only once expanded. */
function TodayOrderRow({ order, onCancel, cancelling }: { order: OrderSummary; onCancel: () => void; cancelling: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const canCancel = order.status === "placed" || order.status === "accepted";
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Card className="flex flex-col gap-0 p-0">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[11px] font-bold text-muted">Token</div>
            <div className="text-[18px] font-extrabold tracking-[.04em] text-primary">{order.pickup_token}</div>
          </div>
          <div className="text-[12.5px] text-muted">
            {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
            {new Date(order.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={order.status === "cancelled" ? "danger" : "accent"}>{STATUS_LABEL[order.status]}</Badge>
          <span className="text-[15px] font-extrabold text-ink">{money(order.total_amount)}</span>
          <Icon name={expanded ? "expand_less" : "expand_more"} size={20} className="text-muted" />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-border-default p-4">
          {order.status !== "cancelled" && (
            <div className="flex items-center">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                        i <= stepIndex ? "bg-primary text-white" : "bg-divider text-muted"
                      }`}
                    >
                      {i < stepIndex ? <Icon name="check" size={14} /> : i + 1}
                    </div>
                    <span className="text-[10.5px] font-semibold text-muted">{STATUS_LABEL[step]}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`mx-1 h-[2px] flex-1 ${i < stepIndex ? "bg-primary" : "bg-divider"}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col divide-y divide-border-default">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="text-ink">
                  {item.name}
                  {item.is_parcel && <span className="text-subtle"> (parcel)</span>}
                </span>
                <span className="text-muted">x{item.quantity}</span>
                <span className="w-20 text-right font-semibold text-ink">{money(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border-default pt-3">
            <span className="text-[13px] font-bold text-ink">Total</span>
            <span className="text-[16px] font-extrabold text-ink">{money(order.total_amount)}</span>
          </div>

          {canCancel && (
            <Button variant="secondary" loading={cancelling} onClick={onCancel}>
              Cancel Order
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function OrderFoodPage() {
  const [tab, setTab] = useState<"menu" | "cart" | "orders">("menu");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: categories } = useOrderFoodCategories();
  const { data: dishes, isLoading } = useOrderFoodDishes(categoryId, search || undefined);
  const { data: wallet } = useWallet();
  const { data: settings } = useOrderFoodSettings();
  const { data: myOrders } = useMyOrders();
  const placeOrder = usePlaceOrder();
  const cancelOrder = useCancelOrder();
  const topUp = useTopUpWallet();
  const { session } = useAuth();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wallet");

  const gstPercentage = settings?.gst_percentage ?? 0;
  const parcelCharge = settings?.parcel_charge ?? 0;
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const parcelTotal = cart.reduce((sum, l) => (l.is_parcel ? sum + parcelCharge * l.quantity : sum), 0);
    const gstAmount = Math.round(subtotal * (gstPercentage / 100) * 100) / 100;
    const total = Math.round((subtotal + parcelTotal + gstAmount) * 100) / 100;
    return { subtotal, parcelTotal, gstAmount, total };
  }, [cart, gstPercentage, parcelCharge]);
  const cartCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);
  const walletBalance = wallet?.balance ?? 0;
  const walletSufficient = walletBalance >= totals.total;
  const paying = placeOrder.isPending || topUp.isPending;

  function addToCart(dish: { id: number; name: string; price: number; is_veg: boolean; parcel_available: boolean }) {
    setCart((prev) => {
      const existing = prev.find((l) => l.dish_id === dish.id);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { dish_id: dish.id, name: dish.name, price: dish.price, quantity: 1, is_veg: dish.is_veg, is_parcel: false, parcel_available: dish.parcel_available }];
    });
  }

  function updateQuantity(dishId: number, delta: number) {
    setCart((prev) => prev.map((l) => (l.dish_id === dishId ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0));
  }

  function toggleParcel(dishId: number) {
    setCart((prev) => prev.map((l) => (l.dish_id === dishId ? { ...l, is_parcel: !l.is_parcel } : l)));
  }

  async function completeOrder() {
    const result = await placeOrder.mutateAsync(cart.map((l) => ({ dish_id: l.dish_id, quantity: l.quantity, is_parcel: l.is_parcel })));
    setSuccessBanner(`Order placed — pickup token ${result.pickup_token}. Show this at the counter.`);
    setCart([]);
    setTab("orders");
  }

  async function handlePayWithWallet() {
    setOrderError(null);
    try {
      await completeOrder();
    } catch (err) {
      setOrderError(err instanceof ApiError ? err.message : "Could not place the order. Please try again.");
    }
  }

  /** Same proven Razorpay Checkout flow as wallet top-up: credit the exact amount, then spend it placing the order. */
  async function handlePayWithRazorpay() {
    setOrderError(null);
    try {
      await topUp.mutateAsync({ amount: totals.total, email: session?.user.email });
    } catch (err) {
      if (err instanceof Error && err.message === "Payment cancelled") {
        setOrderError("Payment cancelled.");
        return;
      }
      setOrderError(err instanceof ApiError ? err.message : "Payment failed. Please try again.");
      return;
    }
    try {
      await completeOrder();
    } catch (err) {
      setOrderError(
        `Payment received — ${money(totals.total)} was added to your wallet, but the order couldn't be placed (${
          err instanceof ApiError ? err.message : "please try again"
        }). Your balance is safe, just retry from the Menu.`,
      );
    }
  }

  function handleConfirmPayment() {
    if (paymentMethod === "wallet") void handlePayWithWallet();
    else void handlePayWithRazorpay();
  }

  async function handleCancel(orderId: number) {
    setCancellingId(orderId);
    try {
      await cancelOrder.mutateAsync(orderId);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Craveo</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted">Order from the canteen and pick it up when ready.</p>
        </div>
        <SegmentedTabs
          options={[
            { key: "menu", label: "Menu" },
            { key: "cart", label: "Cart", badge: cartCount },
            { key: "orders", label: "My Orders" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {successBanner && (
        <div className="rounded-[10px] border border-border-accent bg-accent-50 px-4 py-2.5 text-[13px] font-semibold text-primary-dark">{successBanner}</div>
      )}

      {tab === "menu" ? (
        <div className="flex flex-col gap-4">
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {dishes.map((dish) => {
                const inCart = cart.find((l) => l.dish_id === dish.id);
                const outOfStock = !dish.is_available || dish.stock_quantity <= 0;
                return (
                  <div key={dish.id} className="flex flex-col gap-2 rounded-card border border-border-default bg-surface p-3">
                    <div className="flex h-20 items-center justify-center overflow-hidden rounded-[10px] bg-surface-input">
                      {dish.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- storage domain isn't in next.config's image allowlist, same pattern as ProfilePhoto
                        <img src={dish.image_url} alt={dish.name} className="size-full object-cover" />
                      ) : (
                        <Icon name="restaurant" size={26} className="text-subtle" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <VegIndicator isVeg={dish.is_veg} />
                      <span className="truncate text-[13px] font-bold text-ink">{dish.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13.5px] font-extrabold text-ink">{money(dish.price)}</span>
                      {outOfStock && <Badge tone="danger">Out of stock</Badge>}
                    </div>
                    {outOfStock ? (
                      <Button variant="secondary" disabled className="py-1.5 text-[12px]">
                        Unavailable
                      </Button>
                    ) : inCart ? (
                      <div className="flex items-center justify-between rounded-[8px] border border-border-accent">
                        <button type="button" className="px-3 py-1.5 text-primary" onClick={() => updateQuantity(dish.id, -1)}>
                          <Icon name="remove" size={14} />
                        </button>
                        <span className="text-[13px] font-bold text-ink">{inCart.quantity}</span>
                        <button type="button" className="px-3 py-1.5 text-primary" onClick={() => updateQuantity(dish.id, 1)}>
                          <Icon name="add" size={14} />
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="primarySmall"
                        className="py-1.5 text-[12px]"
                        onClick={() => addToCart({ id: dish.id, name: dish.name, price: dish.price, is_veg: dish.is_veg, parcel_available: dish.parcel_available })}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === "cart" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          <Card className="flex h-fit flex-col gap-4">
            <h2 className="text-[16px] font-bold text-ink">Cart</h2>
            {cart.length === 0 ? (
              <EmptyState message="Cart is empty — add a dish from the Menu tab." />
            ) : (
              <div className="flex flex-col gap-3 divide-y divide-border-default">
                {cart.map((line) => (
                  <div key={line.dish_id} className="flex flex-col gap-2 pt-3 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                        <VegIndicator isVeg={line.is_veg} />
                        {line.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button type="button" className="text-primary disabled:opacity-40" disabled={paying} onClick={() => updateQuantity(line.dish_id, -1)}>
                            <Icon name="remove" size={14} />
                          </button>
                          <span className="w-4 text-center text-[13px] font-bold text-ink">{line.quantity}</span>
                          <button type="button" className="text-primary disabled:opacity-40" disabled={paying} onClick={() => updateQuantity(line.dish_id, 1)}>
                            <Icon name="add" size={14} />
                          </button>
                        </div>
                        <span className="w-16 text-right text-[13px] font-bold text-ink">{money(line.price * line.quantity)}</span>
                      </div>
                    </div>
                    {line.parcel_available ? (
                      <div className="flex items-center gap-2">
                        <Toggle checked={line.is_parcel} disabled={paying} onChange={() => toggleParcel(line.dish_id)} />
                        <span className="text-[11.5px] font-semibold text-muted">Parcel (+{money(parcelCharge)}/item)</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-subtle">Not available as parcel</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex h-fit flex-col gap-4 lg:sticky lg:top-5">
            <div className="flex flex-col gap-1.5 text-[13px]">
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
              <div className="flex justify-between border-t border-border-default pt-1.5 text-[16px] font-extrabold text-ink">
                <span>Total</span>
                <span>{money(totals.total)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-border-default pt-3.5">
              <span className="text-[12.5px] font-bold text-muted">Payment method</span>
              <button
                type="button"
                disabled={!walletSufficient || paying}
                onClick={() => setPaymentMethod("wallet")}
                className={`flex items-center justify-between rounded-[10px] border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  paymentMethod === "wallet" ? "border-primary bg-accent-50" : "border-border-default"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name="account_balance_wallet" size={20} className="text-primary" />
                  <div>
                    <div className="text-[13.5px] font-bold text-ink">Wallet</div>
                    <div className="text-[12px] text-muted">Balance {money(walletBalance)}</div>
                  </div>
                </div>
                {!walletSufficient && <span className="text-[11.5px] font-semibold text-danger-fg">Insufficient</span>}
              </button>

              <button
                type="button"
                disabled={paying}
                onClick={() => setPaymentMethod("razorpay")}
                className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  paymentMethod === "razorpay" ? "border-primary bg-accent-50" : "border-border-default"
                }`}
              >
                <Icon name="qr_code_2" size={20} className="text-primary" />
                <div>
                  <div className="text-[13.5px] font-bold text-ink">Pay via Razorpay</div>
                  <div className="text-[12px] text-muted">UPI, cards or netbanking — secure checkout</div>
                </div>
              </button>
            </div>

            {orderError && <p className="text-[12.5px] font-semibold text-danger-fg">{orderError}</p>}

            <Button
              variant="primary"
              disabled={cart.length === 0 || (paymentMethod === "wallet" && !walletSufficient)}
              loading={paying}
              onClick={handleConfirmPayment}
            >
              {paymentMethod === "wallet" ? "Place Order" : "Pay"} · {money(totals.total)}
            </Button>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-[16px] font-bold text-ink">Today&apos;s Orders</h2>
          {!myOrders || myOrders.length === 0 ? (
            <Card>
              <EmptyState message="No orders placed today yet." />
            </Card>
          ) : (
            myOrders.map((order) => (
              <TodayOrderRow key={order.id} order={order} onCancel={() => handleCancel(order.id)} cancelling={cancellingId === order.id} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
