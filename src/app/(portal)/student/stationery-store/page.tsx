"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, EmptyState, Icon, SearchBar } from "@/components/ui";
import { useStationeryProducts, STATIONERY_CATEGORIES } from "@/modules/student/api/stationeryStore";
import { useCartEntries } from "@/modules/student/lib/useStationeryCart";
import { ProductTile } from "@/modules/student/components/stationery-store/ProductTile";
import { StoreCartBar } from "@/modules/student/components/stationery-store/StoreCartBar";
import { ApiError } from "@/types/api";

// Same 5 fixed categories as the mobile app (see mobile's categories.ts) -
// no backend "categories" endpoint, stable enough to hardcode.
export default function StationeryStoreHomePage() {
  const products = useStationeryProducts();
  const cart = useCartEntries();
  const [search, setSearch] = useState("");

  const isSearching = search.trim().length > 0;
  const rows = products.data ?? [];

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((p) => p.name.toLowerCase().includes(q));
  }, [isSearching, search, rows]);

  const productsByCategory = useMemo(
    () => STATIONERY_CATEGORIES.map((cat) => ({ ...cat, items: rows.filter((p) => p.category === cat.id) })).filter((c) => c.items.length > 0),
    [rows],
  );

  return (
    <div className="flex flex-col gap-5 pb-20 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Stationery Store</h1>
          <p className="mt-1 text-[13.5px] text-muted">Notebooks, snacks, hostel & college essentials</p>
        </div>
        <Link href="/student/stationery-store/orders" className="flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline">
          <Icon name="receipt_long" size={16} />
          My orders
        </Link>
      </div>

      <SearchBar placeholder="Search notebooks, snacks, essentials…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {products.isLoading ? (
        <Card>
          <EmptyState loading />
        </Card>
      ) : products.error ? (
        <Card>
          <EmptyState message={products.error instanceof ApiError ? products.error.message : "Couldn't load the Stationery Store."} />
        </Card>
      ) : isSearching ? (
        searchResults.length === 0 ? (
          <Card>
            <EmptyState message={`No products found for "${search}"`} />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {searchResults.map((p) => (
              <ProductTile key={p.id} product={p} quantity={cart.quantityOf(p.id)} onAdd={() => cart.addOne(p.id)} onRemove={() => cart.removeOne(p.id)} />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-7">
          {productsByCategory.map((cat) => (
            <div key={cat.id}>
              <div className="mb-3 flex items-baseline gap-2">
                <Icon name={cat.icon} size={18} className="text-primary" />
                <h2 className="text-[15px] font-bold text-ink">{cat.name}</h2>
                <span className="text-xs text-subtle">{cat.items.length} items</span>
                <span className="flex-1" />
                <Link href={`/student/stationery-store/category/${cat.id}`} className="text-xs font-bold text-primary hover:underline">
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {cat.items.slice(0, 5).map((p) => (
                  <ProductTile key={p.id} product={p} quantity={cart.quantityOf(p.id)} onAdd={() => cart.addOne(p.id)} onRemove={() => cart.removeOne(p.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <StoreCartBar />
    </div>
  );
}
