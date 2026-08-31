"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useTransportList, useTransportBusDetail, type TransportBus } from "@/modules/principal/api/transport";
import {
  useTransportRoutes,
  useTransportCrew,
  useTransportMaintenance,
  useTransportCompliance,
  useTransportDashboard,
} from "@/modules/principal/api/transportOps";

type Tab = "overview" | "buses" | "routes" | "crew" | "maintenance" | "compliance";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "buses", label: "Buses" },
  { key: "routes", label: "Routes" },
  { key: "crew", label: "Drivers & crew" },
  { key: "maintenance", label: "Maintenance" },
  { key: "compliance", label: "Compliance" },
];

function SectionShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
      <div className="border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
        <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
          {title}
        </div>
        {description && (
          <p className="mt-0.5 text-[13px]" style={{ color: principalColors.textFaint }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function stateBadge(state: string | null): { label: string; fg: string; bg: string; bd: string } {
  switch (state) {
    case "expired":
      return { label: "Expired", fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
    case "due_soon":
    case "soon":
      return { label: "Due soon", fg: "#92400E", bg: "#FEF3C7", bd: "#FBDE9A" };
    case "missing":
      return { label: "Missing", fg: principalColors.textFaint, bg: principalColors.surfaceMuted, bd: principalColors.borderLight };
    default:
      return { label: "Valid", fg: "#1B7A3D", bg: "#E9F8EE", bd: "#BEE9CC" };
  }
}

function OverviewTab() {
  const dashboard = useTransportDashboard("today");
  const d = dashboard.data;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total buses", value: d?.fleet.total_buses, footer: `${d?.fleet.buses_on_route ?? 0} on route` },
          { label: "Routes", value: d?.routes_count, footer: undefined },
          { label: "Students on transport", value: d?.ridership.students_on_transport, footer: d?.ridership.occupancy_percent != null ? `${d.ridership.occupancy_percent}% occupancy` : undefined },
          { label: "Renewals due", value: d ? d.renewals.documents_due + d.renewals.service_due : undefined, footer: d ? `${d.renewals.documents_due} documents · ${d.renewals.service_due} service` : undefined },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border p-5" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
            <div className="text-sm font-semibold" style={{ color: principalColors.textMuted }}>
              {tile.label}
            </div>
            <div className="my-2.5 text-[32px] font-extrabold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              {tile.value ?? "—"}
            </div>
            {tile.footer && (
              <div className="text-xs" style={{ color: principalColors.textFaint }}>
                {tile.footer}
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionShell title="Needs attention" description="Real, threshold-triggered flags — licence/document expiry, service due, routes at capacity">
        <div className="p-5">
          {dashboard.isLoading && <p className="text-sm" style={{ color: principalColors.textFaint }}>Loading…</p>}
          {!dashboard.isLoading && (d?.needs_attention.length ?? 0) === 0 && (
            <p className="text-sm" style={{ color: principalColors.textFaint }}>Nothing needs attention right now.</p>
          )}
          <div className="flex flex-col gap-3">
            {d?.needs_attention.map((f, i) => (
              <div key={i} className="rounded-xl border p-3.5" style={{ borderColor: principalColors.borderMuted }}>
                <div className="text-sm font-bold" style={{ color: principalColors.heading }}>
                  {f.title}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: principalColors.textFaint }}>
                  {f.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>
    </div>
  );
}

function RoutesTab() {
  const routes = useTransportRoutes();
  return (
    <SectionShell title="Routes" description="Every transport route, stops, fee and buses assigned">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr style={{ background: principalColors.surfaceMuted }}>
              {["ROUTE", "STOPS", "STUDENTS", "BUSES", "FEE"].map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.data?.routes.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                <td className="px-5 py-3.5 font-semibold" style={{ color: principalColors.heading }}>
                  {r.name}
                  {r.departure_time && (
                    <span className="ml-2 text-xs font-normal" style={{ color: principalColors.textFaint }}>
                      {r.departure_time}–{r.arrival_time ?? "—"}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{r.stops_count}</td>
                <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{r.student_count}</td>
                <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{r.buses.map((b) => b.bus_no).join(", ") || "—"}</td>
                <td className="px-5 py-3.5" style={{ color: principalColors.body }}>
                  {r.fee.per_student != null ? `₹${r.fee.per_student}` : r.fee.range ? `₹${r.fee.range.min}–₹${r.fee.range.max}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!routes.isLoading && (routes.data?.routes.length ?? 0) === 0 && (
          <p className="p-5 text-center text-sm" style={{ color: principalColors.textFaint }}>No routes on file.</p>
        )}
      </div>
    </SectionShell>
  );
}

function CrewTab() {
  const crew = useTransportCrew();
  return (
    <SectionShell title="Drivers & crew" description="Who's assigned to each bus — one driver + one attendant per vehicle">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr style={{ background: principalColors.surfaceMuted }}>
              {["BUS", "ROUTE", "DRIVER", "PHONE", "LICENCE"].map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crew.data?.crew.map((c) => {
              const badge = stateBadge(c.licence_state);
              return (
                <tr key={c.bus_id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="px-5 py-3.5 font-mono font-semibold" style={{ color: principalColors.heading }}>{c.vehicle_number}</td>
                  <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{c.route_name ?? "—"}</td>
                  <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{c.driver_name ?? "—"}</td>
                  <td className="px-5 py-3.5 font-mono" style={{ color: principalColors.body }}>{c.driver_phone ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    {c.driver_licence_no ? (
                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
                        {badge.label}
                      </span>
                    ) : (
                      <span style={{ color: principalColors.textFaint }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!crew.isLoading && (crew.data?.crew.length ?? 0) === 0 && (
          <p className="p-5 text-center text-sm" style={{ color: principalColors.textFaint }}>No crew on file.</p>
        )}
      </div>
    </SectionShell>
  );
}

function MaintenanceTab() {
  const maintenance = useTransportMaintenance();
  const m = maintenance.data;
  return (
    <div className="flex flex-col gap-5">
      <SectionShell title="Service due" description="By odometer reading — within 4,000 km of the next scheduled service">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["BUS", "ODOMETER", "NEXT SERVICE", "KM LEFT", "STATUS"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m?.service_due.map((s) => {
                const badge = stateBadge(s.tag);
                return (
                  <tr key={s.bus_id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                    <td className="px-5 py-3.5 font-mono font-semibold" style={{ color: principalColors.heading }}>{s.vehicle_number}</td>
                    <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{s.odometer_km.toLocaleString("en-IN")} km</td>
                    <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{s.next_service_due_km.toLocaleString("en-IN")} km</td>
                    <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{Math.max(s.km_left, 0).toLocaleString("en-IN")} km</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!maintenance.isLoading && (m?.service_due.length ?? 0) === 0 && (
            <p className="p-5 text-center text-sm" style={{ color: principalColors.textFaint }}>No bus is due for service soon.</p>
          )}
        </div>
      </SectionShell>

      <SectionShell title="Service &amp; repair log" description="Most recent 50 entries">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr style={{ background: principalColors.surfaceMuted }}>
                {["DATE", "BUS", "WORK", "GARAGE", "COST"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m?.service_log.map((l) => (
                <tr key={l.id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                  <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{new Date(l.service_date).toLocaleDateString("en-IN")}</td>
                  <td className="px-5 py-3.5 font-mono font-semibold" style={{ color: principalColors.heading }}>{l.bus_no}</td>
                  <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{l.work_description}</td>
                  <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{l.garage ?? "—"}</td>
                  <td className="px-5 py-3.5" style={{ color: principalColors.body }}>{l.cost != null ? `₹${l.cost.toLocaleString("en-IN")}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!maintenance.isLoading && (m?.service_log.length ?? 0) === 0 && (
            <p className="p-5 text-center text-sm" style={{ color: principalColors.textFaint }}>No service history on file.</p>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function ComplianceTab() {
  const compliance = useTransportCompliance();
  return (
    <SectionShell title="Statutory documents" description="One row per bus, one column per document type — a gap is shown rather than hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr style={{ background: principalColors.surfaceMuted }}>
              <th className="whitespace-nowrap px-5 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>BUS</th>
              {compliance.data?.buses[0]?.documents.map((d) => (
                <th key={d.doc_type} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compliance.data?.buses.map((b) => (
              <tr key={b.bus_id} className="border-t" style={{ borderColor: principalColors.borderMuted }}>
                <td className="px-5 py-3.5 font-mono font-semibold" style={{ color: principalColors.heading }}>{b.vehicle_number}</td>
                {b.documents.map((d) => {
                  const badge = stateBadge(d.state);
                  return (
                    <td key={d.doc_type} className="px-3 py-3.5">
                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
                        {badge.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!compliance.isLoading && (compliance.data?.buses.length ?? 0) === 0 && (
          <p className="p-5 text-center text-sm" style={{ color: principalColors.textFaint }}>Document tracking isn&apos;t set up for this fleet yet.</p>
        )}
      </div>
    </SectionShell>
  );
}

function occupancyBadge(bus: TransportBus): { label: string; fg: string; bg: string; bd: string } {
  if (bus.capacity == null) {
    return { label: bus.status, fg: principalColors.textFaint, bg: principalColors.surfaceMuted, bd: principalColors.borderLight };
  }
  if (bus.seats_free != null && bus.seats_free <= 0) {
    return { label: "Full", fg: "#B42318", bg: "#FEF0EE", bd: "#F7C3BB" };
  }
  return { label: `${bus.seats_free} seats free`, fg: principalColors.primaryDark, bg: principalColors.surfaceTint, bd: principalColors.chipBorder };
}

function BusCard({ bus, onOpen }: { bus: TransportBus; onOpen: () => void }) {
  const badge = occupancyBadge(bus);
  return (
    <div
      onClick={onOpen}
      className="flex cursor-pointer flex-col gap-3.5 rounded-2xl border p-5 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
            <Icon name="directions_bus" size={20} />
          </div>
          <div>
            <div className="font-mono text-base font-bold" style={{ color: principalColors.heading }}>
              {bus.vehicle_number}
            </div>
            <div className="text-xs" style={{ color: principalColors.textFaint }}>
              {bus.route ? `${bus.route.name} · ${bus.route.stops_count} stops` : "No route assigned"}
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: badge.fg, background: badge.bg, borderColor: badge.bd }}>
          {badge.label}
        </span>
      </div>

      {bus.route && (
        <div className="flex items-center gap-2 border-t pt-3 text-sm" style={{ borderColor: principalColors.borderMuted, color: principalColors.body }}>
          <span>{bus.route.first_stop ?? "—"}</span>
          <Icon name="arrow_forward" size={14} style={{ color: principalColors.textFaint }} />
          <span>{bus.route.last_stop ?? "—"}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: principalColors.borderMuted }}>
        <div>
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            Occupancy
          </div>
          <div className="font-mono text-base font-bold" style={{ color: principalColors.heading }}>
            {bus.capacity != null ? `${bus.riders_count}/${bus.capacity}` : bus.riders_count}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            Driver
          </div>
          <div className="text-sm font-semibold" style={{ color: principalColors.heading }}>
            {bus.driver_name ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function BusDetailView({ busId, onBack }: { busId: number; onBack: () => void }) {
  const detail = useTransportBusDetail(busId);
  const bus = detail.data;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-fit items-center gap-2 rounded-[11px] border px-3.5 text-sm font-semibold"
        style={{ borderColor: principalColors.border, color: principalColors.body }}
      >
        <Icon name="arrow_back" size={18} />
        All buses
      </button>

      {bus && (
        <>
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
              <Icon name="directions_bus" size={26} />
            </div>
            <div>
              <h1 className="font-mono text-[28px] font-extrabold tracking-tight" style={{ color: principalColors.heading }}>
                {bus.vehicle_number}
              </h1>
              <p className="mt-1 text-[15px]" style={{ color: principalColors.textFaint }}>
                {bus.route ? `${bus.route.name} · ${bus.route.stops_count} stops` : "No route assigned"}
                {bus.route?.departure_time ? ` · departs ${bus.route.departure_time}` : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
              <div className="flex items-center border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
                <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                  Route
                </div>
                <span className="ml-auto text-[13px]" style={{ color: principalColors.textFaint }}>
                  {bus.stops.length} stops
                </span>
              </div>
              {bus.route && (
                <div className="flex items-center gap-4 border-b px-5 py-4" style={{ borderColor: principalColors.borderLight }}>
                  <div>
                    <div className="text-xs font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                      FROM
                    </div>
                    <div className="mt-0.5 font-semibold" style={{ color: principalColors.heading }}>
                      {bus.route.first_stop ?? "—"}
                    </div>
                    <div className="text-xs" style={{ color: principalColors.textFaint }}>
                      starting point
                    </div>
                  </div>
                  <Icon name="arrow_forward" size={18} style={{ color: principalColors.primary }} />
                  <div>
                    <div className="text-xs font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                      TO
                    </div>
                    <div className="mt-0.5 font-semibold" style={{ color: principalColors.heading }}>
                      {bus.route.last_stop ?? "—"}
                    </div>
                    <div className="text-xs" style={{ color: principalColors.textFaint }}>
                      ending point
                    </div>
                  </div>
                </div>
              )}
              <div className="px-5 py-3 text-[11px] font-bold tracking-wider" style={{ background: principalColors.surfaceMuted, color: principalColors.textFaint }}>
                STOPS
              </div>
              <div className="grid grid-cols-1 gap-x-8 px-5 py-2 sm:grid-cols-2">
                {bus.stops.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 border-b py-2.5 text-sm transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]" style={{ borderColor: principalColors.borderMuted }}>
                    <span className="font-mono text-xs" style={{ color: principalColors.textFaint }}>
                      {String(s.sequence_no).padStart(2, "0")}
                    </span>
                    <span className="font-semibold" style={{ color: principalColors.heading }}>
                      {s.stage_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border p-5 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold" style={{ color: principalColors.textFaint }}>
                    Occupancy
                  </div>
                  {bus.seats_free != null && (
                    <div className="text-xs" style={{ color: principalColors.textFaint }}>
                      {bus.seats_free} seats free
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="font-mono text-[32px] font-extrabold leading-none" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
                    {bus.capacity != null ? `${bus.riders_count}/${bus.capacity}` : bus.riders_count}
                  </div>
                  {bus.capacity != null && (
                    <div className="pb-1 text-sm font-bold" style={{ color: principalColors.primaryDark }}>
                      {Math.round((bus.riders_count / bus.capacity) * 100)}%
                    </div>
                  )}
                </div>
                {bus.capacity != null ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: principalColors.borderLight }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.round((bus.riders_count / bus.capacity) * 100))}%`, background: principalColors.primary }}
                    />
                  </div>
                ) : (
                  <div className="mt-2 text-xs" style={{ color: principalColors.textSubtle }}>
                    Seat capacity isn&apos;t on file for this bus yet.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border p-5 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
                <div className="text-sm font-semibold" style={{ color: principalColors.textFaint }}>
                  Driver
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full" style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}>
                    <Icon name="person" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: principalColors.heading }}>
                      {bus.driver_name ?? "Not on file"}
                    </div>
                    <div className="font-mono text-sm" style={{ color: principalColors.textFaint }}>
                      {bus.driver_phone ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BusesTab() {
  const [q, setQ] = useState("");
  const [openBusId, setOpenBusId] = useState<number | null>(null);
  const list = useTransportList();

  if (openBusId != null) {
    return <BusDetailView busId={openBusId} onBack={() => setOpenBusId(null)} />;
  }

  const buses = list.data?.buses ?? [];
  const filtered = q
    ? buses.filter((b) =>
        [b.vehicle_number, b.bus_no, b.route?.name, b.driver_name].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
      )
    : buses;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center gap-3 rounded-2xl border p-4" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border px-3.5" style={{ borderColor: principalColors.border }}>
          <Icon name="search" size={20} style={{ color: principalColors.textFaint }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bus number, route or driver name"
            className="flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: principalColors.heading }}
          />
        </label>
        <span className="shrink-0 text-[13px]" style={{ color: principalColors.textFaint }}>
          {list.isLoading ? "Loading…" : `${filtered.length} of ${buses.length} buses`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bus) => (
          <BusCard key={bus.id} bus={bus} onOpen={() => setOpenBusId(bus.id)} />
        ))}
      </div>

      {!list.isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border py-16 text-center" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
          <Icon name="directions_bus" size={38} style={{ color: principalColors.borderLight }} />
          <div className="mt-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            No buses match that search
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrincipalTransportPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Transport
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Full read-only view of the college fleet — routes, drivers, maintenance and statutory compliance
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl p-1" style={{ background: principalColors.borderLight, width: "fit-content" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="h-[38px] whitespace-nowrap rounded-[9px] px-[16px] text-sm font-semibold transition-colors"
              style={{
                background: active ? principalColors.bg : "transparent",
                color: active ? principalColors.heading : principalColors.textFaint,
                boxShadow: active ? "0 1px 2px rgba(13,30,79,0.08)" : undefined,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "buses" && <BusesTab />}
      {tab === "routes" && <RoutesTab />}
      {tab === "crew" && <CrewTab />}
      {tab === "maintenance" && <MaintenanceTab />}
      {tab === "compliance" && <ComplianceTab />}
    </div>
  );
}
