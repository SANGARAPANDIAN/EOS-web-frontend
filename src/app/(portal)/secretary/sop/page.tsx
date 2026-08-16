"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";
import { useServiceRequests, useCreateServiceRequest, type ServiceRequestRow } from "@/modules/secretary/api/procurement";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";

// Pixel-exact layout port of the `isSop` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 269-340.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/creates go through
// `EOSbackend1`'s real `/me/service-requests` module (Secretary-scoped —
// own requests only, mirrors /me/purchase-requests exactly). Honest
// departures from the design (never faked):
//   - No `ref`/`category`/`priority`/numeric `stage` columns exist on the
//     real `service_indents` table — `category`/`priority` pickers are
//     dropped from the composer; shown as `SR-{id}` instead of a ref.
//   - No Draft state, no Edit/Withdraw/"send reminder" endpoint exists for
//     Secretary — those actions are removed rather than faked.
//   - "Average turnaround" is now a REAL computed average — days between
//     `created_at` and the request's most recent review timestamp, across
//     the secretary's own real requests (not a hardcoded "4.2 days").
//   - Status labels reflect the real HoD → Finance → Admin-converted
//     chain (see procurement.ts's header comment for the pre-existing
//     Principal-approval-chain conflict this surfaces, unrelated to this
//     wiring).

const STATUS_LABEL: Record<string, string> = {
  pending_hod: "Awaiting HoD approval",
  pending_finance: "Awaiting Finance approval",
  approved: "Finance approved",
  rejected_by_hod: "Rejected by HoD",
  rejected_by_finance: "Rejected by Finance",
  converted: "Service order raised",
};
const FILTER_KEYS = ["all", "pending_hod", "pending_finance", "approved", "converted", "rejected_by_hod", "rejected_by_finance"] as const;

const SOP_FIELDS: QuickFieldSpec[] = [
  { key: "title", label: "Request title", type: "text", placeholder: "e.g. AC repair — CSE seminar hall" },
  { key: "service_description", label: "Details", type: "area", placeholder: "Describe the service needed" },
  { key: "location", label: "Location", type: "text", placeholder: "e.g. CSE seminar hall" },
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
  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const createMutation = useCreateServiceRequest();

  const filtered = rows ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: (rows ?? []).length };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const metrics = useMemo(() => {
    const all = rows ?? [];
    const resolvedDurations = all
      .map((r) => {
        const resolvedAt = r.finance_reviewed_at ?? r.hod_reviewed_at;
        if (!resolvedAt) return null;
        return (new Date(resolvedAt).getTime() - new Date(r.created_at).getTime()) / 86400000;
      })
      .filter((d): d is number => d !== null);
    const avgTurnaround = resolvedDurations.length > 0 ? (resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length).toFixed(1) : "—";
    return [
      { label: "Average turnaround", value: avgTurnaround === "—" ? "—" : `${avgTurnaround} days` },
      { label: "Finance approved (all time)", value: String(all.filter((r) => r.status === "approved" || r.status === "converted").length) },
      { label: "Awaiting HoD", value: String(all.filter((r) => r.status === "pending_hod").length) },
      { label: "Rejected", value: String(all.filter((r) => r.status.startsWith("rejected")).length) },
    ];
  }, [rows]);

  function openCreate() {
    setForm({ title: "", service_description: "", location: "", needed_by: "" });
    setModalOpen(true);
  }
  async function submit() {
    if (!form.title?.trim()) {
      flash("Please fill in the title before saving.");
      return;
    }
    if (!cseDept) {
      flash("Department list isn't loaded yet — try again in a moment.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        department_id: cseDept.id,
        title: form.title,
        service_description: form.service_description || "—",
        location: form.location || undefined,
        needed_by: form.needed_by || undefined,
      });
      setModalOpen(false);
      flash("SOP request submitted for review.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit the request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>SOP Requests</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Raise service requests — real approval chain: HoD → Finance → Admin</p>
        </div>
        <button onClick={openCreate} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ Submit SOP request</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
          <div data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #eef2f7", flexWrap: "wrap" }}>
            {FILTER_KEYS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  border: filter === f ? "1px solid #1e3a8a" : "1px solid #e5e9f2",
                  background: filter === f ? "#1e3a8a" : "#ffffff",
                  color: filter === f ? "#ffffff" : "#475569",
                  fontSize: 11.7, fontWeight: filter === f ? 600 : 500, borderRadius: 999, padding: "8px 16px", cursor: "pointer",
                }}
              >
                {f === "all" ? `All (${counts.all ?? 0})` : `${STATUS_LABEL[f]} (${counts[f] ?? 0})`}
              </button>
            ))}
          </div>
          {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading requests…</div>}
          {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load requests."}</div>}
          {filtered.map((r: ServiceRequestRow) => {
            const label = STATUS_LABEL[r.status] ?? r.status;
            const t = tone(label);
            return (
              <div key={r.id} style={{ padding: "22px 24px", borderBottom: "1px solid #f5f7fa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.6, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "5px 10px" }}>SOP</span>
                  <span style={{ fontSize: 11.7, color: "#94a3b8" }}>SR-{r.id} · raised {fmtDate(r.created_at)}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.8, fontWeight: 600, borderRadius: 999, padding: "6px 13px", background: t.bg, color: t.fg }}>{label}</span>
                </div>
                <div style={{ fontSize: 15.7, fontWeight: 600, margin: "14px 0 6px" }}>{r.title}</div>
                <div style={{ fontSize: 12.2, color: "#475569", lineHeight: 1.6 }}>{r.service_description}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18, borderTop: "1px solid #eef2f7", marginTop: 18, paddingTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Raised by</div>
                    <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{r.raised_by?.email ?? "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#94a3b8" }}>Location</div>
                    <div style={{ fontSize: 12.6, fontWeight: 600, marginTop: 6 }}>{r.location ?? "—"}</div>
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
                  {r.order_number && <span style={{ marginLeft: "auto", fontSize: 11.7, fontWeight: 600, color: "#1d4ed8" }}>SO #{r.order_number}</span>}
                </div>
              </div>
            );
          })}
          {!isLoading && !error && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No requests in this state.</div>
          )}
        </div>

        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 14.8, fontWeight: 700 }}>Turnaround</h2>
          {metrics.map((m) => (
            <div key={m.label} data-sec-row="" style={{ padding: "11px 0", borderBottom: "1px solid #f5f7fa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.7, color: "#475569" }}>{m.label}</span>
              <span style={{ fontSize: 12.6, fontWeight: 700 }}>{m.value}</span>
            </div>
          ))}
          <p style={{ fontSize: 11.8, color: "#94a3b8", margin: "14px 0 0" }}>Computed live from your own real requests.</p>
        </div>
      </div>

      <QuickModal
        open={modalOpen}
        title="Submit SOP request"
        subtitle="Routed to the HoD, then Finance"
        cta="Submit request"
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
