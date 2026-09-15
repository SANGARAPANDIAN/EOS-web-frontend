"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Select, EmptyState, SkeletonRows } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  useHodVenues,
  useHodVenueBookings,
  useCreateHodVenueBooking,
  type HodVenueAvailability,
  type HodVenueBookingRow,
} from "@/modules/hod/api/employeeVenue";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils/date";
import { VenueThumbnail } from "@/components/shared/VenueThumbnail";

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function formatTimeRange(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const fmt = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${formatDisplayDate(fromIso)} · ${fmt(from)} – ${fmt(to)}`;
}

export default function HodEmployeeVenuePage() {
  const [tab, setTab] = useState<"apply" | "history">("apply");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Venue</h1>
          <p className="mt-1 text-[13px] text-muted">Booking requests for halls, labs and seminar rooms</p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "apply" | "history")}
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "apply" ? <ApplyForm /> : <HistoryList />}
    </div>
  );
}

function ApplyForm() {
  const today = toIsoDateString(new Date());
  const farFuture = toIsoDateString(new Date(new Date().setFullYear(new Date().getFullYear() + 2)));
  const catalog = useHodVenues(`${today}T00:00:00.000Z`, `${farFuture}T00:00:00.000Z`);
  const create = useCreateHodVenueBooking();

  const [venueId, setVenueId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [capacity, setCapacity] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const venues = catalog.data?.data ?? [];
  const effectiveVenueId = venueId ?? venues[0]?.id ?? null;
  const alreadyBooked = venues.filter((v) => !v.is_available && v.booking);

  async function submit() {
    if (!effectiveVenueId || !fromDate || !toDate || !fromTime || !toTime || !purpose) return;
    await create.mutateAsync({
      venue_id: effectiveVenueId,
      purpose,
      from_datetime: new Date(`${fromDate}T${fromTime}:00`).toISOString(),
      to_datetime: new Date(`${toDate}T${toTime}:00`).toISOString(),
      accommodating_strength: capacity ? Number(capacity) : undefined,
    });
    setSubmitted(true);
    setFromDate("");
    setToDate("");
    setFromTime("");
    setToTime("");
    setPurpose("");
    setCapacity("");
  }

  return (
    <div className="flex flex-col gap-5">
      {catalog.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load venue availability — please try again.
        </div>
      )}
      <Card className="hod-hover-card">
        {submitted && (
          <div className="mb-4 rounded-[10px] bg-accent-50 px-4 py-3 text-[13px] font-bold text-primary">
            Booking request submitted.
          </div>
        )}
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Venue Name</label>
        <Select value={effectiveVenueId ?? ""} onChange={(e) => setVenueId(Number(e.target.value))}>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {v.capacity ?? "—"} seats
            </option>
          ))}
        </Select>

        <div className="mt-5 grid grid-cols-4 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">To Date</label>
            <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">From Time</label>
            <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">To Time</label>
            <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Purpose</label>
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Guest lecture on Deep Learning" />
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Capacity Required</label>
          <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 120" />
        </div>

        <Button
          variant="primary"
          className="mt-6"
          onClick={submit}
          disabled={!purpose || !fromDate || !toDate}
          loading={create.isPending}
        >
          Submit Booking Request
        </Button>
      </Card>

      {alreadyBooked.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
            Already booked venues
          </div>
          <div className="grid grid-cols-4 gap-4">
            {alreadyBooked.map((v: HodVenueAvailability) => (
              <div
                key={v.id}
                className="hod-hover-card rounded-[11px] border border-border-default bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <VenueThumbnail photoUrl={v.photo_url} name={v.name} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-extrabold text-ink">{v.name}</div>
                    <div className="mt-0.5 truncate text-[12px] text-muted">{v.booking?.booked_by} · {v.booking?.purpose}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11.5px] text-subtle">
                  {v.booking && formatTimeRange(v.booking.from_datetime, v.booking.to_datetime)}
                </div>
                <Badge tone="neutral" className="mt-2">
                  BOOKED
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryList() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const bookings = useHodVenueBookings(status);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        value={status ?? "all"}
        onChange={(k) => setStatus(k === "all" ? undefined : k)}
        options={[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ]}
      />
      {bookings.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load venue bookings — please try again.
        </div>
      )}
      {bookings.isLoading ? (
        <SkeletonRows count={4} />
      ) : bookings.isError ? null : !bookings.data || bookings.data.data.length === 0 ? (
        <Card>
          <EmptyState message="No venue bookings yet." />
        </Card>
      ) : (
        bookings.data.data.map((b: HodVenueBookingRow) => (
          <Card key={b.id} className="hod-hover-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">
                  VEN-{new Date(b.created_at).getFullYear()}-{String(b.id).padStart(3, "0")}
                </div>
                <div className="mt-1 text-[16px] font-extrabold text-ink">
                  {b.venue.name} · {b.venue.capacity ?? "—"} seats
                </div>
                <div className="mt-0.5 text-[13px] text-body">
                  {formatTimeRange(b.from_datetime, b.to_datetime)}
                  {b.accommodating_strength != null ? ` · capacity ${b.accommodating_strength}` : ""}
                </div>
                <div className="mt-1 text-[12.5px] text-muted">{b.purpose}</div>
              </div>
              <Badge tone={statusTone(b.status)}>{b.status.replace("_", " ").toUpperCase()}</Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
