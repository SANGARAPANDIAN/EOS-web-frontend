"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Badge, Button, Avatar, Icon, Input, Select, EmptyState, DataTable, type DataTableColumn, type BadgeTone } from "@/components/ui";
import { useBusDetail, useUpdateBus, type BusDetailResponse, type BusDetailMaintenance, type BusDetailFuelEntry } from "@/modules/transport/api/busDetail";
import { useRoutes } from "@/modules/transport/api/routes";
import { formatDisplayDate, formatRelativeTime, formatTime12h } from "@/lib/utils/date";

const STATUS_LABEL: Record<string, string> = {
  on_route: "On route",
  at_campus: "At campus",
  in_depot: "In depot",
  maintenance: "Maintenance",
};
const STATE_TONE: Record<string, BadgeTone> = {
  expired: "danger",
  due_soon: "accentDark",
  valid: "neutral",
  missing: "neutral",
};
const STATE_LABEL: Record<string, string> = {
  expired: "expired",
  due_soon: "due soon",
  valid: "valid",
  missing: "not entered",
};

/** Hover lift matching the design reference — applied consistently across the transport module. */
const HOVERABLE = "transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift";

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={`rounded-card border border-border-default bg-surface p-[16px_18px] ${HOVERABLE}`}>
      <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">{label}</div>
      <div className="mt-1.5 text-[22px] font-extrabold tracking-[-.02em] text-ink">{value}</div>
      <div className="mt-0.5 text-[12px] text-muted">{sub}</div>
    </div>
  );
}

function SpecField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">{label}</div>
      <div className="mt-1 text-[14px] font-semibold text-ink-soft">{value ?? "—"}</div>
    </div>
  );
}

const MAINT_COLUMNS: DataTableColumn<BusDetailMaintenance>[] = [
  { key: "date", header: "Date", width: "0.9fr", render: (r) => formatDisplayDate(r.service_date) },
  { key: "work", header: "Work carried out", width: "1.6fr", render: (r) => r.work_description },
  { key: "garage", header: "Garage", width: "1fr", render: (r) => r.garage ?? "—" },
  { key: "odo", header: "Odometer", width: "0.9fr", render: (r) => (r.odometer_km != null ? `${r.odometer_km.toLocaleString("en-IN")} km` : "—") },
  { key: "cost", header: "Cost", width: "0.8fr", align: "right", render: (r) => (r.cost != null ? <span className="font-bold">₹{r.cost.toLocaleString("en-IN")}</span> : "—") },
];

interface EditField {
  key: string;
  label: string;
  type?: string;
}
const STATUS_OPTIONS = ["on_route", "at_campus", "in_depot", "maintenance"];
const EDIT_GROUPS: { title: string; fields: EditField[] }[] = [
  {
    title: "Basic",
    fields: [
      { key: "bus_no", label: "Bus no" },
      { key: "vehicle_number", label: "Registration no" },
      { key: "gps_device_id", label: "GPS device id" },
    ],
  },
  {
    title: "Occupancy & service",
    fields: [
      { key: "capacity", label: "Seating capacity", type: "number" },
      { key: "odometer_km", label: "Odometer (km)", type: "number" },
      { key: "next_service_due_km", label: "Next service due (km)", type: "number" },
      { key: "last_service_date", label: "Last service date", type: "date" },
    ],
  },
  {
    title: "Vehicle specification",
    fields: [
      { key: "model", label: "Make & model" },
      { key: "body_type", label: "Body type" },
      { key: "year_of_manufacture", label: "Year of manufacture", type: "number" },
      { key: "fuel_emission", label: "Fuel & emission" },
      { key: "chassis_no", label: "Chassis no" },
      { key: "engine_no", label: "Engine no" },
      { key: "engine_spec", label: "Engine" },
      { key: "wheelbase_mm", label: "Wheelbase (mm)", type: "number" },
      { key: "tyre_spec", label: "Tyre size / count" },
      { key: "fuel_tank_litres", label: "Fuel tank (L)", type: "number" },
      { key: "ownership", label: "Ownership" },
      { key: "rto", label: "RTO" },
      { key: "parking_bay", label: "Parking bay" },
      { key: "registered_date", label: "Registered date", type: "date" },
    ],
  },
  {
    title: "Crew",
    fields: [
      { key: "driver_name", label: "Driver" },
      { key: "driver_phone", label: "Driver phone" },
      { key: "driver_licence_no", label: "Driver licence no" },
      { key: "driver_licence_expiry", label: "Licence valid till", type: "date" },
      { key: "driver_experience_years", label: "Experience (yrs)", type: "number" },
      { key: "driver_blood_group", label: "Blood group" },
      { key: "attendant_name", label: "Attendant" },
      { key: "attendant_phone", label: "Attendant phone" },
    ],
  },
];

