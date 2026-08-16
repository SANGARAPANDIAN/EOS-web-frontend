"use client";

import { useMemo, useState } from "react";
import { Badge, DataTable, EmptyState, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useEquipment, useToggleEquipmentCondition, type Equipment, type Condition } from "@/modules/medical-centre/api/equipment";

const CONDITION_TONE: Record<Condition, BadgeTone> = { Working: "accent", "Under service": "accentDark" };
type FilterKey = "all" | Condition;

export default function EquipmentRegisterPage() {
  const equipment = useEquipment();
  const toggle = useToggleEquipmentCondition();
  const [filter, setFilter] = useState<FilterKey>("all");

  const data = equipment.data ?? [];
  const totalUnits = data.reduce((sum, e) => sum + e.qty, 0);
  const underServiceCount = data.filter((e) => e.condition === "Under service").length;

  const rows = useMemo(() => (filter === "all" ? data : data.filter((e) => e.condition === filter)), [data, filter]);

  const columns: DataTableColumn<Equipment>[] = [
    { key: "name", header: "Equipment", width: "1.6fr", render: (row) => <span className="font-bold text-ink">{row.name}</span> },
    { key: "qty", header: "Qty", width: "0.6fr", render: (row) => <span className="font-mono text-body">{row.qty}</span> },
    { key: "place", header: "Location", width: "1.4fr", render: (row) => <span className="text-body">{row.place}</span> },
    { key: "condition", header: "Condition", width: "1fr", render: (row) => <Badge tone={CONDITION_TONE[row.condition]}>{row.condition}</Badge> },
    {
      key: "action",
      header: "Action",
      width: "1.2fr",
      align: "right",
      render: (row) => (
        <button type="button" onClick={() => toggle.mutate(row.id)} disabled={toggle.isPending} className="text-[13px] font-bold text-primary hover:underline">
          {row.condition === "Working" ? "Send for service" : "Mark working"}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Equipment register</h1>
        <p className="mt-1 text-[13px] text-muted">
          Quantity, location and working condition · {totalUnits} units across {data.length} equipment types.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-pill border px-4 py-2 text-[13px] font-bold ${filter === "all" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft"}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("Working")}
          className={`rounded-pill border px-4 py-2 text-[13px] font-bold ${filter === "Working" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft"}`}
        >
          Working
        </button>
        <button
          type="button"
          onClick={() => setFilter("Under service")}
          className={`rounded-pill border px-4 py-2 text-[13px] font-bold ${filter === "Under service" ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft"}`}
        >
          Under service ({underServiceCount})
        </button>
      </div>

      {equipment.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={rows} rowKey={(row) => row.id} emptyMessage="No equipment recorded yet." hoverableRows />
      )}
    </div>
  );
}
