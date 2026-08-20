"use client";

import { useState } from "react";
import {
  useAppraisalCriteria,
  useMyAppraisalRequests,
  useCreateAppraisalRequest,
  useDeleteAppraisalRequest,
  useUploadAppraisalAttachment,
  useRemoveAppraisalAttachment,
  type AppraisalRequestRow,
} from "@/modules/advisor/api/employee";

// Backed by GET /me/appraisal-criteria, GET/POST/DELETE /me/appraisal_requests,
// POST/DELETE /me/appraisal_requests/:id/attachments (AppraisalController).
//
// Two honest deviations from the design, both because the real backend
// disallows/lacks what the design shows — not silently faked:
// 1. "Self score" input — CreateAppraisalDto never accepts a score field at
//    all (scoring only happens later, once, by HR) — dropped, same as before.
// 2. "Add another entry" (a second free-text block under the SAME
//    criterion) — AppraisalService.create() explicitly 400s on duplicate
//    criteria_id values within one submission ("Duplicate criteria_id values
//    in entries") — there is no way to submit two entries against the same
//    criterion. Dropped rather than built as a button that always errors.
// 3. "Edit" a submitted entry — no such endpoint exists (PATCH is HoD/HR-only
//    and is a status transition, not a content edit). The real substitute,
//    using the real DELETE endpoint, is "Delete & resubmit" — offered in
//    History, only while status is still 'submitted' (same window the
//    backend allows attachments to be added/removed in).
//
// "Upload files" per division IS present on the Apply screen, matching the
// design — but attachments are keyed by appraisal_request_id, which only
// exists AFTER create() succeeds (attachments have no FK to an entry/
// criteria, only to a division — matches the real appraisal_attachments
// schema). So files picked here are staged client-side (pendingFiles, never
// sent anywhere yet) and only actually uploaded via the real
// POST /me/appraisal_requests/:id/attachments once Submit creates the real
// request and returns a real id — one visible flow, two real API calls
// under the hood, no fake intermediate state.

