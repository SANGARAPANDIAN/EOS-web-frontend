"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";
import { useDocuments, useCreateDocument, useToggleVerifyDocument, useDeleteDocument, type DocumentRow } from "@/modules/secretary/api/documents";

// Pixel-exact layout port of the `isDocs` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1289-1331.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// new `/me/department-documents` module (built this session against the
// real `department_documents` table added via the Secretary module
// completion migration). Honest departure: no arbitrary-owner-assignment
// concept exists — the uploader (the logged-in Secretary) is always the
// real owner, so the composer's "Owner" picker is dropped; "Owner" column
// shows the real uploader's email instead.

const FILTER_LABELS = ["All", "Course file", "Lab record", "Circular", "Accreditation", "Meeting"] as const;

const DOC_FIELDS: QuickFieldSpec[] = [
  { key: "name", label: "Document name", type: "text", placeholder: "e.g. CAE-II question papers · CSE" },
  { key: "category", label: "Category", type: "select", options: ["Course file", "Lab record", "Circular", "Accreditation", "Meeting"] },
  { key: "size_mb", label: "File size (MB)", type: "text", placeholder: "4" },
];

function fmtSize(bytes: number | null): string {
  if (bytes === null) return "—";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function SecretaryDocsPage() {
  const [filter, setFilter] = useState<(typeof FILTER_LABELS)[number]>("All");
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const { data: docs, isLoading, error } = useDocuments({ department_id: cseDept?.id, category: filter === "All" ? undefined : filter });
  const createMutation = useCreateDocument();
  const verifyMutation = useToggleVerifyDocument();
  const deleteMutation = useDeleteDocument();

  const filtered = docs?.data ?? [];

  function openCreate() {
    setForm({ name: "", category: "Course file", size_mb: "4" });
    setModalOpen(true);
  }
  async function submit() {
    if (!form.name?.trim()) {
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
        name: form.name,
        category: form.category,
        size_bytes: Math.round((parseFloat(form.size_mb) || 0) * 1024 * 1024),
      });
      setModalOpen(false);
      flash("Document uploaded.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not upload the document.");
    }
  }
  async function onVerify(d: DocumentRow) {
    try {
      await verifyMutation.mutateAsync(d.id);
      flash(`${d.name} → ${d.status === "verified" ? "Pending" : "Verified"}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not update the document.");
    }
  }
  async function onDelete(d: DocumentRow) {
    try {
      await deleteMutation.mutateAsync(d.id);
      flash("Document removed from the register.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not remove the document.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Department Document Management</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Course files, lab records and circulars held by the department office</p>
        </div>
        <button onClick={openCreate} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>⇪ Upload document</button>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
        <div data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #eef2f7", flexWrap: "wrap" }}>
          {FILTER_LABELS.map((f) => (
            <button
              key={f}
              data-sec-nav-item=""
              onClick={() => setFilter(f)}
              style={{ border: filter === f ? "1px solid #1e3a8a" : "1px solid #e5e9f2", background: filter === f ? "#1e3a8a" : "#ffffff", color: filter === f ? "#ffffff" : "#475569", fontSize: 11.7, fontWeight: filter === f ? 600 : 500, borderRadius: 999, padding: "8px 16px", cursor: "pointer" }}
            >
              {f}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11.3, color: "#64748b" }}>{filtered.length} of {docs?.meta.total ?? 0} documents</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 1fr 0.9fr 1fr 1.3fr", gap: 12, padding: "13px 20px", background: "#ffffff", borderBottom: "1px solid #eef2f7", fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8" }}>
          <span>Document</span><span>Category</span><span>Owner</span><span>Size</span><span>Status</span><span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Loading documents…</div>}
        {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load documents."}</div>}
        {filtered.map((d) => {
          const t = tone(d.status);
          return (
            <div key={d.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 1fr 0.9fr 1fr 1.3fr", gap: 12, alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f5f7fa" }}>
              <div>
                <div style={{ fontSize: 12.6, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11.8, color: "#64748b", marginTop: 2 }}>Updated {fmtDate(d.updated_at)} · v{d.version}</div>
              </div>
              <span style={{ fontSize: 11.7, color: "#475569" }}>{d.category}</span>
              <span style={{ fontSize: 11.7, color: "#475569" }}>{d.uploaded_by.email}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.8, color: "#64748b" }}>{fmtSize(d.size_bytes)}</span>
              <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", justifySelf: "start", background: t.bg, color: t.fg }}>{d.status.toUpperCase()}</span>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <span data-sec-soft="" onClick={() => onVerify(d)} style={{ border: "1px solid #dbe6ff", background: "#ffffff", color: "#1e3a8a", fontSize: 11.8, fontWeight: 600, borderRadius: 8, padding: "7px 11px", cursor: "pointer" }}>{d.status === "verified" ? "Unverify" : "Verify"}</span>
                <span data-sec-danger="" onClick={() => onDelete(d)} style={{ border: "1px solid #fee2e2", background: "#ffffff", color: "#b91c1c", fontSize: 11.8, fontWeight: 600, borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}>✕</span>
              </div>
            </div>
          );
        })}
        {!isLoading && !error && filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No documents in this category.</div>}
      </div>

      <QuickModal
        open={modalOpen}
        title="Upload document"
        subtitle="Stored in the real department document register"
        cta="Upload"
        fields={DOC_FIELDS}
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
