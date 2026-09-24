"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { Card, EmptyState, Icon } from "@/components/ui";
import { useStationeryProducts, categoryName, type StationeryCategory } from "@/modules/student/api/stationeryStore";
import { useCartEntries } from "@/modules/student/lib/useStationeryCart";
import { ProductTile } from "@/modules/student/components/stationery-store/ProductTile";
import { StoreCartBar } from "@/modules/student/components/stationery-store/StoreCartBar";
import { ApiError } from "@/types/api";

type SortKey = "popular" | "low-high" | "high-low";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "low-high", label: "Price: Low-High" },
  { key: "high-low", label: "Price: High-Low" },
];

export default function StationeryCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const category = id as StationeryCategory;

  const products = useStationeryProducts({ category });
  const cart = useCartEntries();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [inStockOnly, setInStockOnly] = useState(false);

  const visible = useMemo(() => {
    let rows = products.data ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (inStockOnly) rows = rows.filter((p) => p.stock_quantity > 0);
    if (sort === "low-high") rows = [...rows].sort((a, b) => a.price - b.price);
    if (sort === "high-low") rows = [...rows].sort((a, b) => b.price - a.price);
    return rows;
  }, [products.data, search, inStockOnly, sort]);

  return (
    <div className="flex flex-col gap-5 pb-20 animate-pop-in">
      <div className="flex items-center gap-3">
        <Link href="/student/stationery-store" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default hover:bg-nav-hover">
          <Icon name="arrow_back" size={18} />
        </Link>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{categoryName(category)}</h1>
          <p className="text-[12.5px] text-muted">
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search in this category…"
          className="max-w-xs flex-1 rounded-input border border-border-default bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
        />
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`rounded-pill border px-3.5 py-1.5 text-[12px] font-semibold ${
              sort === opt.key ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-body"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setInStockOnly((v) => !v)}
          className={`rounded-pill border px-3.5 py-1.5 text-[12px] font-semibold ${
            inStockOnly ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-body"
          }`}
        >
          In stock only
        </button>
      </div>

      {products.isLoading ? (
        <Card>
          <EmptyState loading />
        </Card>
      ) : products.error ? (
        <Card>
          <EmptyState message={products.error instanceof ApiError ? products.error.message : "Couldn't load this category."} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState message="No products match your filters" />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((p) => (
            <ProductTile key={p.id} product={p} quantity={cart.quantityOf(p.id)} onAdd={() => cart.addOne(p.id)} onRemove={() => cart.removeOne(p.id)} />
          ))}
        </div>
      )}

      <StoreCartBar />
    </div>
  );
}
