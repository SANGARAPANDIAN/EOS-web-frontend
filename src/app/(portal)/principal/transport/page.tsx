"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { useTransportList, useTransportBusDetail, type TransportBus } from "@/modules/principal/api/transport";

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
      className="flex cursor-pointer flex-col gap-3.5 rounded-2xl border p-5"
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
            <div className="rounded-2xl border" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
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
                  <div key={s.id} className="flex items-center gap-3 border-b py-2.5 text-sm" style={{ borderColor: principalColors.borderMuted }}>
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
              <div className="rounded-2xl border p-5" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
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

              <div className="rounded-2xl border p-5" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
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

export default function PrincipalTransportPage() {
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
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Transport
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          College fleet by bus number · open a bus for route, occupancy and live tracking
        </p>
      </div>

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
