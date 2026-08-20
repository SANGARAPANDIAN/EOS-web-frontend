"use client";

import { useRef, useState } from "react";
import {
  useEdcDocuments,
  useUploadEdcDocument,
  useReviewEdcDocument,
  useDeleteEdcDocument,
  EDC_DOCUMENT_TYPES,
  type EdcDocumentType,
  type EdcDocumentVerificationStatus,
} from "@/modules/edc/api/documents";
import { useEdcEntrepreneurship } from "@/modules/edc/api/entrepreneurship";
import { pillSx } from "@/modules/edc/genericPage";

// Real backend connection — GET/POST /me/edc-documents + the existing
// POST /announcements/attachments upload endpoint (real Supabase Storage
// file, not a fake URL), added this session on a real `edc_documents` table.

const inputSx = { height: 40, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 9, background: "#fff", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: "none", width: "100%" } as const;

function statusTone(status: EdcDocumentVerificationStatus) {
  if (status === "Verified") return pillSx("green");
  if (status === "Rejected") return pillSx("red");
  return pillSx("amber");
}

export default function EdcDocumentsPage() {
  const documents = useEdcDocuments();
  const ventures = useEdcEntrepreneurship();
  const upload = useUploadEdcDocument();
  const review = useReviewEdcDocument();
  const remove = useDeleteEdcDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<"All" | EdcDocumentType>("All");
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ document_type: EdcDocumentType; student_entrepreneurship_id: string }>({ document_type: EDC_DOCUMENT_TYPES[0], student_entrepreneurship_id: "" });
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const rows = (documents.data ?? []).filter((d) => {
    if (filter !== "All" && d.document_type !== filter) return false;
    if (query.trim() && !`${d.file_name} ${d.venture_name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    upload.mutate(
      { file, document_type: form.document_type, student_entrepreneurship_id: form.student_entrepreneurship_id ? Number(form.student_entrepreneurship_id) : undefined },
      {
        onSuccess: () => {
          setUploadOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (e) => setError(e instanceof Error ? e.message : "Upload failed."),
      },
    );
  }

  function submitReview(id: number, status: EdcDocumentVerificationStatus) {
    review.mutate({ id, verification_status: status, reviewer_note: note || undefined }, { onSuccess: () => { setReviewingId(null); setNote(""); } });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Documents</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Review and verify documents submitted by student ventures.</p>
        </div>
        <div data-edc-btn-primary="" onClick={() => setUploadOpen(true)} style={{ padding: "12px 20px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Upload Document
        </div>
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "12px 16px" }}>
        <input style={{ ...inputSx, border: "none" }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by file name or venture…" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["All", ...EDC_DOCUMENT_TYPES] as const).map((t) => (
          <span
            key={t}
            onClick={() => setFilter(t)}
            style={{ fontSize: 13, fontWeight: 600, padding: "7px 15px", borderRadius: 99, cursor: "pointer", color: filter === t ? "#fff" : "#334155", background: filter === t ? "#1D4ED8" : "#fff", border: filter === t ? "none" : "1px solid #E2E8F0" }}
          >
            {t}
          </span>
        ))}
      </div>

      <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF2F7", fontSize: 15, fontWeight: 700 }}>Document Verification</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.1fr 1fr 0.9fr 0.9fr 1.3fr", gap: 16, padding: "11px 22px", background: "#fff", borderBottom: "1px solid #EEF2F7", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#94A3B8" }}>
          <span>DOCUMENT</span>
          <span>VENTURE</span>
          <span>TYPE</span>
          <span>UPLOADED</span>
          <span>VERIFICATION</span>
          <span style={{ textAlign: "right" }}>ACTIONS</span>
        </div>
        {documents.isLoading && <div style={{ padding: "36px 22px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
        {documents.isError && <div style={{ padding: "36px 22px", textAlign: "center", color: "#DC2626", fontWeight: 600, fontSize: 14 }}>{documents.error instanceof Error ? documents.error.message : "Failed to load documents."}</div>}
        {rows.length === 0 && !documents.isLoading && !documents.isError && (
          <div style={{ padding: "44px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
            {documents.data?.length === 0 ? "No documents uploaded yet." : "No documents match this search/filter."}
          </div>
        )}
        {rows.map((d) => (
          <div key={d.id} data-edc-row="" style={{ padding: "13px 22px", borderBottom: "1px solid #EEF2F7" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.1fr 1fr 0.9fr 0.9fr 1.3fr", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.file_name}>{d.file_name}</span>
              <span style={{ fontSize: 13, color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.venture_name ?? "—"}</span>
              <span style={{ fontSize: 12.5, color: "#475569", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.document_type}</span>
              <span style={{ fontSize: 12.5, color: "#64748B" }}>{new Date(d.uploaded_at).toLocaleDateString()}</span>
              <span><span style={statusTone(d.verification_status)}>{d.verification_status}</span></span>
              <span style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>View</a>
                {d.verification_status === "Pending" && (
                  <span onClick={() => setReviewingId(reviewingId === d.id ? null : d.id)} style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", cursor: "pointer" }}>Review</span>
                )}
                <span onClick={() => remove.mutate(d.id)} style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Delete</span>
              </span>
            </div>
            {reviewingId === d.id && (
              <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
                <input style={{ ...inputSx, flex: 1 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" />
                <span onClick={() => submitReview(d.id, "Verified")} style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#16A34A", borderRadius: 8, padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>Approve</span>
                <span onClick={() => submitReview(d.id, "Rejected")} style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#DC2626", borderRadius: 8, padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>Request fix</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {uploadOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setUploadOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 26, width: 440, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Upload Document</div>
            {error && <div style={{ padding: "9px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>TYPE</label>
              <select style={inputSx} value={form.document_type} onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value as EdcDocumentType }))}>
                {EDC_DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>VENTURE (OPTIONAL)</label>
              <select style={inputSx} value={form.student_entrepreneurship_id} onChange={(e) => setForm((f) => ({ ...f, student_entrepreneurship_id: e.target.value }))}>
                <option value="">Not linked to a venture</option>
                {(ventures.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.business_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>FILE</label>
              <input ref={fileInputRef} type="file" onChange={(e) => handleFile(e.target.files?.[0])} disabled={upload.isPending} />
            </div>
            {upload.isPending && <div style={{ fontSize: 13, color: "#64748B" }}>Uploading…</div>}
            <div onClick={() => setUploadOpen(false)} data-edc-row="" style={{ textAlign: "center", padding: "11px 0", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
          </div>
        </div>
      )}
    </div>
  );
}
