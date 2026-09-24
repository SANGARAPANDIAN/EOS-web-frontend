"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, EmptyState, Icon, ConfirmDialog } from "@/components/ui";
import { useState } from "react";
import { useStationeryProducts } from "@/modules/student/api/stationeryStore";
import { useCartEntries, buildCartLines } from "@/modules/student/lib/useStationeryCart";
import { ApiError } from "@/types/api";

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function StationeryCartPage() {
  const router = useRouter();
  const products = useStationeryProducts();
  const cart = useCartEntries();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const lines = buildCartLines(cart.entries, products.data ?? []);
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center gap-3">
        <Link href="/student/stationery-store" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default hover:bg-nav-hover">
          <Icon name="arrow_back" size={18} />
        </Link>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">Cart</h1>
          <p className="text-[12.5px] text-muted">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {products.isLoading ? (
        <Card>
          <EmptyState loading />
        </Card>
      ) : products.error ? (
        <Card>
          <EmptyState message={products.error instanceof ApiError ? products.error.message : "Couldn't load your cart."} />
        </Card>
      ) : lines.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Icon name="shopping_cart" size={32} className="text-subtle" />
          <p className="text-sm font-semibold text-body">Your cart is empty</p>
          <Link href="/student/stationery-store" className="rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-dark">
            Browse Stationery
          </Link>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {lines.map((line) => (
              <Card key={line.product.id} className="flex items-center gap-3 p-3">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-tint">
                  {line.product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.product.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-subtle">{initialsFromName(line.product.name)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{line.product.name}</p>
                  <p className="text-[11px] text-subtle">₹{line.product.price} each</p>
                </div>
                <div className="flex items-center gap-2 rounded-[9px] bg-surface-tint px-1.5 py-1">
                  <button type="button" onClick={() => cart.removeOne(line.product.id)} className="text-primary">
                    <Icon name="remove" size={14} />
                  </button>
                  <span className="text-xs font-bold text-ink">{line.quantity}</span>
                  <button type="button" onClick={() => cart.addOne(line.product.id)} className="text-primary">
                    <Icon name="add" size={14} />
                  </button>
                </div>
                <span className="min-w-[48px] text-right text-[13.5px] font-bold text-ink">₹{line.product.price * line.quantity}</span>
                <button type="button" onClick={() => cart.removeLine(line.product.id)} className="text-subtle hover:text-danger-fg">
                  <Icon name="close" size={16} />
                </button>
              </Card>
            ))}
          </div>

          <button type="button" onClick={() => setClearConfirmOpen(true)} className="w-fit text-[12.5px] font-semibold text-danger-fg hover:underline">
            Clear cart
          </button>

          <Card className="flex flex-col gap-2">
            <div className="flex justify-between text-sm text-body">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="h-px bg-divider" />
            <div className="flex justify-between text-[17px] font-bold text-ink">
              <span>Payable</span>
              <span>₹{subtotal}</span>
            </div>
          </Card>

          <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-border-default bg-surface px-5 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
            <div>
              <p className="text-[11px] text-subtle">Payable</p>
              <p className="text-[19px] font-bold text-ink">₹{subtotal}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/student/stationery-store/payment")}
              className="rounded-xl bg-primary px-6 py-3 text-[14px] font-bold text-white hover:bg-primary-dark"
            >
              Proceed to pay →
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear cart"
        description="Remove all items from your cart?"
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          cart.clear();
          setClearConfirmOpen(false);
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
}
