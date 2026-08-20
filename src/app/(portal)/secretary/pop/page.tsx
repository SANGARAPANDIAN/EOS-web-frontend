"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";
import { usePurchaseRequests, useCreatePurchaseRequest, type PurchaseRequestRow } from "@/modules/secretary/api/procurement";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";

// Pixel-exact layout port of the `isPop` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 206-267.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/creates go through
// `EOSbackend1`'s real `/me/purchase-requests` module (already
// purpose-built and Secretary-scoped — own requests only, see
// `src/modules/secretary/api/procurement.ts` header comment for the full
// gap accounting). Honest departures from the design, all because the
// real schema has no equivalent field/action (never faked):
//   - No `ref` (formatted request code) exists — shown as `PR-{id}`.
//   - No `amount` (₹ estimate) field exists on the real create DTO at all
//     — replaced with the real `quantity` (Int) field instead of inventing
//     a rupee figure.
//   - No `trail` (free-text audit line) column exists — replaced with the
//     real `hod_reviewed_at`/`finance_reviewed_at`/`created_at` timestamps.
//   - No "Draft" state exists — every request is created immediately as
//     "Awaiting HoD approval" (`pending_hod`), so Draft is dropped from
//     the filter pills.
//   - No Edit/Withdraw/Archive/"send reminder" endpoint exists for
//     Secretary at all (only Create + Read; HoD/Finance/Admin own the
//     write actions past that) — those buttons are removed rather than
//     wired to a fake local-state mutation.
//   - The real workflow is Secretary → HoD → Finance → Admin-converted
//     (no literal "Principal" stage reachable through this endpoint, even
//     though a separate `principal_approved` status value exists on the
//     underlying table via a different, HoD/Principal-only approval path)
//     — status labels reflect the REAL stage names, not the design's own
//     "Sent to Principal" wording.

const STATUS_LABEL: Record<string, string> = {
  pending_hod: "Awaiting HoD approval",
  pending_finance: "Awaiting Finance approval",
  approved: "Finance approved",
  rejected_by_hod: "Rejected by HoD",
  rejected_by_finance: "Rejected by Finance",
  converted: "Purchase order raised",
};
const FILTER_KEYS = ["all", "pending_hod", "pending_finance", "approved", "converted", "rejected_by_hod", "rejected_by_finance"] as const;

const POP_FIELDS: QuickFieldSpec[] = [
  { key: "item_name", label: "What is being purchased", type: "text", placeholder: "e.g. 12 GPU workstations" },
  { key: "quantity", label: "Quantity", type: "text", placeholder: "1" },
  { key: "needed_by", label: "Needed by (YYYY-MM-DD)", type: "text", placeholder: "2026-08-22" },
  { key: "purpose", label: "Justification", type: "area", placeholder: "Vendors compared, lowest compliant bid, warranty terms..." },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SecretaryPopPage() {
  const [filter, setFilter] = useState<(typeof FILTER_KEYS)[number]>("all");
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: rows, isLoading, error } = usePurchaseRequests(filter === "all" ? undefined : filter);
  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const createMutation = useCreatePurchaseRequest();

  const filtered = rows ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: (rows ?? []).length };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  function openCreate() {
    setForm({ item_name: "", quantity: "1", needed_by: "", purpose: "" });
    setModalOpen(true);
  }
  async function submit() {
    if (!form.item_name?.trim()) {
      flash("Please fill in what is being purchased before saving.");
      return;
    }
    if (!cseDept) {
      flash("Department list isn't loaded yet — try again in a moment.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        department_id: cseDept.id,
        item_name: form.item_name,
        quantity: parseInt(form.quantity, 10) || 1,
        purpose: form.purpose || undefined,
        needed_by: form.needed_by || undefined,
      });
      setModalOpen(false);
      flash("Purchase request submitted to the HoD.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>POP Requests</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Purchase order proposals you raise — real approval chain: HoD → Finance → Admin</p>
        </div>
        <button onClick={openCreate} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ New POP request</button>
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
        {filtered.map((p: PurchaseRequestRow) => {
          const label = STATUS_LABEL[p.status] ?? p.status;
          const t = tone(label);
          return (
            <div key={p.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.6, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "5px 10px" }}>POP</span>
                <span style={{ fontSize: 11.7, color: "#94a3b8" }}>PR-{p.id} · raised {fmtDate(p.created_at)}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.8, fontWeight: 600, borderRadius: 999, padding: "6px 13px", background: t.bg, color: t.fg }}>{label}</span>
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 600, margin: "14px 0 6px" }}>{p.title}</div>
              <div style={{ fontSize: 12.2, color: "#475569", lineHeight: 1.6 }}>{p.purpose || "—"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18, borderTop: "1px solid #eef2f7", marginTop: 18, paddingTop: 16 }}>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Raised by</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{p.raised_by?.email ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Quantity</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{p.quantity}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Needed by</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{fmtDate(p.needed_by)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Department</div>
                  <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{p.department?.name ?? "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                <span style={{ fontSize: 11.3, color: "#94a3b8" }}>
                  {p.hod_reviewed_at ? `HoD reviewed ${fmtDate(p.hod_reviewed_at)}` : p.finance_reviewed_at ? `Finance reviewed ${fmtDate(p.finance_reviewed_at)}` : "Awaiting review"}
                </span>
                {p.order_number && <span style={{ marginLeft: "auto", fontSize: 11.7, fontWeight: 600, color: "#1d4ed8" }}>PO #{p.order_number}</span>}
              </div>
            </div>
          );
        })}
        {!isLoading && !error && filtered.length === 0 && (
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No POP requests in this state.</div>
        )}
      </div>

      <QuickModal
        open={modalOpen}
        title="New POP request"
        subtitle="Purchase order proposal · real approval chain: HoD → Finance → Admin"
        cta="Submit to HoD"
        fields={POP_FIELDS}
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