function buildInitialForm(data: BusDetailResponse): Record<string, string> {
  const dateOnly = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");
  return {
    bus_no: data.bus.bus_no,
    vehicle_number: data.bus.vehicle_number,
    gps_device_id: data.bus.gps_device_id ?? "",
    capacity: data.occupancy.capacity != null ? String(data.occupancy.capacity) : "",
    odometer_km: data.odometer.odometer_km != null ? String(data.odometer.odometer_km) : "",
    next_service_due_km: data.odometer.next_service_due_km != null ? String(data.odometer.next_service_due_km) : "",
    last_service_date: dateOnly(data.odometer.last_service_date),
    model: data.bus.model ?? "",
    body_type: data.spec?.body_type ?? "",
    year_of_manufacture: data.spec?.year_of_manufacture != null ? String(data.spec.year_of_manufacture) : "",
    fuel_emission: data.spec?.fuel_emission ?? "",
    chassis_no: data.spec?.chassis_no ?? "",
    engine_no: data.spec?.engine_no ?? "",
    engine_spec: data.spec?.engine_spec ?? "",
    wheelbase_mm: data.spec?.wheelbase_mm != null ? String(data.spec.wheelbase_mm) : "",
    tyre_spec: data.spec?.tyre_spec ?? "",
    fuel_tank_litres: data.spec?.fuel_tank_litres != null ? String(data.spec.fuel_tank_litres) : "",
    ownership: data.spec?.ownership ?? "",
    rto: data.spec?.rto ?? "",
    parking_bay: data.spec?.parking_bay ?? "",
    registered_date: dateOnly(data.bus.registered_date),
    driver_name: data.crew.driver_name ?? "",
    driver_phone: data.crew.driver_phone ?? "",
    driver_licence_no: data.crew.driver_licence_no ?? "",
    driver_licence_expiry: dateOnly(data.crew.driver_licence_expiry),
    driver_experience_years: data.crew.driver_experience_years != null ? String(data.crew.driver_experience_years) : "",
    driver_blood_group: data.crew.driver_blood_group ?? "",
    attendant_name: data.crew.attendant_name ?? "",
    attendant_phone: data.crew.attendant_phone ?? "",
  };
}

const NUMBER_FIELDS = new Set([
  "capacity",
  "odometer_km",
  "next_service_due_km",
  "year_of_manufacture",
  "wheelbase_mm",
  "fuel_tank_litres",
  "driver_experience_years",
]);

