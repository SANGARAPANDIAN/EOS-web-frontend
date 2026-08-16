"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import {
  useAnnouncements,
  useBatchesLookup,
  useDepartmentsLookup,
  useClassesLookup,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  type AnnouncementRow,
  type AnnouncementCategory,
  type BatchOption,
} from "@/modules/secretary/api/announcements";

// Pixel-exact port of the `isNotices` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 720-752
// (row logic lines 3460-3472) plus the bespoke `announceOpen` composer
// modal (lines 2217-2266, logic 3723-3747). This composer is its OWN
// bespoke modal in the source (not the generic QuickModal) — kept as such.
//
// REAL BACKEND WIRING (no fake data): reads/writes go through
// `src/modules/secretary/api/announcements.ts`, hitting EOSbackend1's
// `/announcements` CRUD (same module the Advisor portal already uses).
// Full accounting of the honest gaps between the design's UI and what the
// real backend can actually do is documented in that API file's header
// comment and repeated inline below at each affected control:
//   - Audience: the design's 6 free-text audience labels don't correspond
//     1:1 to the backend's `target_audience` enum + class/department
//     targeting. Each label is mapped to the closest real backend request
//     (see AUDIENCE_TO_REQUESTS below) — never a fake/invented audience.
//   - Category: real column, previously unused by the backend service —
//     extended the DTO/service (no migration needed) so it's now genuinely
//     persisted and read back.
//   - Schedule: there is no scheduled-publish worker in the backend at all
//     — filling in a schedule saves the announcement as a real `draft` row
//     (still real data) that the secretary must manually Publish later;
//     it does NOT auto-publish at the chosen time.
//   - Pin: there is no `pinned` column anywhere in the schema. Kept as
//     local, session-only UI state — NOT sent to or read from the backend,
//     and explicitly not pretended to be persisted.
//   - Attachment: the design's "Attach circular" button is a bare label
//     toggle in the source too (no real `<input type="file">` anywhere in
//     the .dc.html), so it stays a local flash-only affordance here as
//     well — wiring real upload would mean adding UI the design doesn't
//     have, not replicating it.

const AUDIENCES = ["Everyone in CSE (all classes + faculty)", "All CSE faculty", "All CSE students", "III & IV year students", "Class representatives", "Lab in-charges"] as const;
const TAGS = ["ACADEMIC", "DEPARTMENT", "EVENT", "EMERGENCY", "GENERAL"] as const;
const TAG_TO_CATEGORY: Record<string, AnnouncementCategory> = { ACADEMIC: "academic", DEPARTMENT: "department", EVENT: "event", EMERGENCY: "emergency", GENERAL: "general" };
const CATEGORY_TO_TAG: Record<string, string> = { academic: "ACADEMIC", department: "DEPARTMENT", event: "EVENT", emergency: "EMERGENCY", general: "GENERAL" };

interface AnnForm {
  title: string;
  audience: string;
  tag: string;
  body: string;
  schedule: string;
}
const EMPTY_ANN: AnnForm = { title: "", audience: AUDIENCES[0], tag: "ACADEMIC", body: "", schedule: "" };

const labelSx = { display: "block", fontSize: 12.6, fontWeight: 600, color: "#1d4ed8", marginBottom: 10 } as const;
const inputSx = { width: "100%", height: 54, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 16px", fontSize: 13.5, background: "#fbfcfe", color: "#0f172a" } as const;

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).replace(",", " ·");
}

function audienceLabel(row: AnnouncementRow, allClassIds: number[], seniorClassIds: number[]): string {
  if (row.target_audience === "teachers") return row.department_id ? "All CSE faculty" : "All faculty (institution-wide)";
  if (row.target_audience === "students") {
    const ids = row.class_ids ?? [];
    const idSet = new Set(ids);
    if (allClassIds.length > 0 && ids.length === allClassIds.length && allClassIds.every((id) => idSet.has(id))) return "All CSE students";
    if (seniorClassIds.length > 0 && ids.length === seniorClassIds.length && seniorClassIds.every((id) => idSet.has(id))) return "III & IV year students";
    return "Selected classes";
  }
  if (row.target_audience === "roles") return "Selected roles";
  if (row.target_audience === "parents") return "Parents";
  if (row.target_audience?.startsWith("edc_")) return "EDC audience";
  return "—";
}

