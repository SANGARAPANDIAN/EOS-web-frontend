"use client";

import { useState } from "react";
import {
  useAnnouncements,
  useAssignedClassesLookup,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  type AnnouncementRow,
} from "@/modules/advisor/api/announcements";
import { getSession } from "@/lib/auth/session";

// Backed by GET/POST /announcements and GET /announcements/lookup/assigned-classes.
// FIXED: this file previously invented a scope/body/class_name shape that
// doesn't exist on the backend at all (confirmed by curling the real
// endpoint) — every field silently rendered blank and the audience
// dropdown's key was always `undefined`. Real fields are `content` (not
// body), `target_audience` (parents/teachers/students/roles, not a free
// "scope" string), `class_ids: number[]`, and `posted_by: {name,...}`.
// Assigned-classes lookup returns `{id, label}`, not `{class_id, class_name}`.

function pill(bg: string, border: string, color: string) {
  return { padding: "6px 12px", borderRadius: 20, background: bg, border: `1px solid ${border}`, color, fontSize: 11.5, fontWeight: 800, letterSpacing: "0.03em" } as const;
}

function tagStyleFor(audience: string | null) {
  if (audience === "teachers") return pill("#F1F5F9", "#CBD5E1", "#475569");
  if (audience === "roles") return pill("#F8FAFC", "#E2E8F0", "#475569");
  return pill("#EFF6FF", "#DBEAFE", "#1D4ED8");
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return `Today · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function AdvisorAnnouncementsPage() {
  const announcements = useAnnouncements();
  const assignedClasses = useAssignedClassesLookup();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState<number | "all">("all");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "mine">("all");

  const myUserId = getSession()?.user?.id;
  const allRows = announcements.data ?? [];
  // GET /announcements already returns exactly what's visible to this
  // faculty (published + targeted to them, per buildVisibilityQuery on the
  // backend) — "All" shows that as-is; "My Announcements" filters to rows
  // this faculty actually posted, using the real posted_by_user_id column
  // (not a name match, which could collide between two faculty).
  const rows = tab === "mine" ? allRows.filter((a) => a.posted_by_user_id === myUserId) : allRows;
  const classOptions = Array.from(new Map((assignedClasses.data ?? []).map((c) => [c.id, c])).values());

  function openCreate() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setClassId("all");
    setFormError(null);
    setOpen(true);
  }

  function openEdit(a: AnnouncementRow) {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setClassId(a.class_ids[0] ?? "all");
    setFormError(null);
    setOpen(true);
  }

  function submit() {
    if (!title.trim() || !content.trim()) return;
    const targetClassIds = classId === "all" ? classOptions.map((c) => c.id) : [classId];
    if (targetClassIds.length === 0) return;
    setFormError(null);
    const input = {
      title: title.trim(),
      content: content.trim(),
      status: "published" as const,
      target_audience: "students" as const,
      class_ids: targetClassIds,
    };
    const onSuccess = () => setOpen(false);
    const onError = (e: unknown) => setFormError(e instanceof Error ? e.message : "Failed to save announcement.");
    if (editingId) {
      updateAnnouncement.mutate({ id: editingId, input }, { onSuccess, onError });
    } else {
      createAnnouncement.mutate(input, { onSuccess, onError });
    }
  }

  function remove(id: number) {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;
    setDeleteError(null);
    deleteAnnouncement.mutate(id, {
      onError: (e) => setDeleteError(e instanceof Error ? e.message : "Failed to delete announcement."),
    });
  }

  const saving = createAnnouncement.isPending || updateAnnouncement.isPending;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Announcements</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
            Circulars from the institution and your department
          </div>
        </div>
        <div
          onClick={openCreate}
          style={{ padding: "11px 18px", background: "#1D4ED8", color: "#fff", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
        >
          New announcement
        </div>
      </div>

      {deleteError && (
        <div style={{ marginTop: 14, padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
          {deleteError}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20, borderBottom: "1px solid #E6EAF0" }}>
        {[
          { key: "all" as const, label: "All announcements" },
          { key: "mine" as const, label: "My announcements" },
        ].map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 4px",
              marginRight: 20,
              fontSize: 13.5,
              fontWeight: 700,
              color: tab === t.key ? "#1D4ED8" : "#94A3B8",
              borderBottom: tab === t.key ? "2px solid #1D4ED8" : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "70px 24px",
            zIndex: 50,
            overflowY: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: 720, background: "#fff", borderRadius: 16, boxShadow: "0 24px 60px rgba(15,23,42,0.22)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 26px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ flex: 1, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{editingId ? "Edit announcement" : "New announcement"}</div>
              <div
                onClick={() => setOpen(false)}
                style={{ width: 34, height: 34, border: "1px solid #E2E8F0", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#64748B", cursor: "pointer" }}
              >
                ×
              </div>
            </div>
            <div style={{ padding: "24px 26px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Headline</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 150))}
                placeholder="e.g. Semester fee deadline extended to 30 Aug"
                style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff" }}
              />

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Audience</div>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value === "all" ? "all" : Number(e.target.value))}
                  style={{ width: "100%", marginTop: 8, height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, background: "#F8FAFC" }}
                >
                  <option value="all">All classes I teach</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>Message</div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the announcement in full"
                  style={{ width: "100%", marginTop: 8, height: 110, border: "1px solid #DDE3EC", borderRadius: 10, padding: "12px 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#fff", resize: "vertical" }}
                />
              </div>
              {formError && (
                <div style={{ marginTop: 16, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>
                  {formError}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 26px", borderTop: "1px solid #EEF1F6", background: "#F8FAFC", borderRadius: "0 0 16px 16px" }}>
              <div
                onClick={() => setOpen(false)}
                style={{ padding: "12px 22px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#475569", cursor: "pointer" }}
              >
                Cancel
              </div>
              <div style={{ flex: 1 }} />
              <div
                onClick={submit}
                style={{ padding: "12px 24px", background: saving ? "#93C5FD" : "#1D4ED8", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#fff", cursor: "pointer" }}
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Publish now"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
        {rows.map((a) => (
          <div key={a.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={tagStyleFor(a.target_audience)}>{(a.target_audience ?? "general").toUpperCase()}</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>{whenLabel(a.created_at)}</div>
              <div style={{ flex: 1 }} />
              {a.posted_by && <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>{a.posted_by.name}</div>}
              <div style={pill(a.status === "published" ? "#EFF6FF" : "#F1F5F9", a.status === "published" ? "#DBEAFE" : "#CBD5E1", a.status === "published" ? "#1D4ED8" : "#475569")}>
                {a.status.toUpperCase()}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.015em", marginTop: 11 }}>{a.title}</div>
            {a.content && <div style={{ fontSize: 13.5, color: "#64748B", fontWeight: 500, marginTop: 7, lineHeight: 1.6 }}>{a.content}</div>}
            {/* Real ownership check against posted_by_user_id — CRUD is
                only ever offered on this faculty's own posts, matching the
                backend's own NOT_OWNER enforcement exactly. */}
            {a.posted_by_user_id === myUserId && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <div
                  onClick={() => openEdit(a)}
                  style={{ padding: "7px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#1D4ED8", cursor: "pointer" }}
                >
                  Edit
                </div>
                <div
                  onClick={() => remove(a.id)}
                  style={{ padding: "7px 14px", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}
                >
                  Delete
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && !announcements.isLoading && (
          <div style={{ padding: "40px 0", textAlign: "center", fontSize: 14, color: "#94A3B8", fontWeight: 600 }}>
            {tab === "mine" ? "You haven't posted any announcements yet." : "No announcements yet."}
          </div>
        )}
      </div>
    </div>
  );
}
