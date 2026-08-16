"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { useVenues, useVenueBookings, useCreateVenueBooking } from "@/modules/secretary/api/venues";

// Pixel-exact layout port of the `isVenue` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1733-1833.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/creates go through
// EOSbackend1's real `/venues` + `/venue-bookings` modules (Secretary
// added to the role guards; own-bookings scoping, IQAC is the reviewer
// role — see `src/modules/secretary/api/venues.ts`). Honest departures:
//   - No `ref` (formatted booking code) exists — shown as `VB-{id}`.
//   - No Cancel/withdraw endpoint exists for Secretary at all (only IQAC
//     can PATCH a booking's decision) — the Cancel button is removed
//     rather than faked with a local-only mutation.
//   - "Already booked venues" grid is now genuinely live — computed from
//     real overlapping bookings in the next 90 days via `GET /venues`
//     (`is_available`/`booking` fields), not a hardcoded 4-row list.

const labelSx = { display: "block", fontSize: 13.1, fontWeight: 500, color: "#475569", marginBottom: 10 } as const;
const inputSx = { width: "100%", height: 52, border: "1px solid #e5e9f2", borderRadius: 12, padding: "0 14px", fontSize: 13.1, color: "#0f172a", background: "#ffffff" } as const;

const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", alternative_offered: "Alternative offered" };

