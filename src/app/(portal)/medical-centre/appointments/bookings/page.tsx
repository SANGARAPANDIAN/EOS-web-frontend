"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, Icon, IconButton, Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { todayDateOnly, toIsoDateString } from "@/lib/utils/date";
import { useAppointmentDay, type AppointmentSlot } from "@/modules/medical-centre/api/appointments";
import { formatHm12, formatRange, slotParam } from "@/modules/medical-centre/appointmentSlots";

/**
 * The list of bookable slots for one date, grouped by the time part each slot
 * came from — a time part is 10:00–13:00, a slot is one 30-minute division of
 * it, and the two are shown at different levels here on purpose.
 *
 * A slot tile is a link, not a button, so a booked slot can be opened in a new
 * tab and its URL shared with whoever is on duty.
 */

function SlotTile({ date, slot }: { date: string; slot: AppointmentSlot }) {
  const remaining = Math.max(0, slot.capacity - slot.booked);
  const filledRatio = slot.capacity > 0 ? slot.booked / slot.capacity : 0;

  return (
    <Link
      href={`/medical-centre/appointments/bookings/${date}/${slotParam(slot.slot_start)}`}
      className={cn(
        "hover-lift group flex flex-col gap-2 rounded-[11px] border p-3.5 transition-colors",
        slot.full
          ? "border-border-default bg-surface-tint"
          : slot.booked > 0
            ? "border-border-accent bg-accent-50 hover:border-primary"
            : "border-border-default bg-surface hover:border-primary hover:bg-surface-tint",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[14px] font-extrabold tracking-[-.01em] text-ink">
          {formatHm12(slot.slot_start)}
          <span className="text-muted"> – </span>
          {formatHm12(slot.slot_end)}
        </div>
        <Icon name="chevron_right" size={17} className="text-subtle group-hover:text-primary" />
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-[19px] font-extrabold leading-none text-ink">{slot.booked}</span>
        <span className="text-[12.5px] font-semibold text-muted">/ {slot.capacity} booked</span>
      </div>

      {/* Fill bar — reads faster than the numbers alone when scanning a whole day. */}
      <div className="h-[5px] w-full overflow-hidden rounded-pill bg-surface-input">
        <div
          className={cn("h-full rounded-pill", slot.full ? "bg-danger-fg" : "bg-primary")}
          style={{ width: `${Math.min(100, Math.round(filledRatio * 100))}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {slot.pending > 0 && <Badge tone="accentDark">{slot.pending} to approve</Badge>}
        {slot.approved > 0 && <Badge tone="accent">{slot.approved} approved</Badge>}
        {slot.booked === 0 && <span className="text-[12px] font-semibold text-subtle">No bookings yet</span>}
        {slot.full && <Badge tone="danger">Full</Badge>}
        {!slot.full && slot.booked > 0 && (
          <span className="text-[12px] font-semibold text-muted">{remaining} left</span>
        )}
      </div>
    </Link>
  );
}

export default function AppointmentBookingsPage() {
  const todayIso = todayDateOnly();
  const [date, setDate] = useState(todayIso);
  const day = useAppointmentDay(date);

  const windows = day.data?.windows ?? [];
  const allSlots = windows.flatMap((w) => w.slots);
  const totals = {
    slots: allSlots.length,
    booked: allSlots.reduce((sum, s) => sum + s.booked, 0),
    pending: allSlots.reduce((sum, s) => sum + s.pending, 0),
    approved: allSlots.reduce((sum, s) => sum + s.approved, 0),
  };

  function shiftDay(delta: number) {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + delta);
    setDate(toIsoDateString(next));
  }

  const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Bookings</h1>
        <p className="mt-1 text-[13px] text-muted">
          Every slot on a date, grouped by the time part it belongs to. Open a slot to see who booked it and approve them
          into the OPD queue.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton icon="chevron_left" size={36} onClick={() => shiftDay(-1)} aria-label="Previous day" />
          <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <IconButton icon="chevron_right" size={36} onClick={() => shiftDay(1)} aria-label="Next day" />
          <button
            type="button"
            onClick={() => setDate(todayIso)}
            className="rounded-[9px] border border-border-default px-3.5 py-2 text-[13px] font-bold text-primary hover:bg-surface-tint"
          >
            Today
          </button>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] font-semibold text-muted">
            <span>
              <span className="text-[15px] font-extrabold text-ink">{totals.slots}</span> slots
            </span>
            <span className="text-border-default">·</span>
            <span>
              <span className="text-[15px] font-extrabold text-ink">{totals.booked}</span> booked
            </span>
            {totals.pending > 0 && (
              <>
                <span className="text-border-default">·</span>
                <Badge tone="accentDark">{totals.pending} awaiting approval</Badge>
              </>
            )}
          </div>
        </div>
        <div className="mt-2.5 text-[13px] font-bold text-ink">{dayLabel}</div>
      </Card>

      {day.isLoading ? (
        <EmptyState loading size={30} />
      ) : windows.length === 0 ? (
        <EmptyState message="No time parts are open on this date. Add them under Date & time slots first." />
      ) : (
        windows.map(({ window: part, slots }) => {
          const partBooked = slots.reduce((sum, s) => sum + s.booked, 0);
          const partCapacity = slots.reduce((sum, s) => sum + s.capacity, 0);

          return (
            <Card key={part.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-3.5">
                <div>
                  <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-ink">
                    {formatRange(part.start_time, part.end_time)}
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {slots.length} slot{slots.length === 1 ? "" : "s"} of {part.slot_minutes} min ·{" "}
                    {part.capacity_per_slot} people per slot
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge tone={part.status === "open" ? "accent" : "neutral"}>
                    {part.status === "open" ? "Open" : "Closed"}
                  </Badge>
                  <span className="text-[12.5px] font-semibold text-muted">
                    <span className="text-[15px] font-extrabold text-ink">{partBooked}</span> / {partCapacity} booked
                  </span>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
                {slots.map((slot) => (
                  <SlotTile key={slot.slot_start} date={date} slot={slot} />
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
