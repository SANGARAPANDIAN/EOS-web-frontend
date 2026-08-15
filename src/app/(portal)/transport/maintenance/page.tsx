"use client";

import { useState } from "react";
import { Card, Badge, Button, EmptyState, Input, Select, DataTable, type DataTableColumn, type BadgeTone } from "@/components/ui";
import { useMaintenance, useCreateServiceLogEntry, type ServiceLogEntry, type ServiceDueEntry } from "@/modules/transport/api/maintenance";
import { useBuses } from "@/modules/transport/api/buses";
import { formatDisplayDate } from "@/lib/utils/date";

const DUE_TONE: Record<string, BadgeTone> = { due: "danger", soon: "accentDark" };
const DUE_LABEL: Record<string, string> = { due: "Due", soon: "Soon" };

/** Hover lift matching the design reference — applied consistently across the transport module. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

const LOG_COLUMNS: DataTableColumn<ServiceLogEntry>[] = [
  { key: "date", header: "Date", width: "0.9fr", render: (r) => formatDisplayDate(r.service_date) },
  { key: "bus", header: "Bus", width: "0.8fr", render: (r) => <span className="font-mono">{r.bus_no}</span> },
  { key: "work", header: "Work carried out", width: "1.6fr", render: (r) => r.work_description },
  { key: "garage", header: "Garage", width: "1fr", render: (r) => r.garage ?? "—" },
  {
    key: "cost",
    header: "Cost",
    width: "0.8fr",
    align: "right",
    render: (r) => (r.cost != null ? <span className="font-bold">₹{r.cost.toLocaleString("en-IN")}</span> : "—"),
  },
];

export default function TransportMaintenancePage() {
  const maintenance = useMaintenance();
  const buses = useBuses();
  const createEntry = useCreateServiceLogEntry();

  const [showForm, setShowForm] = useState(false);
  const [busId, setBusId] = useState<string>("");
  const [work, setWork] = useState("");
  const [garage, setGarage] = useState("");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");

  const data = maintenance.data;
  const busOptions = buses.data?.buses ?? [];

  function resetForm() {
    setBusId("");
    setWork("");
    setGarage("");
    setCost("");
    setOdometer("");
    setShowForm(false);
  }

  function submit() {
    if (!busId || !work.trim()) return;
    createEntry.mutate(
      {
        bus_id: Number(busId),
        work_description: work.trim(),
        garage: garage.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        odometer_km: odometer ? Number(odometer) : undefined,
      },
      { onSuccess: resetForm },
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Maintenance</h1>
        <p className="mt-1 text-[13px] text-muted">Service history and upcoming work.</p>
      </div>

      {!data?.extended.fleet_status && data && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Odometer and next-service tracking aren't set up yet, so "Service due" can't be computed.
        </div>
      )}

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 items-start">
        <Card className={HOVERABLE}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold text-ink">Service & repair log</h2>
            <Button variant="primarySmall" onClick={() => setShowForm((v) => !v)} disabled={!data?.extended.service_log}>
              Log service
            </Button>
          </div>

          {!data?.extended.service_log && !maintenance.isLoading && (
            <p className="mb-3 text-[12px] text-subtle">Service log table not set up yet — see setup notes below.</p>
          )}

          {showForm && (
            <div className="mb-4 flex flex-col gap-2 rounded-[11px] border border-border-default p-3">
              <Select value={busId} onChange={(e) => setBusId(e.target.value)}>
                <option value="">Select bus</option>
                {busOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bus_no} · {b.vehicle_number}
                  </option>
                ))}
              </Select>
              <Input placeholder="Work carried out" value={work} onChange={(e) => setWork(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Garage" value={garage} onChange={(e) => setGarage(e.target.value)} />
                <Input placeholder="Odometer (km)" type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
                <Input placeholder="Cost (₹)" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" className="w-auto" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primarySmall" onClick={submit} disabled={createEntry.isPending}>
                  Save
                </Button>
              </div>
            </div>
          )}

          <DataTable
            columns={LOG_COLUMNS}
            data={data?.service_log ?? []}
            rowKey={(r) => r.id}
            emptyMessage={maintenance.isLoading ? "Loading…" : "No service entries logged yet."}
            hoverableRows
          />
        </Card>

        <Card className={HOVERABLE}>
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Service due</h2>
          {maintenance.isLoading ? (
            <EmptyState message="Loading…" />
          ) : !data || data.service_due.length === 0 ? (
            <EmptyState message={data?.extended.fleet_status ? "No buses due for service." : "Not tracked yet."} />
          ) : (
            <div className="flex flex-col gap-3">
              {data.service_due.map((entry: ServiceDueEntry) => (
                <div key={entry.bus_id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[13px] font-semibold text-ink">{entry.bus_no}</div>
                    <div className="text-[12px] text-muted">
                      Next service at {entry.next_service_due_km.toLocaleString("en-IN")} km ·{" "}
                      {entry.km_left <= 0
                        ? `overdue by ${Math.abs(entry.km_left).toLocaleString("en-IN")} km`
                        : `${entry.km_left.toLocaleString("en-IN")} km left`}
                    </div>
                  </div>
                  <Badge tone={DUE_TONE[entry.tag]}>{DUE_LABEL[entry.tag]}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