export default function SecretaryAnnouncementsPage() {
  const { data: rows, isLoading, error } = useAnnouncements();
  const { data: batches } = useBatchesLookup();
  const currentBatch = useMemo(() => (batches ?? []).reduce<BatchOption | undefined>((best, b) => (!best || b.end_year > best.end_year ? b : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatch?.id);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? (departments ?? []).find((d) => d.name.toLowerCase().includes("computer science")) ?? departments?.[0], [departments]);
  const { data: classes } = useClassesLookup(currentBatch?.id, cseDept?.id);
  const allClassIds = useMemo(() => (classes ?? []).map((c) => c.id), [classes]);
  const seniorClassIds = useMemo(() => (classes ?? []).filter((c) => (c.current_semester ?? 0) >= 5).map((c) => c.id), [classes]);

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [attached, setAttached] = useState(false);
  const [form, setForm] = useState<AnnForm>(EMPTY_ANN);
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }
  function set<K extends keyof AnnForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openNotice() {
    setForm(EMPTY_ANN);
    setAttached(false);
    setOpen(true);
  }
  function toggleAttach() {
    setAttached((a) => !a);
    flash(attached ? "Attachment removed." : "circular.pdf attached.");
  }

  /** Maps the design's 6 audience labels to real backend request(s) —
   * "Everyone" genuinely posts two real rows (students + teachers), since
   * one announcement row can only carry one target_audience. */
  function requestsForAudience(label: string): { target_audience: AnnouncementRow["target_audience"]; class_ids?: number[]; department_id?: number }[] {
    if (label === "Everyone in CSE (all classes + faculty)") {
      const reqs: { target_audience: AnnouncementRow["target_audience"]; class_ids?: number[]; department_id?: number }[] = [];
      if (allClassIds.length > 0) reqs.push({ target_audience: "students", class_ids: allClassIds });
      if (cseDept) reqs.push({ target_audience: "teachers", department_id: cseDept.id });
      return reqs;
    }
    if (label === "All CSE faculty" || label === "Lab in-charges") {
      return cseDept ? [{ target_audience: "teachers", department_id: cseDept.id }] : [];
    }
    if (label === "III & IV year students") {
      return seniorClassIds.length > 0 ? [{ target_audience: "students", class_ids: seniorClassIds }] : [];
    }
    // "All CSE students" and "Class representatives" (no such recipient list
    // exists on the backend — closest real audience is all CSE students).
    return allClassIds.length > 0 ? [{ target_audience: "students", class_ids: allClassIds }] : [];
  }

  async function submit() {
    if (!form.title.trim()) {
      flash("Add a headline before publishing.");
      return;
    }
    const requests = requestsForAudience(form.audience);
    if (requests.length === 0) {
      flash("Department roster isn't loaded yet — try again in a moment.");
      return;
    }
    const scheduled = !!form.schedule;
    const status = scheduled ? "draft" : "published";
    const category = TAG_TO_CATEGORY[form.tag];
    try {
      for (const req of requests) {
        await createMutation.mutateAsync({
          title: form.title,
          content: form.body || "—",
          status,
          category,
          ...req,
        });
      }
      setOpen(false);
      setAttached(false);
      setForm(EMPTY_ANN);
      flash(scheduled ? "Announcement saved as a draft — publish it later from the board." : "Announcement published to the department.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save the announcement.");
    }
  }

  async function onPublish(n: AnnouncementRow) {
    try {
      await updateMutation.mutateAsync({ id: n.id, input: { status: n.status === "published" ? "draft" : "published" } });
      flash(n.status === "published" ? "Notice moved back to drafts." : "Notice published to the board.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not update the announcement.");
    }
  }
  function onPin(n: AnnouncementRow) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(n.id)) next.delete(n.id);
      else next.add(n.id);
      return next;
    });
    flash(pinnedIds.has(n.id) ? "Unpinned." : "Pinned to the top of the board (this device only).");
  }
  async function onDelete(n: AnnouncementRow) {
    try {
      await deleteMutation.mutateAsync(n.id);
      flash("Notice deleted.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not delete the announcement.");
    }
  }

  const sortedRows = useMemo(() => {
    const list = rows ?? [];
    return [...list].sort((a, b) => {
      const ap = pinnedIds.has(a.id) ? 1 : 0;
      const bp = pinnedIds.has(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rows, pinnedIds]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Announcements</h1>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>Circulars from the institution and posts you publish to the department</p>
        </div>
        <button onClick={openNotice} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.5, fontWeight: 600, borderRadius: 12, padding: "16px 28px", cursor: "pointer" }}>New announcement</button>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading announcements…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load announcements."}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {sortedRows.map((n) => {
          const tagLabel = CATEGORY_TO_TAG[n.category as string] ?? "GENERAL";
          const tg = tone(tagLabel === "EMERGENCY" ? "overdue" : tagLabel === "ACADEMIC" ? "in progress" : "pending");
          const published = n.status === "published";
          const st = tone(published ? "published" : "draft");
          const pinned = pinnedIds.has(n.id);
          return (
            <div key={n.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.9, borderRadius: 7, padding: "6px 11px", background: tg.bg, color: tg.fg }}>{tagLabel}</span>
                <span style={{ fontSize: 12.2, color: "#64748b" }}>{fmtWhen(n.created_at)}</span>
                <span style={{ marginLeft: "auto", fontSize: 12.2, color: "#94a3b8" }}>{n.posted_by?.name ?? "Secretary desk"}</span>
                <span style={{ fontSize: 10.8, fontWeight: 700, letterSpacing: 0.7, borderRadius: 7, padding: "6px 11px", background: st.bg, color: st.fg }}>{published ? "PUBLISHED" : "DRAFT"}</span>
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 700, margin: "14px 0 7px", letterSpacing: -0.3 }}>{n.title}</div>
              <div style={{ fontSize: 13.1, color: "#475569", lineHeight: 1.6 }}>{n.content}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <span style={{ fontSize: 12.2, color: "#94a3b8" }}>Audience · {audienceLabel(n, allClassIds, seniorClassIds)}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                  <button onClick={() => onPublish(n)} style={{ border: 0, background: "transparent", color: "#1d4ed8", fontSize: 11.7, fontWeight: 600, cursor: "pointer", padding: 4 }}>{published ? "Unpublish" : "Publish"}</button>
                  <button onClick={() => onPin(n)} style={{ border: 0, background: "transparent", color: "#475569", fontSize: 11.7, fontWeight: 600, cursor: "pointer", padding: 4 }}>{pinned ? "Unpin" : "Pin to board"}</button>
                  <button onClick={() => onDelete(n)} style={{ border: 0, background: "transparent", color: "#b91c1c", fontSize: 11.7, fontWeight: 600, cursor: "pointer", padding: 4 }}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && !error && sortedRows.length === 0 && (
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No announcements yet.</div>
        )}
      </div>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, zIndex: 90 }}>
          <div style={{ width: 1000, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", background: "#ffffff", borderRadius: 18, boxShadow: "0 30px 70px rgba(15,23,42,0.28)" }}>
            <div data-sec-row="" style={{ padding: "26px 32px 22px", borderBottom: "1px solid #eef2f7", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 22.6, fontWeight: 700, letterSpacing: -0.6 }}>New announcement</div>
              <button data-sec-lift="" onClick={() => setOpen(false)} style={{ marginLeft: "auto", width: 40, height: 40, borderRadius: 10, border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 13.1, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "26px 32px" }}>
              <label style={{ display: "block" }}>
                <span style={labelSx}>Headline</span>
                <input data-sec-lift="" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. CAE-II retest schedule for CSE published" style={inputSx} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 22 }}>
                <label style={{ display: "block" }}>
                  <span style={labelSx}>Audience</span>
                  <select data-sec-lift="" value={form.audience} onChange={(e) => set("audience", e.target.value)} style={{ ...inputSx, padding: "0 14px" }}>
                    {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
                <label style={{ display: "block" }}>
                  <span style={labelSx}>Category</span>
                  <select data-sec-lift="" value={form.tag} onChange={(e) => set("tag", e.target.value)} style={{ ...inputSx, padding: "0 14px" }}>
                    {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display: "block", marginTop: 22 }}>
                <span style={labelSx}>Message</span>
                <textarea data-sec-lift="" value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Write the announcement in full" style={{ width: "100%", minHeight: 150, border: "1px solid #e5e9f2", borderRadius: 10, padding: "14px 16px", fontSize: 13.5, lineHeight: 1.6, background: "#fbfcfe", resize: "vertical" }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 22 }}>
                <label style={{ display: "block" }}>
                  <span style={labelSx}>Schedule for</span>
                  <input data-sec-lift="" type="datetime-local" value={form.schedule} onChange={(e) => set("schedule", e.target.value)} style={{ ...inputSx, fontSize: 13.1 }} />
                  <span style={{ display: "block", fontSize: 11.3, color: "#94a3b8", marginTop: 8 }}>Leave empty to publish immediately</span>
                </label>
                <label style={{ display: "block" }}>
                  <span style={labelSx}>Attachment</span>
                  <button onClick={toggleAttach} style={{ width: "100%", height: 54, border: "1px dashed #c7d7fe", background: "#ffffff", color: "#1d4ed8", fontSize: 13.1, fontWeight: 600, borderRadius: 10, cursor: "pointer" }}>{attached ? "circular.pdf attached ✓" : "Attach circular (optional)"}</button>
                </label>
              </div>
            </div>
            <div style={{ padding: "20px 32px 26px", borderTop: "1px solid #eef2f7", display: "flex", gap: 14, justifyContent: "flex-end" }}>
              <button data-sec-lift="" onClick={() => setOpen(false)} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 12.6, fontWeight: 600, borderRadius: 10, padding: "13px 24px", cursor: "pointer" }}>Cancel</button>
              <button onClick={submit} disabled={createMutation.isPending} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 12.6, fontWeight: 600, borderRadius: 10, padding: "13px 28px", cursor: "pointer", opacity: createMutation.isPending ? 0.7 : 1 }}>{form.schedule ? "Save as draft" : "Publish announcement"}</button>
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
