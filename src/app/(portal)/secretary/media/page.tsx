"use client";

import { useMemo, useRef, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { useVenues } from "@/modules/secretary/api/venues";
import { useMediaRequests, useCreateMediaRequest, useDeleteMediaRequest, useUploadMediaRequestAttachment, type MediaRequestRow } from "@/modules/secretary/api/mediaRequests";

// Pixel-exact layout port of the `isMedia` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1612-1731.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/creates/withdraws through
// EOSbackend1's real `/media-requests` module (Secretary added; the
// service previously required a `faculty` row for every caller — added a
// distinct Secretary branch, see media-requests.service.ts). The real
// `media_requests` table already had event_name/event_date/venue_id/
// coordinator_name/contact_number/media_types columns that the old DTO
// never accepted — extended it (no migration) so this composer's real
// fields have somewhere to persist.
//
// Honest drops (no backend column exists): "Chief guest"/"Guest
// designation"/"Poster needed by" as distinct fields — folded into the
// free-text `description` field instead of inventing new columns. Status
// enum is real (`pending/approved/rejected/delivered`) — no "In progress"/
// "Published" values exist, so labels reflect the real ones.
//
// Attachment is a REAL upload now (was a flash-only fake toggle) —
// POST /me/media-requests/attachments (new StorageService-backed route,
// same Supabase Storage pattern as announcements), returned url sent back
// as media_file_url on create (CreateMediaRequestDto extended to accept
// it — was previously Media-Room-write-only via a raw URL PATCH).

const MEDIA_TYPE_OPTIONS = ["Poster", "Photography", "Videography", "Social media post"];
const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", delivered: "Delivered" };
const inputSx = { width: "100%", height: 50, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 16px", fontSize: 13.1, background: "#fbfcfe", color: "#0f172a" } as const;
const labelSx = { display: "block", fontSize: 12.2, fontWeight: 600, color: "#1d4ed8", marginBottom: 9 } as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "not set";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SecretaryMediaPage() {
  const [tab, setTab] = useState<"Raise request" | "History">("Raise request");
  const [toast, setToast] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAttachment = useUploadMediaRequestAttachment();

  const [eventName, setEventName] = useState("");
  const [venueId, setVenueId] = useState<number | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [mediaTypes, setMediaTypes] = useState<string[]>(["Poster"]);
  const [description, setDescription] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const windowFrom = useMemo(() => new Date().toISOString(), []);
  const windowTo = useMemo(() => new Date(Date.now() + 180 * 86400000).toISOString(), []);
  const { data: venues } = useVenues(windowFrom, windowTo);
  const { data: requests, isLoading, error } = useMediaRequests();
  const createMutation = useCreateMediaRequest();
  const deleteMutation = useDeleteMediaRequest();

  function toggleType(t: string) {
    setMediaTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const uploaded = await uploadAttachment.mutateAsync(file);
      setAttachedFile({ name: file.name, url: uploaded.url });
      flash(`${file.name} attached.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not upload the file.");
    }
  }

  async function submit() {
    if (!eventName.trim()) { flash("Add the event title before sending the request."); return; }
    if (!venueId) { flash("Pick the venue so the media team knows where the event is."); return; }
    if (!eventDate) { flash("Pick the event date before sending."); return; }
    try {
      await createMutation.mutateAsync({
        description: description || "—",
        event_name: eventName,
        event_date: eventDate,
        venue_id: venueId,
        coordinator_name: coordinatorName || undefined,
        contact_number: contactNumber || undefined,
        media_types: mediaTypes,
        media_file_url: attachedFile?.url,
      });
      setEventName(""); setVenueId(null); setEventDate(""); setCoordinatorName(""); setContactNumber(""); setMediaTypes(["Poster"]); setDescription(""); setAttachedFile(null);
      setTab("History");
      flash("Media request sent to the media team.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the request.");
    }
  }

  async function onWithdraw(m: MediaRequestRow) {
    try {
      await deleteMutation.mutateAsync(m.id);
      flash(`Request MR-${m.id} withdrawn.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not withdraw the request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Media Request</h1>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>Request event coverage from the media team — real approval by Media Room</p>
        </div>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 5 }}>
          {(["Raise request", "History"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ border: 0, background: tab === t ? "#ffffff" : "transparent", color: tab === t ? "#1d4ed8" : "#64748b", fontSize: 13.1, fontWeight: tab === t ? 600 : 500, padding: "11px 28px", borderRadius: 9, cursor: "pointer", boxShadow: tab === t ? "0 1px 2px rgba(15,23,42,0.08)" : "none" }}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "Raise request" && (
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "26px 28px" }}>
          <div style={{ fontSize: 12.6, fontWeight: 700, color: "#0f172a", marginBottom: 18 }}>Event details</div>
          <label style={{ display: "block" }}>
            <span style={labelSx}>Event title</span>
            <input data-sec-lift="" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. National Workshop on Applied Machine Learning" style={inputSx} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22, marginTop: 20 }}>
            <label style={{ display: "block" }}>
              <span style={labelSx}>Venue</span>
              <select data-sec-lift="" value={venueId ?? ""} onChange={(e) => setVenueId(parseInt(e.target.value, 10) || null)} style={{ ...inputSx, color: "#0f172a" }}>
                <option value="">Select a venue</option>
                {(venues?.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <span style={labelSx}>Event date</span>
              <input data-sec-lift="" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={inputSx} />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22, marginTop: 20 }}>
            <label style={{ display: "block" }}>
              <span style={labelSx}>Organised by / coordinator</span>
              <input data-sec-lift="" value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} placeholder="e.g. Dr. S. Meena" style={inputSx} />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelSx}>Contact number</span>
              <input data-sec-lift="" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g. 98765 43210" style={inputSx} />
            </label>
          </div>
          <div style={{ marginTop: 20 }}>
            <span style={labelSx}>Media coverage needed</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {MEDIA_TYPE_OPTIONS.map((t) => (
                <span key={t} data-sec-nav-item="" onClick={() => toggleType(t)} style={{ border: mediaTypes.includes(t) ? "1px solid #c7d7fe" : "1px solid #e5e9f2", background: mediaTypes.includes(t) ? "#eef4ff" : "#ffffff", color: mediaTypes.includes(t) ? "#1e3a8a" : "#475569", fontSize: 12.2, fontWeight: mediaTypes.includes(t) ? 600 : 500, borderRadius: 999, padding: "9px 16px", cursor: "pointer" }}>{t}</span>
              ))}
            </div>
          </div>
          <label style={{ display: "block", marginTop: 22 }}>
            <span style={labelSx}>Other details</span>
            <textarea data-sec-lift="" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Chief guest, registration link, entry fee, theme, quote to print..." style={{ ...inputSx, minHeight: 120, padding: "14px 16px", lineHeight: 1.6, resize: "vertical" }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 22, marginTop: 20, alignItems: "end" }}>
            <label style={{ display: "block" }}>
              <span style={labelSx}>Logos / guest photo / reference poster</span>
              <input ref={fileInputRef} type="file" onChange={onPickFile} style={{ display: "none" }} />
              <span
                onClick={() => (attachedFile ? setAttachedFile(null) : fileInputRef.current?.click())}
                style={{ display: "block", width: "100%", height: 50, border: "1px dashed #c7d7fe", background: "#ffffff", color: "#1d4ed8", fontSize: 12.6, fontWeight: 600, borderRadius: 10, cursor: "pointer", textAlign: "center", lineHeight: "50px", opacity: uploadAttachment.isPending ? 0.6 : 1 }}
              >
                {uploadAttachment.isPending ? "Uploading…" : attachedFile ? `${attachedFile.name} ✓ (click to remove)` : "Attach logos, guest photo or reference"}
              </span>
            </label>
            <div style={{ fontSize: 11.7, color: "#94a3b8" }}>The media team reviews and shares a file back through this request once approved.</div>
          </div>
          <button onClick={submit} disabled={createMutation.isPending} style={{ width: "100%", marginTop: 24, border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.9, fontWeight: 700, borderRadius: 12, padding: "18px 0", cursor: "pointer", opacity: createMutation.isPending ? 0.7 : 1 }}>Send Media Request</button>
        </div>
      )}

      {tab === "History" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading requests…</div>}
          {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load requests."}</div>}
          {(requests?.data ?? []).map((m) => {
            const label = STATUS_LABEL[m.status] ?? m.status;
            const t = tone(label);
            return (
              <div key={m.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.3, color: "#94a3b8", letterSpacing: 0.5 }}>MR-{m.id}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10.8, fontWeight: 700, letterSpacing: 0.7, borderRadius: 7, padding: "6px 11px", background: t.bg, color: t.fg }}>{label.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 16.1, fontWeight: 700, margin: "12px 0 6px", letterSpacing: -0.3 }}>{m.event_name ?? m.description}</div>
                <div style={{ fontSize: 12.2, color: "#64748b" }}>{m.media_types.join(", ") || "—"} · event date {fmtDate(m.event_date)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginTop: 14 }}>
                  <div><div style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>VENUE</div><div style={{ fontSize: 12.6, color: "#0f172a", marginTop: 5 }}>{m.venue?.name ?? "—"}</div></div>
                  <div><div style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>COORDINATOR</div><div style={{ fontSize: 12.6, color: "#0f172a", marginTop: 5 }}>{m.coordinator_name ?? "—"}</div></div>
                  <div><div style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>CONTACT</div><div style={{ fontSize: 12.6, color: "#0f172a", marginTop: 5 }}>{m.contact_number ?? "—"}</div></div>
                  <div><div style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8" }}>RAISED</div><div style={{ fontSize: 12.6, color: "#0f172a", marginTop: 5 }}>{fmtDate(m.created_at)}</div></div>
                </div>
                <div style={{ fontSize: 12.6, color: "#475569", lineHeight: 1.6, marginTop: 12 }}>{m.description}</div>
                {m.media_file_url && (
                  <div style={{ marginTop: 12 }}>
                    <a href={m.media_file_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.7, fontWeight: 600, color: "#1d4ed8" }}>Download shared file →</a>
                  </div>
                )}
                {m.status === "pending" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                      <span onClick={() => onWithdraw(m)} style={{ border: 0, background: "transparent", color: "#b91c1c", fontSize: 11.7, fontWeight: 600, cursor: "pointer" }}>Withdraw</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!isLoading && !error && (requests?.data.length ?? 0) === 0 && (
            <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No media requests raised yet.</div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
