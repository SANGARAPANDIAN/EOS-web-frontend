"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import {
  useServiceRequests,
  useCreateServiceRequest,
  useUpdateServiceRequest,
  useSubmitServiceRequest,
  useDeleteServiceRequest,
  type ServiceRequestRow,
  type ServiceRequestStatus,
} from "@/modules/secretary/api/procurement";

// Pixel-exact layout port of the `isSop` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 269-340.
//
// REAL BACKEND WIRING — full CRUD, now actually reachable. A master live
// checkup found this screen was, in fact, silently talking to a DIFFERENT
// module the whole time: `procurement/service-requests` registers the
// exact same `me/service-requests` route and, being imported earlier in
// app.module.ts, permanently shadowed the real Secretary-owned module
// (table: secretary_service_requests + secretary_service_request_items —
// multi-item, draft-first, single Admin decision). Fixed by moving the
// Procurement module to a distinct path (no other page called it) —
// this screen now talks to the real module its own DTOs/comments always
// described as "the Secretary Portal's self-service SOP feature".
//
// Real workflow: create as 'draft' (editable, deletable) -> add/edit
// service line items -> Submit -> 'pending' -> Admin approves/rejects
// (real push notification either way). No department/location/needed-by
// columns exist on this real table (those belonged to the OTHER module) —
// dropped rather than faked.

