"use client";

import { useMemo, useState } from "react";
import { Badge, Input, DataTable, EmptyState, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { usePharmacyStock, useDispenseStock, useRestockStock, type StockItem } from "@/modules/medical-centre/api/pharmacy";

const EXPIRY_CHIPS = [
  { key: "all", label: "All items" },
  { key: "low", label: "Below reorder" },
  { key: "2026", label: "Expiry in 2026" },
  { key: "2027", label: "Expiry in 2027" },
  { key: "noexp", label: "No expiry" },
];

function stockTone(item: StockItem): BadgeTone {
  if (item.qty === 0) return "danger";
  if (item.qty <= item.reorder) return "accentDark";
  return "accent";
}

function stockLabel(item: StockItem): string {
  if (item.qty === 0) return "Out of stock";
  if (item.qty <= item.reorder) return "Below reorder";
  return "In stock";
}

export default function PharmacyStockPage() {
  const stock = usePharmacyStock();
  const dispense = useDispenseStock();
  const restock = useRestockStock();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const data = stock.data ?? [];
  const lowCount = data.filter((s) => s.qty <= s.reorder).length;

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (query && !`${s.name} ${s.use} ${s.form}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === "low" && s.qty > s.reorder) return false;
      if (filter === "2026" && (!s.expiry || !s.expiry.startsWith("2026"))) return false;
      if (filter === "2027" && (!s.expiry || !s.expiry.startsWith("2027"))) return false;
      if (filter === "noexp" && s.expiry) return false;
      return true;
    });
  }, [data, query, filter]);

  const columns: DataTableColumn<StockItem>[] = [
    {
      key: "name",
      header: "Medicine",
      width: "1.6fr",
      render: (row) => (
        <div>
          <div className="font-bold text-ink">{row.name}</div>
          <div className="text-[12px] text-subtle">{row.use}</div>
        </div>
      ),
    },
    { key: "form", header: "Form", width: "1.2fr", render: (row) => <span className="text-body">{row.form}</span> },
    {
      key: "qty",
      header: "In stock",
      width: "1fr",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-ink">{row.qty}</span>
          <div className="mt-0.5">
            <Badge tone={stockTone(row)}>{stockLabel(row)}</Badge>
          </div>
        </div>
      ),
    },
    { key: "reorder", header: "Reorder at", width: "0.9fr", render: (row) => <span className="font-mono text-body">{row.reorder}</span> },
    { key: "expiry", header: "Expiry", width: "1fr", render: (row) => <span className="font-mono text-[12.5px] text-body">{row.expiry ?? "No expiry"}</span> },
    {
      key: "action",
      header: "Action",
      width: "1.5fr",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dispense.mutate({ id: row.id, quantity: 1 })}
            disabled={row.qty === 0 || dispense.isPending}
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
          >
            Dispense
          </button>
          <button
            type="button"
            onClick={() => restock.mutate({ id: row.id, quantity: 50 })}
            disabled={restock.isPending}
            className="text-[12.5px] font-bold text-subtle hover:text-ink"
          >
            Restock 50
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Pharmacy stock</h1>
        <p className="mt-1 text-[13px] text-muted">Counter held by Mr. P. Selvaraj · indent raised to the purchase office every Monday.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-border-default bg-surface p-[16px_18px]">
        <Input className="min-w-[220px] flex-1" placeholder="Search by name, use or form" value={query} onChange={(e) => setQuery(e.target.value)} />
        {EXPIRY_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`shrink-0 rounded-pill border px-3.5 py-2 text-[12.5px] font-bold ${
              filter === c.key ? "border-primary bg-accent-50 text-primary" : "border-border-default text-ink-soft"
            }`}
          >
            {c.label} {c.key === "low" ? `(${lowCount})` : ""}
          </button>
        ))}
      </div>

      {stock.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} emptyMessage="No medicines recorded yet." hoverableRows />
      )}
    </div>
  );
}
