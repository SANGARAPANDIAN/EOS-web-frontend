"use client";

import { useState } from "react";
import { useVenues, useMyVenueBookings, useCreateVenueBooking } from "@/modules/advisor/api/employee";
import { VenueThumbnail } from "@/components/shared/VenueThumbnail";

// Backed by GET /venues, POST/GET /venue-bookings (VenuesController). Real
// CreateVenueBookingDto uses a single from_datetime/to_datetime ISO pair
// and an optional accommodating_strength — no separate "capacity required"
// free-text field exists. The form itself splits date and time into 4
// independent inputs (matching the pattern already live on the Secretary
// Venue page, src/app/(portal)/secretary/venue/page.tsx) and combines them
// into the two ISO datetimes on submit — no backend change needed.

function pill(status: string | null | undefined) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    approved: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    pending: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E3A8A" },
    rejected: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
  };
  const t = map[status ?? "pending"] ?? map.pending;
  return { padding: "6px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11.5, fontWeight: 800 } as const;
}

export default function AdvisorVenueBookingPage() {
  const [tab, setTab] = useState<"apply" | "history">("apply");
  const venues = useVenues();
  const bookings = useMyVenueBookings();
  const create = useCreateVenueBooking();

  const venueList = venues.data?.data ?? [];
  const [venueId, setVenueId] = useState<number | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [strength, setStrength] = useState("");

  const [formError, setFormError] = useState<string | null>(null);

  // Captured once via a lazy initializer rather than read inline during
  // render — reading the clock directly in the render body is impure
  // (component functions must be idempotent). A few seconds of staleness
  // is irrelevant here: the form takes far longer than that to fill in
  // before Submit is ever enabled.
  const [nowMs] = useState(() => Date.now());

  // Mirrors the real backend checks in VenuesService.createBooking exactly
  // (from_datetime must be in the future; from_datetime must be before
  // to_datetime) — validated here too instead of only surfacing as a 422
  // after submission. To Date defaults to From Date (same-day booking is
  // the common case) so a single day's booking only requires picking one
  // date, same as the Secretary Venue page's identical form.
  const fromMs = fromDate && fromTime ? new Date(`${fromDate}T${fromTime}:00`).getTime() : null;
  const toMs = fromTime && toTime ? new Date(`${toDate || fromDate}T${toTime}:00`).getTime() : null;
  const rangeInvalid = Boolean(fromMs !== null && toMs !== null && fromMs >= toMs);
  const pastDate = Boolean(fromMs !== null && fromMs <= nowMs);
  const canSubmit = Boolean(venueId && fromDate && fromTime && toTime && purpose) && !rangeInvalid && !pastDate;

  function submit() {
    if (!canSubmit || !venueId) return;
    setFormError(null);
    create.mutate(
      {
        venue_id: venueId,
        purpose,
        from_datetime: new Date(`${fromDate}T${fromTime}:00`).toISOString(),
        to_datetime: new Date(`${toDate || fromDate}T${toTime}:00`).toISOString(),
        accommodating_strength: strength ? Number(strength) : undefined,
      },
      {
        onSuccess: () => { setVenueId(""); setFromDate(""); setToDate(""); setFromTime(""); setToTime(""); setPurpose(""); setStrength(""); setTab("history"); },
        onError: (e) => setFormError(e instanceof Error ? e.message : "Failed to submit booking request."),
      },
    );
  }

  const rows = bookings.data?.data ?? [];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Venue</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>Booking requests for halls, labs and seminar rooms</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 11, padding: 4, flex: "0 0 auto" }}>
          {[
            { key: "apply" as const, label: "Apply" },
            { key: "history" as const, label: "History" },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <div
                key={t.key}
                data-advisor-lift=""
                onClick={() => setTab(t.key)}
                style={{ padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: active ? "#fff" : "transparent", color: active ? "#1D4ED8" : "#475569", boxShadow: active ? "0 1px 3px rgba(15,23,42,0.12)" : "none" }}
              >
                {t.label}
              </div>
            );
          })}
        </div>
      </div>

      {tab === "apply" && (
        <>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 24, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Venue Name</div>
              <select value={venueId} onChange={(e) => setVenueId(Number(e.target.value))} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff" }}>
                <option value="">Select a venue</option>
                {venueList.map((v) => (
                  <option key={v.id} value={v.id} disabled={!v.is_available}>
                    {v.name}{v.location ? ` · ${v.location}` : ""}
                    {v.exam_usage ? " (exam scheduled)" : !v.is_available ? " (booked)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18, marginTop: 18 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>From date</div>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff", color: "#0F172A" }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>To date</div>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff", color: "#0F172A" }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>From time</div>
                <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff", color: "#0F172A" }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>To time</div>
                <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: "#fff", color: "#0F172A" }} />
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Purpose</div>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value.slice(0, 255))}
                placeholder="e.g. Guest lecture on Deep Learning"
                style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff" }}
              />
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Capacity Required</div>
              <input
                value={strength}
                onChange={(e) => setStrength(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 120"
                style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff" }}
              />
            </div>
            {rangeInvalid && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
                From must be before To.
              </div>
            )}
            {pastDate && !rangeInvalid && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
                From must be in the future.
              </div>
            )}
            {formError && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
                {formError}
              </div>
            )}
            <div onClick={submit} style={{ marginTop: 20, textAlign: "center", padding: 16, background: create.isPending ? "#93C5FD" : canSubmit ? "#1D4ED8" : "#C7D2E0", color: "#fff", borderRadius: 11, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", cursor: canSubmit ? "pointer" : "not-allowed" }}>
              {create.isPending ? "Submitting…" : "Submit booking request"}
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>CURRENTLY BOOKED VENUES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14, marginTop: 12 }}>
              {venueList.filter((v) => v.booking || v.exam_usage).map((v) => (
                <div key={v.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <VenueThumbnail photoUrl={v.photo_url} name={v.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.015em" }}>{v.name}</div>
                      <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 4 }}>
                        {v.exam_usage ? v.exam_usage.exam_label : v.booking?.booked_by}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid #F1F4F9", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>
                      {v.exam_usage
                        ? new Date(v.exam_usage.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : v.booking && new Date(v.booking.from_datetime).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ padding: "5px 11px", borderRadius: 20, background: "#EFF6FF", border: "1px solid #DBEAFE", color: "#1D4ED8", fontSize: 11, fontWeight: 800 }}>
                      {v.exam_usage ? "EXAM SCHEDULED" : "BOOKED"}
                    </div>
                  </div>
                </div>
              ))}
              {venueList.filter((v) => v.booking || v.exam_usage).length === 0 && !venues.isLoading && (
                <div style={{ fontSize: 13.5, color: "#94A3B8", fontWeight: 600 }}>No venues currently booked.</div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {rows.map((h) => (
            <div key={h.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.015em", flex: 1 }}>{h.venue?.name ?? "—"}</div>
                <div style={pill(h.status)}>{(h.status ?? "pending").toUpperCase()}</div>
              </div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginTop: 6 }}>
                {new Date(h.from_datetime).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} – {new Date(h.to_datetime).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                {h.accommodating_strength ? ` · capacity ${h.accommodating_strength}` : ""}
              </div>
              <div style={{ fontSize: 13, color: "#7C8899", fontWeight: 500, marginTop: 8 }}>{h.purpose}</div>
            </div>
          ))}
          {rows.length === 0 && !bookings.isLoading && (
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 64, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>No venue bookings yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