function humanize(v: string | null): string {
  if (!v) return "Pending";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function AttachmentsPanel({ request, division }: { request: AppraisalRequestRow; division: { id: number; name: string } }) {
  const upload = useUploadAppraisalAttachment();
  const remove = useRemoveAppraisalAttachment();
  const files = request.attachments.filter((a) => a.division_id === division.id);
  const canEdit = request.status === "submitted";

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>{division.name.toUpperCase()}</div>
      {files.length === 0 && <div style={{ fontSize: 12.5, color: "#94A3B8", fontWeight: 600, marginTop: 6 }}>No files attached.</div>}
      {files.map((f) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <a href={f.file_url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1D4ED8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {f.file_name}
          </a>
          <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>{fmtDate(f.uploaded_at)}</div>
          {canEdit && (
            <div
              onClick={() => remove.mutate({ requestId: request.id, attachmentId: f.id })}
              style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}
            >
              Remove
            </div>
          )}
        </div>
      ))}
      {canEdit && (
        <label style={{ display: "block", marginTop: 8, border: "1.5px dashed #C7D2E4", borderRadius: 10, padding: "10px 14px", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#1D4ED8", cursor: "pointer" }}>
          {upload.isPending ? "Uploading…" : "Upload files"}
          <input
            type="file"
            multiple
            hidden
            disabled={upload.isPending}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) upload.mutate({ requestId: request.id, divisionId: division.id, files });
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

export default function AdvisorAppraisalPage() {
  const [tab, setTab] = useState<"apply" | "history">("apply");
  const [openDivisions, setOpenDivisions] = useState<Set<number> | null>(null);
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<number, File[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const criteria = useAppraisalCriteria();
  const requests = useMyAppraisalRequests();
  const create = useCreateAppraisalRequest();
  const remove = useDeleteAppraisalRequest();
  const upload = useUploadAppraisalAttachment();

  const divisions = criteria.data?.divisions ?? [];
  // MUST be the real academic_year the fetched criteria actually belong to.
  const academicYear = criteria.data?.academic_year ?? null;
  // Default every division open, matching the design — a division only
  // collapses once the user explicitly clicks its chevron.
  const isOpen = (id: number) => (openDivisions === null ? true : openDivisions.has(id));
  function toggleDivision(id: number) {
    setOpenDivisions((prev) => {
      const base = prev ?? new Set(divisions.map((d) => d.id));
      const next = new Set(base);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filledEntries = Object.entries(descriptions).filter(([, v]) => v.trim());
  const canSubmit = Boolean(academicYear) && filledEntries.length > 0;

  async function submit() {
    if (!canSubmit || !academicYear) return;
    setFormError(null);
    setSubmitting(true);
    const entries = filledEntries.map(([criteriaId, description]) => ({ criteria_id: Number(criteriaId), description }));
    try {
      const created = await create.mutateAsync({ academic_year: academicYear, entries });
      const requestId = (created as { id: number }).id;
      // Real attachments now that a real appraisal_request_id exists —
      // sequential to keep error attribution simple (which division failed).
      for (const [divisionId, files] of Object.entries(pendingFiles)) {
        if (files.length === 0) continue;
        await upload.mutateAsync({ requestId, divisionId: Number(divisionId), files });
      }
      setDescriptions({});
      setPendingFiles({});
      setTab("history");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to submit appraisal.");
    } finally {
      setSubmitting(false);
    }
  }

  const rows = requests.data?.data ?? [];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Request Appraisal</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>Academic Year {academicYear ?? "—"}</div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {divisions.map((div) => {
            const open = isOpen(div.id);
            const filled = div.criteria.filter((c) => descriptions[c.id]?.trim()).length;
            const maxTotal = div.criteria.reduce((s, c) => s + c.max_score, 0);
            return (
              <div key={div.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, overflow: "hidden" }}>
                <div onClick={() => toggleDivision(div.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", cursor: "pointer" }}>
                  <div style={{ width: 4, height: 38, borderRadius: 4, background: "#1D4ED8" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.015em" }}>{div.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>{div.criteria.length} criteria · max {maxTotal}</div>
                  </div>
                  <div style={{ padding: "6px 13px", borderRadius: 20, background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800 }}>{filled}/{div.criteria.length} filled</div>
                  <div style={{ transform: open ? "none" : "rotate(180deg)", color: "#94A3B8" }}>⌃</div>
                </div>
                {open && (
                  <div style={{ padding: "0 20px 20px" }}>
                    {div.criteria.map((c) => (
                      <div key={c.id} data-advisor-lift="" style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", color: "#1D4ED8" }}>
                          {c.name.toUpperCase()} · MAX {c.max_score}
                        </div>
                        <textarea
                          value={descriptions[c.id] ?? ""}
                          onChange={(e) => setDescriptions((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          placeholder="Describe your contribution"
                          style={{ width: "100%", marginTop: 10, height: 84, border: "1px solid #DDE3EC", borderRadius: 10, padding: "12px 14px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 500, background: "#fff", resize: "vertical" }}
                        />
                      </div>
                    ))}
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8", marginTop: 4 }}>SUPPORTING DOCUMENTS</div>
                    {(pendingFiles[div.id] ?? []).map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        <div
                          onClick={() => setPendingFiles((prev) => ({ ...prev, [div.id]: (prev[div.id] ?? []).filter((_, idx) => idx !== i) }))}
                          style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}
                        >
                          Remove
                        </div>
                      </div>
                    ))}
                    <label style={{ display: "block", marginTop: 10, border: "1.5px dashed #C7D2E4", borderRadius: 11, padding: 18, textAlign: "center", fontSize: 13.5, fontWeight: 700, color: "#1D4ED8", cursor: "pointer" }}>
                      Upload files
                      <input
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length) setPendingFiles((prev) => ({ ...prev, [div.id]: [...(prev[div.id] ?? []), ...files] }));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          {divisions.length === 0 && !criteria.isLoading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No appraisal criteria published yet.</div>
          )}
          {divisions.length > 0 && (
            <>
              {formError && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
                  {formError}
                </div>
              )}
              <div
                onClick={submit}
                style={{
                  marginTop: 4,
                  textAlign: "center",
                  padding: 16,
                  background: submitting ? "#93C5FD" : canSubmit ? "#1D4ED8" : "#C7D2E0",
                  color: "#fff",
                  borderRadius: 11,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "Submitting…" : "Submit appraisal"}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {rows.map((h) => {
            const uniqueDivisions = Array.from(new Map(h.entries.map((e) => [e.criteria.division.id, e.criteria.division])).values());
            return (
              <div key={h.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.015em", flex: 1 }}>Academic Year {h.academic_year}</div>
                  <div style={{ padding: "6px 12px", borderRadius: 20, background: "#EFF6FF", border: "1px solid #DBEAFE", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800 }}>{humanize(h.status).toUpperCase()}</div>
                  {h.status === "submitted" && (
                    <div
                      onClick={() => { if (confirm("Delete this appraisal request? You can resubmit afterwards.")) remove.mutate(h.id); }}
                      style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}
                    >
                      Delete &amp; resubmit
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F4F9" }}>
                  {h.entries.map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                      <div style={{ color: "#475569" }}>{e.criteria.name}</div>
                      <div>{e.score !== null ? `${e.score} / ${e.criteria.max_score}` : "Pending review"}</div>
                    </div>
                  ))}
                </div>
                {h.hod_remarks && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 9, fontSize: 12.5, color: "#475569", fontWeight: 500 }}>
                    <span style={{ fontWeight: 800, color: "#94A3B8" }}>HoD remarks: </span>{h.hod_remarks}
                  </div>
                )}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F4F9" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>SUPPORTING DOCUMENTS</div>
                  {uniqueDivisions.map((d) => d && <AttachmentsPanel key={d.id} request={h} division={d} />)}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && !requests.isLoading && (
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 64, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>No appraisal requests yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
