import { useCallback, useEffect, useState } from "react";
import type { StationeryProduct } from "@/modules/student/api/stationeryStore";

// Client-only cart, persisted to localStorage (not a server-side cart table
// — matches the mobile app's own StationeryCartContext, which is also
// purely local/on-device). Stores only {product_id, quantity} — never a
// cached price — and is always hydrated against a freshly-fetched product
// list before checkout, so a stale/changed price never reaches Razorpay
// (the backend recomputes and trusts only its own copy anyway, but this
// keeps what the student sees honest too).

const STORAGE_KEY = "eos_stationery_cart_v1";
const CHANGE_EVENT = "eos-stationery-cart-changed";

type CartEntry = { product_id: number; quantity: number };

function readEntries(): CartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CartEntry => typeof e?.product_id === "number" && typeof e?.quantity === "number" && e.quantity > 0,
    );
  } catch {
    return [];
  }
}

function writeEntries(entries: CartEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useCartEntries() {
  const [entries, setEntries] = useState<CartEntry[]>([]);

  useEffect(() => {
    setEntries(readEntries());
    const onChange = () => setEntries(readEntries());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    const current = readEntries().filter((e) => e.product_id !== productId);
    const next = quantity > 0 ? [...current, { product_id: productId, quantity }] : current;
    writeEntries(next);
  }, []);

  const addOne = useCallback((productId: number) => {
    const current = readEntries();
    const existing = current.find((e) => e.product_id === productId);
    setQuantity(productId, (existing?.quantity ?? 0) + 1);
  }, [setQuantity]);

  const removeOne = useCallback((productId: number) => {
    const current = readEntries();
    const existing = current.find((e) => e.product_id === productId);
    if (!existing) return;
    setQuantity(productId, existing.quantity - 1);
  }, [setQuantity]);

  const removeLine = useCallback((productId: number) => setQuantity(productId, 0), [setQuantity]);

  const clear = useCallback(() => writeEntries([]), []);

  const quantityOf = useCallback((productId: number) => entries.find((e) => e.product_id === productId)?.quantity ?? 0, [entries]);

  return { entries, setQuantity, addOne, removeOne, removeLine, clear, quantityOf };
}

export interface CartLine {
  product: StationeryProduct;
  quantity: number;
}

/** Combines the raw {product_id, quantity} entries with a freshly-fetched product list into full cart lines + totals. */
export function buildCartLines(entries: { product_id: number; quantity: number }[], products: StationeryProduct[]): CartLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return entries
    .map((e) => {
      const product = byId.get(e.product_id);
      return product ? { product, quantity: e.quantity } : null;
    })
    .filter((l): l is CartLine => l !== null);
}
