"use client";

import { useRouter } from "next/navigation";
import { useStationeryProducts } from "@/modules/student/api/stationeryStore";
import { useCartEntries, buildCartLines } from "@/modules/student/lib/useStationeryCart";

/** Sticky bottom bar shown whenever the cart isn't empty — matches the mobile app's FloatingCartBar. */
export function StoreCartBar() {
  const router = useRouter();
  const products = useStationeryProducts();
  const cart = useCartEntries();

  const lines = buildCartLines(cart.entries, products.data ?? []);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  if (itemCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 mt-2 flex items-center justify-between gap-4 rounded-2xl bg-primary-dark px-6 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.25)]">
      <div>
        <p className="text-[11px] text-white/80">
          {itemCount} {itemCount === 1 ? "item" : "items"} in cart
        </p>
        <p className="text-[15px] font-bold text-white">₹{total} payable</p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/student/stationery-store/cart")}
        className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-bold text-primary"
      >
        View cart →
      </button>
    </div>
  );
}