const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  draft: "Draft",
  pending: "Awaiting Admin review",
  approved: "Approved",
  rejected: "Rejected",
};
const FILTER_KEYS = ["all", "draft", "pending", "approved", "rejected"] as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SecretarySopPage() {
  const [filter, setFilter] = useState<(typeof FILTER_KEYS)[number]>("all");
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [justification, setJustification] = useState("");
  const [items, setItems] = useState<string[]>([""]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: rows, isLoading, error } = useServiceRequests(filter === "all" ? undefined : filter);
  const createMutation = useCreateServiceRequest();
  const updateMutation = useUpdateServiceRequest();
  const submitMutation = useSubmitServiceRequest();
  const deleteMutation = useDeleteServiceRequest();

  const filtered = rows ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: (rows ?? []).length };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const metrics = useMemo(() => {
    const all = rows ?? [];
    const resolved = all.map((r) => r.reviewed_at).filter((d): d is string => !!d);
    const avgTurnaround =
      resolved.length > 0
        ? (
            all
              .filter((r) => r.reviewed_at)
              .reduce((sum, r) => sum + (new Date(r.reviewed_at!).getTime() - new Date(r.created_at).getTime()) / 86400000, 0) / resolved.length
          ).toFixed(1)
        : "—";
    return [
      { label: "Average turnaround", value: avgTurnaround === "—" ? "—" : `${avgTurnaround} days` },
      { label: "Approved (all time)", value: String(all.filter((r) => r.status === "approved").length) },
      { label: "Drafts", value: String(all.filter((r) => r.status === "draft").length) },
      { label: "Rejected", value: String(all.filter((r) => r.status === "rejected").length) },
    ];
  }, [rows]);

  function openCreate() {
    setEditingId(null);
    setTitle(""); setJustification(""); setItems([""]);
    setModalOpen(true);
  }
  function openEdit(r: ServiceRequestRow) {
    setEditingId(r.id);
    setTitle(r.title); setJustification(r.justification ?? ""); setItems(r.items.length ? r.items.map((i) => i.service_name) : [""]);
    setModalOpen(true);
  }
  function updateItem(i: number, value: string) {
    setItems((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }
  function addItem() {
    setItems((prev) => [...prev, ""]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveDraft() {
    if (!title.trim()) {
      flash("Please fill in the title before saving.");
      return;
    }
    const cleanItems = items.map((s) => s.trim()).filter(Boolean).map((service_name) => ({ service_name }));
    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, input: { title, justification: justification || undefined, items: cleanItems.length ? cleanItems : undefined } });
        flash("Draft updated.");
      } else {
        await createMutation.mutateAsync({ title, justification: justification || undefined, items: cleanItems.length ? cleanItems : undefined });
        flash("Draft saved — add services and submit when ready.");
      }
      setModalOpen(false);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save the request.");
    }
  }
  async function onSubmitRequest(r: ServiceRequestRow) {
    try {
      await submitMutation.mutateAsync(r.id);
      flash("SOP request submitted for Admin review.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not submit — add at least one service first.");
    }
  }
  async function onWithdraw(r: ServiceRequestRow) {
    try {
      await deleteMutation.mutateAsync(r.id);
      flash("Draft deleted.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not delete the request.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>SOP Requests</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Draft, edit, then submit for Admin review</p>
        </div>
        <button onClick={openCreate} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ New SOP request</button>
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
          {filtered.map((r) => {
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
                {r.justification && <div style={{ fontSize: 12.2, color: "#475569", lineHeight: 1.6 }}>{r.justification}</div>}
                {r.items.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {r.items.map((it) => (
                      <span key={it.id} style={{ fontSize: 11.7, fontWeight: 500, color: "#334155", background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 999, padding: "6px 12px" }}>{it.service_name}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                  <span style={{ fontSize: 11.3, color: "#94a3b8" }}>
                    {r.reviewed_by ? `Reviewed by ${r.reviewed_by.name} · ${fmtDate(r.reviewed_at)}` : "Not yet reviewed"}
                  </span>
                  {r.status === "draft" && (
                    <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                      <span onClick={() => openEdit(r)} style={{ fontSize: 11.7, fontWeight: 600, color: "#1e3a8a", cursor: "pointer" }}>Edit</span>
                      <span onClick={() => onWithdraw(r)} style={{ fontSize: 11.7, fontWeight: 600, color: "#b91c1c", cursor: "pointer" }}>Delete</span>
                      <span onClick={() => onSubmitRequest(r)} style={{ fontSize: 11.7, fontWeight: 700, color: "#1d4ed8", cursor: "pointer" }}>Submit →</span>
                    </div>
                  )}
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

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, zIndex: 90 }} onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: "86vh", overflowY: "auto", background: "#ffffff", borderRadius: 18, boxShadow: "0 30px 70px rgba(15,23,42,0.28)" }}>
            <div style={{ padding: "24px 26px 18px", borderBottom: "1px solid #eef2f7" }}>
              <div style={{ fontSize: 19.1, fontWeight: 700, letterSpacing: -0.4 }}>{editingId !== null ? "Edit SOP draft" : "New SOP request"}</div>
              <div style={{ fontSize: 11.7, color: "#64748b", marginTop: 4 }}>Saved as a draft — submit when ready</div>
            </div>
            <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 11.8, fontWeight: 600, color: "#475569", marginBottom: 7 }}>Request title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AC repair — CSE seminar hall" style={{ width: "100%", height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 12.6 }} />
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 11.8, fontWeight: 600, color: "#475569", marginBottom: 7 }}>Justification</span>
                <textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Why is this needed?" style={{ width: "100%", minHeight: 80, border: "1px solid #e5e9f2", borderRadius: 10, padding: "12px 14px", fontSize: 12.6, fontFamily: "inherit", resize: "vertical" }} />
              </label>
              <div>
                <span style={{ display: "block", fontSize: 11.8, fontWeight: 600, color: "#475569", marginBottom: 7 }}>Services needed</span>
                <div style={{ display: "grid", gap: 8 }}>
                  {items.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <input value={v} onChange={(e) => updateItem(i, e.target.value)} placeholder="e.g. AC servicing" style={{ flex: 1, height: 42, border: "1px solid #e5e9f2", borderRadius: 8, padding: "0 12px", fontSize: 12.6 }} />
                      {items.length > 1 && <span onClick={() => removeItem(i)} style={{ display: "flex", alignItems: "center", padding: "0 10px", color: "#b91c1c", cursor: "pointer", fontSize: 12.6, fontWeight: 600 }}>✕</span>}
                    </div>
                  ))}
                </div>
                <span onClick={addItem} style={{ display: "inline-block", marginTop: 10, fontSize: 11.7, fontWeight: 600, color: "#1d4ed8", cursor: "pointer" }}>＋ Add another service</span>
              </div>
            </div>
            <div style={{ padding: "18px 26px 24px", borderTop: "1px solid #eef2f7", display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <span onClick={() => setModalOpen(false)} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 12.2, fontWeight: 600, borderRadius: 10, padding: "12px 20px", cursor: "pointer" }}>Cancel</span>
              <span onClick={saveDraft} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 12.2, fontWeight: 600, borderRadius: 10, padding: "12px 24px", cursor: "pointer" }}>{editingId !== null ? "Save changes" : "Save draft"}</span>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