function EditBusModal({ data, busId, onClose }: { data: BusDetailResponse; busId: number; onClose: () => void }) {
  const routes = useRoutes();
  const updateBus = useUpdateBus(busId);
  const [form, setForm] = useState<Record<string, string>>(() => buildInitialForm(data));
  const [routeId, setRouteId] = useState(data.route ? String(data.route.id) : "");
  const [status, setStatus] = useState<string>(data.bus.status ?? "in_depot");
  const [error, setError] = useState<string | null>(null);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const payload: Record<string, unknown> = { status };
    if (routeId) payload.route_id = Number(routeId);
    for (const group of EDIT_GROUPS) {
      for (const field of group.fields) {
        const raw = form[field.key];
        if (!raw) continue;
        payload[field.key] = NUMBER_FIELDS.has(field.key) ? Number(raw) : raw;
      }
    }

    updateBus.mutate(payload, {
      onSuccess: onClose,
      onError: (err: unknown) => {
        const message = (err as { response?: { message?: string } })?.response?.message ?? "Could not save these changes.";
        setError(message);
      },
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[900px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Edit {data.bus.bus_no}</div>
            <div className="mt-0.5 text-[13px] text-muted">Transport office · fleet record</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 px-[26px] py-[24px]">
          <div className="grid grid-cols-3 gap-4">
            {EDIT_GROUPS[0].fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">{field.label}</label>
                <Input
                  className="mt-1.5"
                  type={field.type ?? "text"}
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
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Status</label>
              <Select className="mt-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {EDIT_GROUPS.slice(1).map((group) => (
            <div key={group.title}>
              <div className="mb-2.5 text-[13px] font-bold text-ink-soft">{group.title}</div>
              <div className="grid grid-cols-3 gap-4">
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">{field.label}</label>
                    <Input
                      className="mt-1.5"
                      type={field.type ?? "text"}
                      value={form[field.key] ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="px-[26px] pb-2 text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={updateBus.isPending}>
            Save changes
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const FUEL_COLUMNS: DataTableColumn<BusDetailFuelEntry>[] = [
  { key: "date", header: "Date", width: "0.9fr", render: (r) => formatDisplayDate(r.fill_date) },
  { key: "litres", header: "Litres", width: "0.7fr", render: (r) => `${r.litres} L` },
  { key: "rate", header: "Rate", width: "0.8fr", render: (r) => (r.rate_per_litre != null ? `₹${r.rate_per_litre} / L` : "—") },
  { key: "station", header: "Station", width: "1.4fr", render: (r) => r.station ?? "—" },
  { key: "cost", header: "Cost", width: "0.8fr", align: "right", render: (r) => (r.cost != null ? <span className="font-bold">₹{r.cost.toLocaleString("en-IN")}</span> : "—") },
];

export default function BusDetailPage() {
  const params = useParams<{ id: string }>();
  const busId = Number(params.id);
  const detail = useBusDetail(busId);
  const [showTracking, setShowTracking] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const data = detail.data;

  if (detail.isLoading) return <EmptyState message="Loading…" />;
  if (!data) return <EmptyState message="Bus not found." />;

  const { bus, route, occupancy, odometer, crew, spec, documents, maintenance, fuel, safety, extended } = data;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <Link href="/transport/buses">
        <Button variant="secondary" className="w-auto">
          ← All buses
        </Button>
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-[54px] shrink-0 items-center justify-center rounded-[14px] bg-icon-chip">
          <Icon name="directions_bus" size={26} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-[28px] font-extrabold tracking-[-.02em] text-ink">{bus.vehicle_number}</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {route?.name ?? "No route assigned"}
            {route && (
              <>
                {" "}
                · {route.stops_count} stops
                {route.distance_km != null && ` · ${route.distance_km.toFixed(1)} km`}
                {route.departure_time && route.arrival_time && (
                  <> · departs {formatTime12h(route.departure_time.slice(0, 5))} · arrives {formatTime12h(route.arrival_time.slice(0, 5))}</>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2.5">
          <span className="flex items-center gap-1.5 rounded-pill border border-border-default bg-surface px-3.5 py-2 text-[13px] font-bold text-ink">
            <span className={`size-1.5 rounded-full ${bus.status ? "bg-primary" : "bg-disabled"}`} />
            {bus.status ? STATUS_LABEL[bus.status] : "Not tracked"}
          </span>
          <Button variant="secondary" className="w-auto" onClick={() => setShowEdit(true)}>
            Edit record
          </Button>
          <Button variant="primarySmall" onClick={() => setShowTracking((v) => !v)}>
            Live tracking
          </Button>
        </div>
      </div>

      {showEdit && <EditBusModal data={data} busId={busId} onClose={() => setShowEdit(false)} />}

      {showTracking && (
        <Card className="text-[13.5px] text-ink-soft">
          {bus.gps.online
            ? `${bus.gps_device_id ?? "GPS device"} is online — last ping ${bus.gps.last_seen ? formatRelativeTime(bus.gps.last_seen) : "just now"}.`
            : bus.gps.last_seen
              ? `${bus.gps_device_id ?? "GPS device"} last reported ${formatRelativeTime(bus.gps.last_seen)} — not currently online.`
              : "No GPS pings recorded for this bus yet."}
        </Card>
      )}

      <div className="grid grid-cols-5 gap-3.5">
        <StatTile
          label="Occupancy"
          value={occupancy.capacity != null ? `${occupancy.count}/${occupancy.capacity}` : String(occupancy.count)}
          sub={occupancy.percent != null ? `${occupancy.percent}% of capacity` : "capacity not tracked"}
        />
        <StatTile
          label="Route length"
          value={route?.distance_km != null ? `${route.distance_km.toFixed(1)} km` : "—"}
          sub={route ? `${route.stops_count} stops one way` : "—"}
        />
        <StatTile
          label="Odometer"
          value={odometer.odometer_km != null ? `${(odometer.odometer_km / 1000).toFixed(1)}k km` : "—"}
          sub={odometer.next_service_due_km != null ? `next service at ${(odometer.next_service_due_km / 1000).toFixed(0)}k` : "not tracked"}
        />
        <StatTile
          label="Mileage"
          value={fuel.avg_mileage_km_per_litre != null ? String(fuel.avg_mileage_km_per_litre) : "—"}
          sub={fuel.avg_mileage_km_per_litre != null ? "km/L avg across logged fills" : "not enough fuel entries yet"}
        />
        <StatTile
          label="Term fee"
          value={
            route?.term_fee.per_student != null
              ? `₹${route.term_fee.per_student.toLocaleString("en-IN")}`
              : route?.term_fee.range
                ? `₹${route.term_fee.range.min.toLocaleString("en-IN")}–₹${route.term_fee.range.max.toLocaleString("en-IN")}`
                : "—"
          }
          sub={route?.term_fee.total_due ? `₹${route.term_fee.total_due.toLocaleString("en-IN")} total for this bus's riders` : "no riders yet"}
        />
      </div>

      <div className="grid grid-cols-[1.55fr_1fr] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Card className={HOVERABLE}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-ink">Vehicle specification</h2>
              <span className="text-[12.5px] text-muted">{bus.registered_date ? `Registered ${formatDisplayDate(bus.registered_date)}` : ""}</span>
            </div>
            {!extended.vehicle_specs ? (
              <EmptyState message="Vehicle spec sheet not tracked yet." />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <SpecField label="Make & model" value={bus.model} />
                <SpecField label="Body type" value={spec?.body_type} />
                <SpecField label="Year of manufacture" value={spec?.year_of_manufacture ? String(spec.year_of_manufacture) : null} />
                <SpecField label="Fuel & emission" value={spec?.fuel_emission} />
                <SpecField label="Seating capacity" value={occupancy.capacity != null ? `${occupancy.capacity} + 1 + 1` : null} />
                <SpecField label="Chassis no" value={spec?.chassis_no} />
                <SpecField label="Engine no" value={spec?.engine_no} />
                <SpecField label="Engine" value={spec?.engine_spec} />
                <SpecField label="Wheelbase" value={spec?.wheelbase_mm ? `${spec.wheelbase_mm.toLocaleString("en-IN")} mm` : null} />
                <SpecField label="Tyre size / count" value={spec?.tyre_spec} />
                <SpecField label="Fuel tank" value={spec?.fuel_tank_litres ? `${spec.fuel_tank_litres} L` : null} />
                <SpecField label="Ownership" value={spec?.ownership} />
                <SpecField label="RTO" value={spec?.rto} />
                <SpecField label="GPS device" value={bus.gps_device_id ? `${bus.gps_device_id} · ${bus.gps.online ? "online" : "offline"}` : null} />
                <SpecField label="Parking bay" value={spec?.parking_bay} />
                <SpecField label="Last service" value={odometer.last_service_date ? formatDisplayDate(odometer.last_service_date) : null} />
              </div>
            )}
          </Card>

          {route && (
            <Card className={HOVERABLE}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-extrabold text-ink">Route & stop timings</h2>
                <span className="text-[13px] text-muted">
                  {route.stops_count} stops{route.distance_km != null && ` · ${route.distance_km.toFixed(1)} km`}
                </span>
              </div>
              <div className="mb-4 flex items-center gap-6 border-b border-divider pb-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">From</div>
                  <div className="mt-1 text-[19px] font-extrabold text-ink">{route.boarding_area ?? route.name}</div>
                  <div className="text-[12px] text-muted">starting point</div>
                </div>
                <Icon name="arrow_forward" size={18} className="text-subtle" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">To</div>
                  <div className="mt-1 text-[19px] font-extrabold text-ink">College campus</div>
                  <div className="text-[12px] text-muted">ending point</div>
                </div>
              </div>
              <div className="grid grid-cols-2">
                {route.stops.map((stop) => (
                  <div key={stop.sequence_no} className="flex items-center gap-3 border-b border-divider px-1 py-2.5">
                    <span className="font-mono text-[12px] text-subtle">{String(stop.sequence_no).padStart(2, "0")}</span>
                    <span className="flex-1 text-[13.5px] font-semibold text-ink">{stop.stage_name}</span>
                    <span className="font-mono text-[12px] text-body">{stop.pickup_time ? formatTime12h(stop.pickup_time.slice(0, 5)) : "—"}</span>
                    <span className="text-[11.5px] text-subtle">{stop.board_count > 0 ? `${stop.board_count} board` : "—"}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className={`p-0 ${HOVERABLE}`}>
            <div className="p-[18px_20px_0]">
              <h2 className="text-[16px] font-extrabold text-ink">Maintenance history</h2>
            </div>
            <div className="mt-3">
              <DataTable
                columns={MAINT_COLUMNS}
                data={maintenance}
                rowKey={(r) => r.id}
                emptyMessage={extended.service_log ? "No service entries logged for this bus yet." : "Service log not tracked yet."}
                hoverableRows
              />
            </div>
          </Card>

          <Card className={`p-0 ${HOVERABLE}`}>
            <div className="p-[18px_20px_0] flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-ink">Fuel & mileage log</h2>
              {fuel.avg_mileage_km_per_litre != null && <span className="text-[13px] text-muted">avg {fuel.avg_mileage_km_per_litre} km/L</span>}
            </div>
            <div className="mt-3">
              <DataTable
                columns={FUEL_COLUMNS}
                data={fuel.entries}
                rowKey={(r) => r.id}
                emptyMessage={extended.fuel_log ? "No fuel entries logged for this bus yet." : "Fuel log not tracked yet."}
                hoverableRows
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className={HOVERABLE}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[16px] font-extrabold text-ink">Occupancy</h2>
              <span className="text-[13px] text-muted">
                {occupancy.seats_free != null ? `${occupancy.seats_free} seats free` : "—"}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2.5">
              <div className="text-[32px] font-extrabold tracking-[-.02em] text-ink">
                {occupancy.capacity != null ? `${occupancy.count}/${occupancy.capacity}` : occupancy.count}
              </div>
              {occupancy.percent != null && <div className="text-[14px] font-bold text-primary">{occupancy.percent}%</div>}
            </div>
            {occupancy.capacity != null && (
              <div className="mt-3 h-2 overflow-hidden rounded-[999px] bg-surface-tint">
                <div className="h-full rounded-[999px] bg-primary" style={{ width: `${Math.min(100, occupancy.percent ?? 0)}%` }} />
              </div>
            )}
            <div className="mt-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[.05em] text-subtle">Students</div>
              <div className="mt-1 text-[14px] font-bold text-ink">{occupancy.count}</div>
            </div>
          </Card>

          <Card className={HOVERABLE}>
            <h2 className="text-[16px] font-extrabold text-ink">Crew</h2>
            <div className="mt-3.5 flex items-center gap-3.5">
              <Avatar name={crew.driver_name ?? "Unassigned"} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-ink">{crew.driver_name ?? "Unassigned"}</div>
                <div className="font-mono text-[12.5px] text-muted">{crew.driver_phone ?? "—"}</div>
              </div>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-3.5">
              <SpecField label="Licence" value={crew.driver_licence_no} />
              <SpecField label="Valid till" value={crew.driver_licence_expiry ? formatDisplayDate(crew.driver_licence_expiry) : null} />
              <SpecField label="Experience" value={crew.driver_experience_years != null ? `${crew.driver_experience_years} yrs` : null} />
              <SpecField label="Blood group" value={crew.driver_blood_group} />
            </div>
            <div className="mt-3.5 flex items-center gap-3 border-t border-divider pt-3.5">
              <Avatar name={crew.attendant_name ?? "?"} size={36} />
              <div>
                <div className="text-[13.5px] font-bold text-ink">{crew.attendant_name ?? "No attendant assigned"}</div>
                <div className="text-[12px] text-muted">Bus attendant{crew.attendant_phone ? ` · ${crew.attendant_phone}` : ""}</div>
              </div>
            </div>
          </Card>

          <Card className={HOVERABLE}>
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Documents & compliance</h2>
            <div className="flex flex-col">
              {documents.map((doc) => (
                <div key={doc.doc_type} className="flex items-center justify-between gap-3 border-t border-divider py-3 first:border-0">
                  <div>
                    <div className="text-[13.5px] font-semibold text-ink">{doc.label}</div>
                    <div className="text-[12px] text-muted">{doc.reference_no ?? "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold text-ink">{doc.valid_until ? formatDisplayDate(doc.valid_until) : "—"}</div>
                    <Badge tone={STATE_TONE[doc.state]}>{STATE_LABEL[doc.state]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className={HOVERABLE}>
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Safety & fitment</h2>
            {!extended.safety_checks || safety.length === 0 ? (
              <EmptyState message={extended.safety_checks ? "No checklist recorded yet." : "Safety checklist not tracked yet."} />
            ) : (
              <div className="flex flex-col gap-2.5">
                {safety.map((item) => (
                  <div key={item.item_key} className="flex items-center gap-2.5 text-[13.5px]">
                    <span className={`size-2 shrink-0 rounded-full ${item.is_ok ? "bg-subtle" : "bg-danger-fg"}`} />
                    <span className="flex-1 font-semibold text-ink-soft">{item.label}</span>
                    <span className="text-muted">
                      {item.status_text}
                      {item.checked_date ? ` · ${formatDisplayDate(item.checked_date)}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
