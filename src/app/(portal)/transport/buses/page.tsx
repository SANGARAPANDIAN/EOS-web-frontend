"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Card, Badge, Button, Input, Select, Icon, EmptyState, SearchBar, ProgressBar, type BadgeTone } from "@/components/ui";
import { useBuses, useCreateBus, type BusStatus, type Bus, type CreateBusInput } from "@/modules/transport/api/buses";
import { useTransportDashboard } from "@/modules/transport/api/dashboard";
import { useRoutes } from "@/modules/transport/api/routes";
import { formatRelativeTime, formatTime12h } from "@/lib/utils/date";

const STATUS_LABEL: Record<BusStatus, string> = {
  on_route: "On route",
  at_campus: "At campus",
  in_depot: "In depot",
  maintenance: "Maintenance",
};

const STATUS_DOT: Record<BusStatus, string> = {
  on_route: "bg-primary",
  at_campus: "bg-primary-cta",
  in_depot: "bg-subtle",
  maintenance: "bg-primary-dark",
};

const STATUS_FILTERS: { key: BusStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on_route", label: "On route" },
  { key: "at_campus", label: "At campus" },
  { key: "in_depot", label: "In depot" },
  { key: "maintenance", label: "Maintenance" },
];

const DOC_TONE: Record<string, BadgeTone> = {
  expired: "danger",
  due_soon: "accentDark",
  valid: "neutral",
};

