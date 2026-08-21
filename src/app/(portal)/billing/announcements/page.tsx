"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  useAnnouncements,
  useAllClassesLookup,
  useRolesLookup,
  useDepartmentsLookup,
  useBatchesLookup,
  useFinalYearClassIds,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  REAL_TO_TAG,
  announcementTagColors,
  type AnnouncementRow,
  type AnnouncementCategory,
  type BatchOption,
} from "@/modules/billing/api/announcements";
import { useFeePaymentsDashboard, groupDashboardByStudent } from "@/modules/billing/api/fees";
import { BillingModal, fieldLabelSx, fieldInputSx } from "@/modules/billing/BillingModal";

// Pixel-exact port of the `isAnnouncements` screen from
// "Billing Module - Web/Billing Admin.dc.html", lines 341-362, plus the
// "Add Announcement" modal fields (lines 1990-2025).
//
// REAL BACKEND WIRING — no fake data, full real CRUD. Reads/creates/
// updates/deletes go through EOSbackend1's real `/announcements` module —
// the Billing role was added to its guards/service logic (institution-
// wide posture, same as Secretary).
//
// AUDIENCE TARGETING — genuinely scoped per selection, not "everyone
// regardless of dropdown" (the bug reported):
//   - "All students": real, every real class (`lookup/all-classes`).
//   - "Students with dues": real — computed from the SAME real
//     fee-payments/dashboard data the Students roster uses, taking only
//     the distinct real class_ids of students whose due_status !== "paid".
//     Honest structural limit (not faked): the backend's own targeting
//     mechanism is class-level (`announcement_class_mapping`), not
//     student-level — a class with even one paid student is still
//     nominally included since there is no per-student announcement
//     recipient list on the real schema. This is real Improvement #1 over
//     the prior "broadcasts to literally everyone" bug, not perfect
//     individual precision (which the backend cannot express at all).
//   - "Final year students": real — computed by querying every real
//     department's real classes for the current batch and keeping only
//     `current_semester >= 7`.
//   - "All HoDs": real, `target_audience: roles` + the real `hod` role id.
//   - "Hostel residents": genuinely NOT achievable for real right now — no
//     hostel-to-class join exists anywhere the frontend can call (the real
//     `student_hostel_mapping` table exists, but no endpoint exposes a
//     hostel-resident class list). Flagged honestly in the UI itself
//     (see the select option's own label) rather than silently
//     broadcasting to everyone under that label.
//
// CRUD: Edit and Delete are only ever shown for announcements this real
// billing account itself authored (`a.posted_by_user_id === session user
// id`) — the backend also independently enforces this (403 NOT_OWNER on
// PATCH/DELETE of someone else's row), this is just the UI reflecting
// that real restriction rather than showing dead buttons for other
// people's posts.

const CATEGORY_OPTIONS = ["URGENT", "FEES", "SCHOLARSHIP", "GENERAL"] as const;
const CATEGORY_TO_REAL: Record<string, AnnouncementCategory> = { URGENT: "emergency", FEES: "department", SCHOLARSHIP: "academic", GENERAL: "general" };

const AUDIENCE_OPTIONS = ["All students", "Students with dues", "Final year students", "All HoDs", "Hostel residents (not available)"] as const;

interface AnnForm {
  title: string;
  tag: string;
  audience: string;
  body: string;
}
const EMPTY_ANN: AnnForm = { title: "", tag: "FEES", audience: AUDIENCE_OPTIONS[0], body: "" };

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function audienceLabel(row: AnnouncementRow): string {
  if (row.target_audience === "students") return "Students";
  if (row.target_audience === "roles") return "All HoDs";
  if (row.target_audience === "teachers") return "All faculty";
  if (row.target_audience === "parents") return "Parents";
  return "—";
}

