"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";
import { useServiceRequests, useCreateServiceRequest, type ServiceRequestRow } from "@/modules/secretary/api/procurement";
import { useMyIdentity } from "@/modules/student/api/profile";

// Pixel-exact layout port of the `isSop` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 269-340.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/creates go through
// `EOSbackend1`'s real `/me/procurement-service-requests` module — the
// real HoD-then-Finance approval chain (same one HOD's own SOP/POP
// Requests page reads from). Rewired here 2026-09-26: this screen
// previously talked to a disconnected `secretary/service-requests` module
// (table: secretary_service_requests) whose only decision-maker was Admin,
// with no HoD or Finance stage at all — confirmed via direct code reading
// and live-testing Secretary/HoD/Finance/Admin, not the "Secretary/HoD/
// Finance/Admin shape" an earlier code comment incorrectly claimed. That
// module, its Admin-only review screen, and its dead controller/service
// code have all been retired — see procurement.ts's header comment.
//
// Honest departures from the original design mock, because the real
// schema has no equivalent field/action (never faked):
//   - No `ref` (formatted request code) exists — shown as `SR-{id}`.
//   - No multi-item list or Draft-then-submit step exists — every request
//     is a single service description, created immediately as "Awaiting
//     HoD approval" (`pending_hod`).
//   - No Edit/Withdraw endpoint exists for Secretary at all (only Create +
//     Read; HoD/Finance own the write actions past that) — those buttons
//     are removed rather than wired to a fake local-state mutation.

const STATUS_LABEL: Record<string, string> = {
  pending_hod: "Awaiting HoD approval",
  pending_finance: "Awaiting Finance approval",
  approved: "Finance approved",
  rejected_by_hod: "Rejected by HoD",
  rejected_by_finance: "Rejected by Finance",
  converted: "Order raised",
};
const FILTER_KEYS = ["all", "pending_hod", "pending_finance", "approved", "converted", "rejected_by_hod", "rejected_by_finance"] as const;

const SOP_FIELDS: QuickFieldSpec[] = [
  { key: "title", label: "Request title", type: "text", placeholder: "e.g. AC repair — CSE seminar hall" },
  { key: "service_description", label: "What service is needed", type: "area", placeholder: "e.g. Two ACs not cooling, need servicing" },
  { key: "quantity", label: "Quantity", type: "text", placeholder: "1" },
  { key: "location", label: "Location", type: "text", placeholder: "e.g. Server room" },
  { key: "needed_by", label: "Needed by (YYYY-MM-DD)", type: "text", placeholder: "2026-08-22" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SecretarySopPage() {
  const [filter, setFilter] = useState<(typeof FILTER_KEYS)[number]>("all");
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: rows, isLoading, error } = useServiceRequests(filter === "all" ? undefined : filter);
  const { data: identity } = useMyIdentity();
  const myDept = useMemo(() => (identity?.department_id != null ? { id: identity.department_id } : undefined), [identity]);

  const createMutation = useCreateServiceRequest();

  const filtered = rows ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: (rows ?? []).length };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  function openCreate() {
    setForm({ title: "", service_description: "", quantity: "1", location: "", needed_by: "" });
    setModalOpen(true);
  }
  async function submit() {
    if (!form.title?.trim()) {
      flash("Please fill in the request title before saving.");
      return;
    }
    if (!form.service_description?.trim()) {
      flash("Please describe the service needed before saving.");
      return;
    }
    if (!myDept) {
      flash("Department list isn't loaded yet — try again in a moment.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        department_id: myDept.id,
        title: form.title,
        service_description: form.service_description,
        quantity: form.quantity || undefined,
        location: form.location || undefined,
        needed_by: form.needed_by || undefined,
      });
      setModalOpen(false);
      flash("Service request submitted to the HoD.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>SOP Requests</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Service order proposals you raise — real approval chain: HoD → Finance</p>
        </div>
        <button onClick={openCreate} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ New SOP request</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTER_KEYS.map((f) => (
          <button
            key={f}
            data-sec-nav-item=""
            onClick={() => setFilter(f)}
            style={{
              border: filter === f ? "1px solid #c7d7fe" : "1px solid #e5e9f2",
              background: filter === f ? "#eef4ff" : "#ffffff",
              color: filter === f ? "#1e3a8a" : "#475569",
              fontSize: 12.2, fontWeight: filter === f ? 600 : 500, borderRadius: 999, padding: "10px 18px", cursor: "pointer",
            }}
          >
            {f === "all" ? `All (${counts.all ?? 0})` : `${STATUS_LABEL[f]} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading requests…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load requests."}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map((r: ServiceRequestRow) => {
          const label = STATUS_LABEL[r.status] ?? r.status;
          const t = tone(label);
          return (
            <div key={r.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.6, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "5px 10px" }}>SOP</span>
                <span style={{ fontSize: 11.7, color: "#94a3b8" }}>SR-{r.id} · raised {fmtDate(r.created_at)}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.8, fontWeight: 600, borderRadius: 999, padding: "6px 13px", background: t.bg, color: t.fg }}>{label}</span>
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 600, margin: "14px 0 6px" }}>{r.title}</div>
              <div style={{ fontSize: 12.2, color: "#475569", lineHeight: 1.6 }}>{r.service_description || "—"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18, borderTop: "1px solid #eef2f7", marginTop: 18, paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Raised by</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{r.raised_by?.email ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Quantity</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{r.quantity ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Needed by</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{fmtDate(r.needed_by)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Department</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{r.department?.name ?? "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                <span style={{ fontSize: 11.3, color: "#94a3b8" }}>
                  {r.hod_reviewed_at ? `HoD reviewed ${fmtDate(r.hod_reviewed_at)}` : r.finance_reviewed_at ? `Finance reviewed ${fmtDate(r.finance_reviewed_at)}` : "Awaiting review"}
                </span>
                {r.order_number && <span style={{ marginLeft: "auto", fontSize: 11.7, fontWeight: 600, color: "#1d4ed8" }}>Order #{r.order_number}</span>}
              </div>
            </div>
          );
        })}
        {!isLoading && !error && filtered.length === 0 && (
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No SOP requests in this state.</div>
        )}
      </div>

      <QuickModal
        open={modalOpen}
        title="New SOP request"
        subtitle="Service order proposal · real approval chain: HoD → Finance"
        cta="Submit to HoD"
        fields={SOP_FIELDS}
        values={form}
        onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
        onClose={() => setModalOpen(false)}
        onSubmit={submit}
      />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