/** Hover lift matching the design reference — applied consistently across the transport module. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

function KpiCard({ label, value, sub, valueTone }: { label: string; value: string; sub: string; valueTone?: string }) {
  return (
    <div className={`rounded-card border border-border-default bg-surface p-[16px_18px] ${HOVERABLE}`}>
      <div className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <div className={`text-[26px] font-extrabold tracking-[-.02em] ${valueTone ?? "text-ink"}`}>{value}</div>
        <div className="text-[12px] font-semibold text-subtle">{sub}</div>
      </div>
    </div>
  );
}

function routeShortLabel(route: Bus["route"]): string {
  if (!route) return "No route";
  const match = route.name?.match(/^Route\s*\d+/i);
  return match ? match[0] : `Route ${route.id}`;
}

const ADD_FIELDS: { key: keyof CreateBusInput; label: string; placeholder: string; type?: string }[] = [
  { key: "bus_no", label: "Bus no", placeholder: "BUS-04" },
  { key: "vehicle_number", label: "Registration no", placeholder: "TN 45 AB 1213" },
  { key: "model", label: "Make & model", placeholder: "Ashok Leyland Lynx" },
  { key: "year_of_manufacture", label: "Year", placeholder: "2026", type: "number" },
  { key: "chassis_no", label: "Chassis no", placeholder: "MB1KB..." },
  { key: "engine_no", label: "Engine no", placeholder: "H26E..." },
  { key: "fuel_emission", label: "Fuel / emission", placeholder: "Diesel BS-VI" },
  { key: "capacity", label: "Seating capacity", placeholder: "60", type: "number" },
  { key: "driver_name", label: "Driver", placeholder: "Mr. ..." },
  { key: "driver_phone", label: "Driver phone", placeholder: "9xxxxxxxxx" },
  { key: "driver_licence_no", label: "Driver licence no", placeholder: "TN37 ..." },
  { key: "attendant_name", label: "Attendant", placeholder: "Mr. ..." },
  { key: "attendant_phone", label: "Attendant phone", placeholder: "9xxxxxxxxx" },
  { key: "insurance_valid_till", label: "Insurance valid till", placeholder: "", type: "date" },
  { key: "fc_valid_till", label: "FC valid till", placeholder: "", type: "date" },
  { key: "permit_valid_till", label: "Permit valid till", placeholder: "", type: "date" },
  { key: "gps_device_id", label: "GPS device id", placeholder: "TRK-1213" },
  { key: "parking_bay", label: "Parking bay", placeholder: "Depot bay 13" },
];

function AddVehicleModal({ onClose }: { onClose: () => void }) {
  const routes = useRoutes();
  const createBus = useCreateBus();
  const [form, setForm] = useState<Record<string, string>>({});
  const [routeId, setRouteId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.bus_no?.trim() || !form.vehicle_number?.trim()) {
      setError("Bus no and registration no are required.");
      return;
    }
    const payload: Record<string, unknown> = { bus_no: form.bus_no.trim(), vehicle_number: form.vehicle_number.trim() };
    for (const field of ADD_FIELDS) {
      if (field.key === "bus_no" || field.key === "vehicle_number") continue;
      const raw = form[field.key];
      if (!raw) continue;
      payload[field.key] = field.type === "number" ? Number(raw) : raw;
    }
    if (routeId) payload.route_id = Number(routeId);

    createBus.mutate(payload as unknown as CreateBusInput, {
      onSuccess: onClose,
      onError: (err: unknown) => {
        const message = (err as { response?: { message?: string } })?.response?.message ?? "Could not add this vehicle.";
        setError(message);
      },
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[820px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add vehicle to register</div>
            <div className="mt-0.5 text-[13px] text-muted">Transport office · new fleet record</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 px-[26px] py-[24px]">
          {ADD_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">{field.label}</label>
              <Input
                className="mt-1.5"
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={form[field.key] ?? ""}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Route</label>
            <Select className="mt-1.5" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">Unassigned</option>
              {routes.data?.routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <div className="px-[26px] pb-2 text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createBus.isPending}>
            Save record
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function TransportBusesPage() {
  const [statusFilter, setStatusFilter] = useState<BusStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const buses = useBuses({ status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined });
  const dashboard = useTransportDashboard("today");

  const data = buses.data;
  const extended = data?.extended;
  const d = dashboard.data;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Buses</h1>
          <p className="mt-1 text-[13px] text-muted">Every vehicle in the college register.</p>
        </div>
        <Button variant="primarySmall" className="mt-1.5" onClick={() => setShowAddModal(true)}>
          + Add vehicle
        </Button>
      </div>

      {showAddModal && <AddVehicleModal onClose={() => setShowAddModal(false)} />}

      <div className="grid grid-cols-6 gap-3.5">
        <KpiCard label="Buses" value={dashboard.isLoading ? "—" : String(d?.fleet.total_buses ?? 0)} sub="in register" />
        <KpiCard label="On route now" value={dashboard.isLoading ? "—" : String(d?.fleet.buses_on_route ?? 0)} sub="morning shift" />
        <KpiCard
          label="Students ferried"
          value={dashboard.isLoading ? "—" : String(d?.ridership.students_on_transport ?? 0)}
          sub={d?.ridership.total_capacity != null ? `of ${d.ridership.total_capacity} seats` : "capacity not tracked"}
        />
        <KpiCard
          label="Avg occupancy"
          value={dashboard.isLoading ? "—" : d?.ridership.occupancy_percent != null ? `${d.ridership.occupancy_percent}%` : "—"}
          sub="fleet wide"
        />
        <KpiCard
          label="Docs to renew"
          value={dashboard.isLoading ? "—" : String(d?.renewals.documents_due ?? 0)}
          sub="within 45 days"
          valueTone={d && d.renewals.documents_due > 0 ? "text-primary-dark" : undefined}
        />
        <KpiCard
          label="Service due"
          value={dashboard.isLoading ? "—" : String(d?.renewals.service_due ?? 0)}
          sub="by odometer"
          valueTone={d && d.renewals.service_due > 0 ? "text-primary-dark" : undefined}
        />
      </div>

      <Card className="flex flex-wrap items-center gap-3.5">
        <SearchBar
          placeholder="Search bus number, route or driver name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => {
            const active = statusFilter === option.key;
            const count =
              option.key === "all" ? data?.meta.total : extended?.fleet_status ? data?.status_counts?.[option.key] : undefined;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setStatusFilter(option.key)}
                className={`rounded-pill border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                  active ? "border-border-accent bg-accent-50 text-primary-dark" : "border-border-default bg-surface text-body"
                }`}
              >
                {option.label}
                {count !== undefined && <span className="ml-1.5 text-subtle">{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-[13px] font-semibold text-muted whitespace-nowrap">
          {data ? `${data.meta.filtered} of ${data.meta.total} buses` : "—"}
        </div>
      </Card>

      {!extended?.specs && data && (
        <div className="rounded-[11px] border border-border-default bg-surface-tint px-4 py-3 text-[12.5px] text-muted">
          Model, route distance and boarding-area/time-window aren&apos;t tracked yet — those fields show &quot;—&quot; below.
        </div>
      )}

      {buses.isLoading ? (
        <EmptyState message="Loading…" />
      ) : !data || data.buses.length === 0 ? (
        <EmptyState message="No buses match this search." />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(420px,1fr))] gap-4">
          {data.buses.map((bus, i) => {
            const occupancyPercent = bus.capacity ? Math.round((bus.ridership.count / bus.capacity) * 100) : 0;
            const serviceOverdue = bus.odometer_km != null && bus.next_service_due_km != null && bus.odometer_km >= bus.next_service_due_km;

            return (
              <Link key={bus.id} href={`/transport/buses/${bus.id}`} className="block no-underline">
              <Card className={`flex flex-col gap-3.5 cursor-pointer ${HOVERABLE}`}>
                <div className="flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-pill border border-border-accent text-[12px] font-extrabold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[12px] bg-icon-chip">
                    <Icon name="directions_bus" size={22} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[17px] font-semibold text-ink">{bus.vehicle_number}</div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {routeShortLabel(bus.route)}
                      {bus.route && (
                        <>
                          {" "}
                          · {bus.route.stops_count} stops
                          {bus.route.distance_km != null && ` · ${bus.route.distance_km.toFixed(1)} km`}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone="neutral">
                      {bus.ridership.seats_free != null ? `${bus.ridership.seats_free} seats free` : "Capacity not set"}
                    </Badge>
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-body">
                      <span className={`size-1.5 rounded-full ${bus.status ? STATUS_DOT[bus.status] : "bg-disabled"}`} />
                      {bus.status ? STATUS_LABEL[bus.status] : "Not tracked"}
                    </span>
                  </div>
                </div>

                {bus.route && (
                  <div className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
                    <span>{bus.route.boarding_area ?? bus.route.name}</span>
                    <Icon name="arrow_forward" size={15} className="text-subtle" />
                    <span>College campus</span>
                    {bus.route.departure_time && bus.route.arrival_time && (
                      <span className="ml-auto font-mono text-[12px] font-normal text-muted">
                        {formatTime12h(bus.route.departure_time.slice(0, 5))} – {formatTime12h(bus.route.arrival_time.slice(0, 5))}
                      </span>
                    )}
                  </div>
                )}

                <div className="h-px bg-divider" />

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Occupancy</div>
                    <div className="mt-1 text-[15px] font-bold text-ink">
                      {bus.capacity != null ? `${bus.ridership.count}/${bus.capacity}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Distance</div>
                    <div className="mt-1 text-[15px] font-bold text-ink">
                      {bus.route?.distance_km != null ? `${bus.route.distance_km.toFixed(1)} km` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Model</div>
                    <div className="mt-1 truncate text-[13px] font-semibold text-ink-soft">{bus.model ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-subtle">Driver</div>
                    <div className="mt-1 truncate text-[13px] font-semibold text-ink-soft">{bus.driver_name ?? "Unassigned"}</div>
                  </div>
                </div>

                {bus.capacity != null && <ProgressBar percent={occupancyPercent} height={6} />}

                <div className="flex flex-wrap items-center gap-2">
                  {bus.document && (
                    <Badge tone={DOC_TONE[bus.document.state]}>
                      {bus.document.state === "expired" ? "Document expired" : bus.document.state === "due_soon" ? "Document renewal due" : "Documents in order"}
                    </Badge>
                  )}
                  {bus.service_due && <Badge tone={serviceOverdue ? "danger" : "accentDark"}>{serviceOverdue ? "Service overdue" : "Service due soon"}</Badge>}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px] font-bold ${
                      bus.gps.online ? "bg-accent-50 text-primary" : "bg-divider text-muted"
                    }`}
                  >
                    <Icon name={bus.gps.online ? "gps_fixed" : "gps_off"} size={13} />
                    {bus.gps_device_id
                      ? bus.gps.online
                        ? `GPS ${bus.gps_device_id} online`
                        : bus.gps.last_seen
                          ? `${bus.gps_device_id} · last seen ${formatRelativeTime(bus.gps.last_seen)}`
                          : `${bus.gps_device_id} · no signal`
                      : "No GPS device"}
                  </span>
                </div>
              </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