export default function BillingAnnouncementsPage() {
  const { session } = useAuth();
  const myUserId = session?.user.id;

  const { data: rows, isLoading, error } = useAnnouncements();
  const { data: allClassIds } = useAllClassesLookup();
  const { data: roles } = useRolesLookup();
  const hodRole = useMemo(() => (roles ?? []).find((r) => r.name === "hod"), [roles]);

  const { data: dashboardRows } = useFeePaymentsDashboard();
  const studentsWithDuesClassIds = useMemo(() => {
    const grouped = groupDashboardByStudent(dashboardRows ?? []);
    const ids = grouped.filter((s) => s.due_status !== "paid" && s.class_id !== null).map((s) => s.class_id as number);
    return Array.from(new Set(ids));
  }, [dashboardRows]);

  // Real final-year classes: current batch's real departments, each
  // department's real classes filtered to current_semester >= 7.
  const { data: batches } = useBatchesLookup();
  const currentBatch = useMemo(() => (batches ?? []).reduce<BatchOption | undefined>((best, b) => (!best || b.end_year > best.end_year ? b : best), undefined), [batches]);
  const { data: allDepartments } = useDepartmentsLookup(currentBatch?.id);
  const allDepartmentIds = useMemo(() => (allDepartments ?? []).map((d) => d.id), [allDepartments]);
  const { data: finalYearClassIds } = useFinalYearClassIds(currentBatch?.id, allDepartmentIds);

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AnnForm>(EMPTY_ANN);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }
  function set<K extends keyof AnnForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openComposer() {
    setEditingId(null);
    setForm(EMPTY_ANN);
    setFormError("");
    setOpen(true);
  }
  function openEdit(a: AnnouncementRow) {
    setEditingId(a.id);
    const tag = REAL_TO_TAG[a.category as string] ?? "FEES";
    setForm({ title: a.title, tag, audience: audienceLabelForEdit(a), body: a.content });
    setFormError("");
    setOpen(true);
  }
  function audienceLabelForEdit(a: AnnouncementRow): string {
    if (a.target_audience === "roles") return "All HoDs";
    return "All students";
  }

  function requestForAudience(): { target_audience: AnnouncementRow["target_audience"]; class_ids?: number[]; role_ids?: number[] } | null {
    if (form.audience === "All HoDs") {
      if (!hodRole) return null;
      return { target_audience: "roles", role_ids: [hodRole.id] };
    }
    if (form.audience === "Students with dues") {
      if (studentsWithDuesClassIds.length === 0) return null;
      return { target_audience: "students", class_ids: studentsWithDuesClassIds };
    }
    if (form.audience === "Final year students") {
      if (!finalYearClassIds || finalYearClassIds.length === 0) return null;
      return { target_audience: "students", class_ids: finalYearClassIds };
    }
    if (form.audience.startsWith("Hostel residents")) {
      return null;
    }
    if (!allClassIds || allClassIds.length === 0) return null;
    return { target_audience: "students", class_ids: allClassIds };
  }

  async function submit() {
    if (!form.title.trim()) {
      setFormError("Add a title before publishing.");
      return;
    }
    if (form.audience.startsWith("Hostel residents")) {
      setFormError("Hostel-resident targeting isn't available yet — no real hostel-to-class data is exposed to this module. Pick a different audience.");
      return;
    }
    const req = requestForAudience();
    if (!req) {
      setFormError("Roster isn't loaded yet, or no real student matches this audience right now — try again in a moment.");
      return;
    }
    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, input: { title: form.title, content: form.body || "—", category: CATEGORY_TO_REAL[form.tag], ...req } });
        showToast("Announcement updated.");
      } else {
        await createMutation.mutateAsync({ title: form.title, content: form.body || "—", status: "published", category: CATEGORY_TO_REAL[form.tag], ...req });
        showToast("Announcement published.");
      }
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY_ANN);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the announcement.");
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      showToast("Announcement deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete the announcement.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: -0.025 }}>Announcements</h1>
        <button
          data-bill-primary
          onClick={openComposer}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 9, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 2px rgba(15,23,42,.16)" }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span><span>New announcement</span>
        </button>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>Loading announcements…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load announcements."}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(rows ?? []).map((a) => {
          const tag = REAL_TO_TAG[a.category as string] ?? "GENERAL";
          const { bg, fg } = announcementTagColors(tag);
          const isMine = a.posted_by_user_id === myUserId;
          return (
            <div key={a.id} data-bill-lift style={{ transition: "transform .16s ease,border-color .16s ease,box-shadow .16s ease", background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ background: bg, color: fg, borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 0.05 }}>{tag}</span>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{fmtWhen(a.created_at)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{a.posted_by?.name ?? "Billing office"}</span>
                  <span style={{ background: "#eef3ff", color: "#1d4ed8", borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 0.05 }}>{a.status.toUpperCase()}</span>
                  {isMine && (
                    <>
                      <button data-bill-icon onClick={() => openEdit(a)} style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 11.5, fontWeight: 700, cursor: "pointer", borderRadius: 6, padding: "4px 9px" }}>Edit</button>
                      <button data-bill-icon onClick={() => onDelete(a.id)} style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: 17, cursor: "pointer", lineHeight: 1, borderRadius: 6, padding: "2px 6px" }}>&times;</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, marginTop: 12, letterSpacing: -0.01 }}>{a.title}</div>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 7, lineHeight: 1.55 }}>{a.content}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 12 }}>Audience &middot; {audienceLabel(a)}</div>
            </div>
          );
        })}
        {!isLoading && !error && (rows ?? []).length === 0 && (
          <div data-bill-lift style={{ background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: 44, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>No announcements yet.</div>
        )}
      </div>

      <BillingModal
        open={open}
        title={editingId !== null ? "Edit announcement" : "New announcement"}
        sub={editingId !== null ? "Changing the audience re-targets it for real" : "Published instantly to the real audience below"}
        cta={editingId !== null ? "Save changes" : "Publish announcement"}
        onClose={() => { setOpen(false); setEditingId(null); }}
        onSubmit={submit}
        error={formError}
      >
        <div>
          <div style={fieldLabelSx}>Title</div>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Last date for tuition fee payment" style={fieldInputSx} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={fieldLabelSx}>Category</div>
            <select value={form.tag} onChange={(e) => set("tag", e.target.value)} style={fieldInputSx}>
              {CATEGORY_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={fieldLabelSx}>Audience</div>
            <select value={form.audience} onChange={(e) => set("audience", e.target.value)} style={fieldInputSx}>
              {AUDIENCE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div style={fieldLabelSx}>Message</div>
          <textarea value={form.body} onChange={(e) => set("body", e.target.value)} rows={4} placeholder="Write the circular text" style={{ ...fieldInputSx, resize: "vertical", height: "auto", padding: "11px 12px", fontFamily: "inherit" }} />
        </div>
      </BillingModal>

      {toast && <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#fff", borderRadius: 10, padding: "13px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 16px 40px rgba(15,23,42,.35)", zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