function fmtRange(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const dateStr = from.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const fromTime = from.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  const toTime = to.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dateStr} · ${fromTime} – ${toTime}`;
}

export default function SecretaryVenuePage() {
  const [tab, setTab] = useState<"Apply" | "History">("Apply");
  const [toast, setToast] = useState("");
  const [venueId, setVenueId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [capacity, setCapacity] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const windowFrom = useMemo(() => new Date().toISOString(), []);
  const windowTo = useMemo(() => new Date(Date.now() + 90 * 86400000).toISOString(), []);
  const { data: venues, isLoading: venuesLoading } = useVenues(windowFrom, windowTo);
  const { data: bookings, isLoading: bookingsLoading, error: bookingsError } = useVenueBookings();
  const createMutation = useCreateVenueBooking();

  const venueOptions = venues?.data ?? [];
  const bookedVenues = venueOptions.filter((v) => !v.is_available && v.booking);

  async function submit() {
    if (!venueId) { flash("Pick a venue first."); return; }
    if (!fromDate || !fromTime || !toTime) { flash("Pick the date and the time slot first."); return; }
    if (!purpose.trim()) { flash("Add the purpose of the booking."); return; }
    const fromDatetime = new Date(`${fromDate}T${fromTime}:00`).toISOString();
    const toDatetime = new Date(`${toDate || fromDate}T${toTime}:00`).toISOString();
    try {
      await createMutation.mutateAsync({
        venue_id: venueId,
        purpose,
        from_datetime: fromDatetime,
        to_datetime: toDatetime,
        accommodating_strength: parseInt(capacity, 10) || undefined,
      });
      setPurpose("");
      setCapacity("");
      setTab("History");
      flash("Booking request submitted for IQAC review.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the booking.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Venue</h1>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>Booking requests for halls, labs and seminar rooms — reviewed by IQAC</p>
        </div>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 14, padding: 6 }}>
          {(["Apply", "History"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ border: 0, background: tab === t ? "#ffffff" : "transparent", color: tab === t ? "#1d4ed8" : "#64748b", fontSize: 13.9, fontWeight: tab === t ? 600 : 500, padding: "12px 34px", borderRadius: 10, cursor: "pointer", boxShadow: tab === t ? "0 1px 2px rgba(15,23,42,0.08)" : "none" }}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "Apply" && (
        <div>
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "26px 28px" }}>
            <label style={{ display: "block" }}>
              <span style={labelSx}>Venue Name</span>
              <select data-sec-lift="" value={venueId ?? ""} onChange={(e) => setVenueId(parseInt(e.target.value, 10) || null)} style={{ ...inputSx, height: 56, fontWeight: 500 }}>
                <option value="">{venuesLoading ? "Loading venues…" : "Select a venue"}</option>
                {venueOptions.map((v) => <option key={v.id} value={v.id}>{v.name}{v.capacity ? ` · ${v.capacity} seats` : ""}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 22, marginTop: 22 }}>
              <label style={{ display: "block" }}>
                <span style={labelSx}>From Date</span>
                <input data-sec-lift="" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputSx} />
              </label>
              <label style={{ display: "block" }}>
                <span style={labelSx}>To Date</span>
                <input data-sec-lift="" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputSx} />
              </label>
              <label style={{ display: "block" }}>
                <span style={labelSx}>From Time</span>
                <input data-sec-lift="" type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} style={inputSx} />
              </label>
              <label style={{ display: "block" }}>
                <span style={labelSx}>To Time</span>
                <input data-sec-lift="" type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} style={inputSx} />
              </label>
            </div>
            <label style={{ display: "block", marginTop: 22 }}>
              <span style={labelSx}>Purpose</span>
              <input data-sec-lift="" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Guest lecture on Deep Learning" style={inputSx} />
            </label>
            <label style={{ display: "block", marginTop: 22 }}>
              <span style={labelSx}>Capacity Required</span>
              <input data-sec-lift="" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 120" style={inputSx} />
            </label>
            <button onClick={submit} disabled={createMutation.isPending} style={{ width: "100%", marginTop: 26, border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 14.4, fontWeight: 700, borderRadius: 12, padding: "19px 0", cursor: "pointer", opacity: createMutation.isPending ? 0.7 : 1 }}>Submit Booking Request</button>
          </div>

          <div style={{ fontSize: 11.8, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "#94a3b8", margin: "28px 0 14px" }}>Already booked venues (next 90 days)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20 }}>
            {bookedVenues.map((v) => (
              <div key={v.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: "#eef2f7", flex: "0 0 auto" }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.9, fontWeight: 700, letterSpacing: -0.2 }}>{v.name}</div>
                    <div style={{ fontSize: 11.7, color: "#64748b", marginTop: 4 }}>{v.booking?.purpose}{v.booking?.booked_by ? ` · ${v.booking.booked_by}` : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
                  <span style={{ fontSize: 11.7, fontWeight: 600, color: "#1d4ed8" }}>{v.booking ? fmtRange(v.booking.from_datetime, v.booking.to_datetime) : "—"}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10.8, fontWeight: 700, letterSpacing: 0.7, borderRadius: 7, padding: "6px 11px", background: "#eef4ff", color: "#1d4ed8" }}>BOOKED</span>
                </div>
              </div>
            ))}
            {!venuesLoading && bookedVenues.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No venues have a real booking in the next 90 days.</div>
            )}
          </div>
        </div>
      )}

      {tab === "History" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {bookingsLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading bookings…</div>}
          {bookingsError && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{bookingsError instanceof Error ? bookingsError.message : "Could not load bookings."}</div>}
          {(bookings?.data ?? []).map((v) => {
            const label = STATUS_LABEL[v.status] ?? v.status;
            const t = tone(label);
            return (
              <div key={v.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.7, color: "#94a3b8", letterSpacing: 0.5 }}>VB-{v.id}</div>
                    <div style={{ fontSize: 16.5, fontWeight: 700, margin: "10px 0 6px", letterSpacing: -0.3 }}>{v.venues_venue_bookings_venue_idTovenues?.name ?? "—"}</div>
                    <div style={{ fontSize: 12.6, color: "#475569" }}>{fmtRange(v.from_datetime, v.to_datetime)} · capacity {v.accommodating_strength ?? "—"}</div>
                    <div style={{ fontSize: 12.6, color: "#64748b", marginTop: 6 }}>{v.purpose}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 10.8, fontWeight: 700, letterSpacing: 0.7, borderRadius: 7, padding: "6px 12px", background: t.bg, color: t.fg }}>{label.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
          {!bookingsLoading && !bookingsError && (bookings?.data.length ?? 0) === 0 && (
            <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No booking requests yet.</div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
