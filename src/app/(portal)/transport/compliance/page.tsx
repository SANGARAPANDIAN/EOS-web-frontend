"use client";

import { useState } from "react";
import { Card, Button, EmptyState, Input, DataTable, type DataTableColumn } from "@/components/ui";
import { useCompliance, useUpsertBusDocument, type ComplianceBus, type BusDocumentEntry, type BusDocType } from "@/modules/transport/api/compliance";
import { formatDisplayDate } from "@/lib/utils/date";

const STATE_DOT: Record<string, string> = {
  expired: "bg-danger-fg",
  due_soon: "bg-primary-dark",
  valid: "bg-subtle",
  missing: "bg-disabled",
};

const DOC_COLUMNS: { key: BusDocType; header: string }[] = [
  { key: "insurance", header: "Insurance" },
  { key: "fitness_certificate", header: "Fitness (FC)" },
  { key: "permit", header: "Permit" },
  { key: "pollution_certificate", header: "Pollution" },
  { key: "road_tax", header: "Road tax" },
];

interface EditTarget {
  bus_id: number;
  bus_no: string;
  doc_type: BusDocType;
  label: string;
  reference_no: string;
  valid_until: string;
}

export default function TransportCompliancePage() {
  const compliance = useCompliance();
  const upsert = useUpsertBusDocument();
  const [editing, setEditing] = useState<EditTarget | null>(null);

  const data = compliance.data;

  function openEditor(bus: ComplianceBus, doc: BusDocumentEntry) {
    setEditing({
      bus_id: bus.bus_id,
      bus_no: bus.bus_no,
      doc_type: doc.doc_type,
      label: doc.label,
      reference_no: doc.reference_no ?? "",
      valid_until: doc.valid_until ? doc.valid_until.slice(0, 10) : "",
    });
  }

  function submit() {
    if (!editing || !editing.valid_until) return;
    upsert.mutate(
      {
        bus_id: editing.bus_id,
        doc_type: editing.doc_type,
        reference_no: editing.reference_no.trim() || undefined,
        valid_until: editing.valid_until,
      },
      { onSuccess: () => setEditing(null) },
    );
  }

  const columns: DataTableColumn<ComplianceBus>[] = [
    {
      key: "bus",
      header: "Bus",
      width: "170px",
      render: (bus) => (
        <div>
          <div className="font-mono text-[13px] font-semibold text-ink">{bus.bus_no}</div>
          <div className="text-[11.5px] text-muted">{bus.vehicle_number}</div>
        </div>
      ),
    },
    ...DOC_COLUMNS.map(
      (col): DataTableColumn<ComplianceBus> => ({
        key: col.key,
        header: col.header,
        render: (bus) => {
          const doc = bus.documents.find((d) => d.doc_type === col.key);
          if (!doc) return "—";
          return (
            <button
              type="button"
              onClick={() => openEditor(bus, doc)}
              className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[13px] text-ink-soft hover:bg-nav-hover"
            >
              <span className={`size-2 shrink-0 rounded-full ${STATE_DOT[doc.state]}`} />
              {doc.valid_until ? formatDisplayDate(doc.valid_until) : "Add"}
            </button>
          );
        },
      }),
    ),
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Compliance</h1>
        <p className="mt-1 text-[13px] text-muted">Insurance, fitness, permit, pollution and road tax — click any cell to add or update it.</p>
      </div>

      {!data?.extended.documents && data && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          The compliance document table isn&apos;t set up yet.
        </div>
      )}

      <div className="flex items-center gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-danger-fg" /> Expired
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary-dark" /> Due within 45 days
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-subtle" /> Valid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-disabled" /> Not entered
        </span>
      </div>

      {editing && (
        <Card className="flex flex-col gap-2.5">
          <div className="text-[14px] font-bold text-ink">
            {editing.bus_no} · {editing.label}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              placeholder="Reference / policy no"
              value={editing.reference_no}
              onChange={(e) => setEditing({ ...editing, reference_no: e.target.value })}
            />
            <Input
              type="date"
              value={editing.valid_until}
              onChange={(e) => setEditing({ ...editing, valid_until: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="w-auto" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primarySmall" onClick={submit} disabled={upsert.isPending || !editing.valid_until}>
              Save
            </Button>
          </div>
        </Card>
      )}

      {compliance.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable
          columns={columns}
          data={data?.buses ?? []}
          rowKey={(bus) => bus.bus_id}
          emptyMessage="No buses in the register."
          hoverableRows
        />
      )}
    </div>
  );
}
