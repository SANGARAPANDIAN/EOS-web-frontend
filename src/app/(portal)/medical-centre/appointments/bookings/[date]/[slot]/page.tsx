"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card, EmptyState, Icon, Input, type BadgeTone } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatDayAndTime } from "@/lib/utils/date";
import {
  useApproveBooking,
  useAppointmentDay,
  useRejectBooking,
  useSlotBookings,
  type AppointmentStatus,
  type PatientKind,
  type SlotBooking,
} from "@/modules/medical-centre/api/appointments";
import { formatHm12, slotParamToHm } from "@/modules/medical-centre/appointmentSlots";

/**
 * Who booked one 30-minute slot, and the approve/reject decision on each.
 *
 * Approving is the ONLY thing that puts a patient into the OPD queue — the
 * booking itself never does. Once approved the row shows the queue token it
 * became, so staff can find the same person on the OPD queue page.
 */

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  pending: "accentDark",
  approved: "accent",
  rejected: "danger",
  cancelled: "neutral",
};

const KIND_LABEL: Record<PatientKind, string> = {
  student: "Student",
  faculty: "Faculty",
  staff: "Staff",
};

function BookingRow({ booking }: { booking: SlotBooking }) {
  const approve = useApproveBooking();
  const reject = useRejectBooking();
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = approve.isPending || reject.isPending;
  const isPending = booking.status === "pending";

  async function decide(action: "approve" | "reject") {
    setError(null);
    const payload = { id: booking.id, note: note.trim() || undefined };
    try {
      if (action === "approve") await approve.mutateAsync(payload);
      else await reject.mutateAsync(payload);
      setShowNote(false);
      setNote("");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? `Could not ${action} this booking.`);
    }
  }

  return (
    <div className="border-t border-divider py-4 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-extrabold text-ink">{booking.name}</span>
            <Badge tone="neutral">{KIND_LABEL[booking.patient_kind]}</Badge>
          </div>
          <div className="mt-0.5 text-[12.5px] text-subtle">
            {[booking.identifier, booking.department].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Reason</div>
          <div className="mt-0.5 text-[13px] text-body">{booking.reason ?? "—"}</div>
        </div>

        <div className="min-w-[130px]">
          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Booked</div>
          <div className="mt-0.5 text-[13px] text-body">{formatDayAndTime(booking.booked_at)}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
          {booking.visit_id != null && (
            <Link
              href="/medical-centre/opd"
              className="flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
            >
              <Icon name="healing" size={14} />
              In OPD queue · T-{booking.visit_id}
            </Link>
          )}
        </div>
      </div>

      {isPending && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide("approve")}
            className="rounded-[7px] bg-primary px-3.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {approve.isPending ? "Approving…" : "Approve & add to queue"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide("reject")}
            className="rounded-[7px] border border-border-default px-3.5 py-1.5 text-[12.5px] font-bold text-danger-fg hover:bg-surface-tint disabled:opacity-50"
          >
            {reject.isPending ? "Rejecting…" : "Reject"}
          </button>
          <button
            type="button"
            onClick={() => setShowNote((v) => !v)}
            className="text-[12.5px] font-bold text-primary hover:underline"
          >
            {showNote ? "Hide note" : "Add a note"}
          </button>
          {showNote && (
            <Input
              className="w-auto min-w-[240px] flex-1"
              placeholder="Optional note shown to the person who booked"
              maxLength={255}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </div>
      )}

      {!isPending && booking.decision_note && (
        <div className="mt-2 text-[12.5px] text-muted">
          <span className="font-bold text-ink">Note:</span> {booking.decision_note}
        </div>
      )}

      {error && <div className="mt-2 text-[12.5px] font-semibold text-danger-fg">{error}</div>}
    </div>
  );
}

export default function SlotBookingsPage() {
  const params = useParams<{ date: string; slot: string }>();
  const date = params.date;
  const slotStart = slotParamToHm(params.slot);

  const bookings = useSlotBookings(date, slotStart);
  // Pulled from the same day payload the Bookings list uses, so capacity and
  // the slot's end time come from the server's own derivation rather than
  // being recomputed here from the URL.
  const day = useAppointmentDay(date);

  const slot = day.data?.windows.flatMap((w) => w.slots).find((s) => s.slot_start === slotStart);
  const parentWindow = day.data?.windows.find((w) => w.slots.some((s) => s.slot_start === slotStart));

  const rows = bookings.data ?? [];
  const live = rows.filter((r) => r.status === "pending" || r.status === "approved");
  const pending = rows.filter((r) => r.status === "pending");

  if (!slotStart) {
    return <EmptyState message="That slot reference is not valid." />;
  }

  const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const capacity = slot?.capacity ?? parentWindow?.window.capacity_per_slot ?? null;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <Link
          href="/medical-centre/appointments/bookings"
          className="mb-2 inline-flex items-center gap-1 text-[13px] font-bold text-primary hover:underline"
        >
          <Icon name="chevron_left" size={16} />
          Back to bookings
        </Link>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">
          {formatHm12(slotStart)}
          {slot && (
            <>
              <span className="text-muted"> – </span>
              {formatHm12(slot.slot_end)}
            </>
          )}
        </h1>
        <p className="mt-1 text-[13px] text-muted">{dayLabel}</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Booked</div>
            <div className="mt-0.5 text-[24px] font-extrabold leading-none text-ink">
              {live.length}
              {capacity != null && <span className="text-[15px] font-bold text-muted"> / {capacity}</span>}
            </div>
          </div>
          <div className="h-9 w-px bg-divider" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Awaiting approval</div>
            <div
              className={cn(
                "mt-0.5 text-[24px] font-extrabold leading-none",
                pending.length > 0 ? "text-primary" : "text-ink",
              )}
            >
              {pending.length}
            </div>
          </div>
          <div className="h-9 w-px bg-divider" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">In OPD queue</div>
            <div className="mt-0.5 text-[24px] font-extrabold leading-none text-ink">
              {rows.filter((r) => r.status === "approved").length}
            </div>
          </div>
          {parentWindow && (
            <>
              <div className="h-9 w-px bg-divider" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Time part</div>
                <div className="mt-0.5 text-[14px] font-bold text-ink">
                  {formatHm12(parentWindow.window.start_time)} – {formatHm12(parentWindow.window.end_time)}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-[16px] font-extrabold text-ink">Who booked this slot</h2>
        {bookings.isLoading ? (
          <EmptyState loading className="mt-2" />
        ) : rows.length === 0 ? (
          <EmptyState message="Nobody has booked this slot yet." className="mt-2" />
        ) : (
          <div className="mt-2 flex flex-col">
            {rows.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
