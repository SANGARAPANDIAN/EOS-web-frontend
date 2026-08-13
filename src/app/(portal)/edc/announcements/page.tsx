"use client";

import { useState } from "react";
import {
  useEdcAnnouncements,
  useCreateEdcAnnouncement,
  useUpdateEdcAnnouncement,
  useDeleteEdcAnnouncement,
  EDC_AUDIENCE_LABELS,
  type EdcAnnouncementRow,
  type EdcAudience,
} from "@/modules/edc/api/announcements";
import { pillSx } from "@/modules/edc/genericPage";

// Real backend connection — replaces the fake PAGE_DEFS.announcements feed.
// GET/POST/DELETE /announcements (AnnouncementsController), now reachable by
// the new edc_coordinator role with three new target_audience values and a
// real `priority` column (see src/modules/edc/api/announcements.ts for the
// full trail of what's real vs. what has no backend concept at all).
//
// Rebuilt as a bespoke page rather than reusing EdcGenericPage's generic
// text-input modal — the real create form needs a content textarea and
// constrained audience/priority selects, which the generic modal's plain
// text fields can't express honestly (a free-text "AUDIENCE" input would
// just silently fail validation against the real enum).

const AUDIENCES: EdcAudience[] = ["edc_founders", "edc_inside_college", "edc_all_entrepreneurs"];
const PRIORITIES = ["High Priority", "Medium Priority", "Normal Priority"];

function priorityTone(priority: string | null) {
  if (priority === "High Priority") return pillSx("slate");
  if (priority === "Medium Priority") return pillSx("amber");
  return pillSx("slate");
}

function fmtMeta(row: { created_at: string; target_audience: string }) {
  const date = new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const audience = EDC_AUDIENCE_LABELS[row.target_audience as EdcAudience] ?? row.target_audience;
  return `${date} · ${audience}`;
}

export default function EdcAnnouncementsPage() {
  const announcements = useEdcAnnouncements();
  const create = useCreateEdcAnnouncement();
  const update = useUpdateEdcAnnouncement();
  const remove = useDeleteEdcAnnouncement();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<EdcAudience>("edc_founders");
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [error, setError] = useState<string | null>(null);

  const rows = announcements.data ?? [];

  function openModal() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setAudience("edc_founders");
    setPriority(PRIORITIES[0]);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(a: EdcAnnouncementRow) {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setAudience(a.target_audience as EdcAudience);
    setPriority(a.priority ?? PRIORITIES[0]);
    setError(null);
    setModalOpen(true);
  }

  function submit() {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    const onDone = { onSuccess: () => setModalOpen(false), onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed to save announcement.") };
    if (editingId) {
      update.mutate({ id: editingId, input: { title, content, target_audience: audience, priority } }, onDone);
    } else {
      create.mutate({ title, content, target_audience: audience, priority, status: "published" }, onDone);
    }
  }

  return (
    <div style={{ maxWidth: 1560, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Entrepreneurship Announcements</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Publish and manage announcements for student entrepreneurs.</p>
        </div>
        <div onClick={openModal} data-edc-btn-primary="" style={{ display: "flex", alignItems: "center", gap: 9, height: 46, padding: "0 22px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", flex: "none" }}>
          <span className="ms" style={{ fontSize: 19 }}>add</span>
          <span>New Announcement</span>
        </div>
      </div>

      {announcements.isLoading && <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>Loading…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((a) => (
          <div key={a.id} data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {a.priority && <span style={priorityTone(a.priority)}>{a.priority}</span>}
              <span style={{ fontSize: 13, color: "#94A3B8" }}>{fmtMeta(a)}</span>
              <div style={{ flex: 1 }} />
              {a.posted_by && <span style={{ fontSize: 12.5, color: "#94A3B8" }}>by {a.posted_by.name}</span>}
              <div onClick={() => openEditModal(a)} style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", cursor: "pointer" }}>
                Edit
              </div>
              <div onClick={() => remove.mutate(a.id)} style={{ fontSize: 12.5, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>
                Delete
              </div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{a.title}</div>
            <div style={{ fontSize: 14.5, color: "#64748B" }}>{a.content}</div>
          </div>
        ))}
        {rows.length === 0 && !announcements.isLoading && (
          <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: 60, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>
            No announcements yet — publish one to reach founders.
          </div>
        )}
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 560, maxHeight: "82vh", overflowY: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 30px 70px rgba(15,23,42,0.28)", padding: "26px 28px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>{editingId ? "Edit announcement" : "New announcement"}</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>{editingId ? "Changes are visible immediately." : "Publishes immediately, visible to you and anyone it's explicitly targeted at."}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>TITLE</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Venture review window opens 20 August"
                  style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>CONTENT</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe the announcement"
                  style={{ height: 90, padding: "10px 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>AUDIENCE</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as EdcAudience)}
                  style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }}
                >
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a}>{EDC_AUDIENCE_LABELS[a]}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>PRIORITY</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              {error && <div style={{ fontSize: 12.5, color: "#DC2626", fontWeight: 600 }}>{error}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <div onClick={() => setModalOpen(false)} data-edc-row="" style={{ height: 42, padding: "0 20px", display: "flex", alignItems: "center", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                Cancel
              </div>
              <div onClick={submit} data-edc-btn-primary="" style={{ height: 42, padding: "0 22px", display: "flex", alignItems: "center", borderRadius: 10, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: create.isPending || update.isPending ? "default" : "pointer" }}>
                {create.isPending || update.isPending ? "Saving…" : editingId ? "Save changes" : "Publish"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
