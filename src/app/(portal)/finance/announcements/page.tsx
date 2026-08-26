"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  useAnnouncements,
  useRolesLookup,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  CATEGORY_OPTIONS,
  AUDIENCE_OPTIONS,
  type AnnouncementRow,
  type AnnouncementCategory,
} from "@/modules/finance/api/announcements";
import { statusLabel, formatDateTime } from "@/modules/finance/api/finance";
import {
  BLUE,
  GREY,
  cardSx,
  filterBarSx,
  inputSx,
  selectSx,
  clearBtnSx,
  softBtnSx,
  dangerBtnSx,
  PageHead,
  StatCard,
  Chip,
  Empty,
} from "@/modules/finance/ui";
import { FinanceModal, fieldLabelSx, fieldInputSx, fieldRow2Sx } from "@/modules/finance/FinanceModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Full CRUD over the shared announcements backend. Edit/delete are only
// offered on rows this Finance account authored, because the backend enforces
// NOT_OWNER on those routes — showing the buttons otherwise would just produce
// a 403 the user cannot act on.

export default function FinanceAnnouncementsPage() {
  const { session } = useAuth();
  const { data: announcements, isLoading } = useAnnouncements();
  const { data: roles } = useRolesLookup();
  const createAnn = useCreateAnnouncement();
  const updateAnn = useUpdateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const [modal, setModal] = useState<null | { mode: "create" | "edit"; row?: AnnouncementRow }>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [audience, setAudience] = useState<NonNullable<AnnouncementRow["target_audience"]>>("teachers");
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [publish, setPublish] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AnnouncementRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const myUserId = session?.user.id;

  const rows = useMemo(() => {
    let list = announcements ?? [];
    if (catFilter) list = list.filter((a) => a.category === catFilter);
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(n) || a.content.toLowerCase().includes(n));
    }
    return [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [announcements, catFilter, statusFilter, q]);

  const mine = (announcements ?? []).filter((a) => a.posted_by_user_id === myUserId);

  function openCreate() {
    setTitle("");
    setContent("");
    setCategory("general");
    setAudience("teachers");
    setRoleIds([]);
    setPublish(true);
    setErr(null);
    setModal({ mode: "create" });
  }

  function openEdit(row: AnnouncementRow) {
    setTitle(row.title);
    setContent(row.content);
    setCategory((row.category ?? "general") as AnnouncementCategory);
    setAudience(row.target_audience ?? "teachers");
    setRoleIds(row.role_ids ?? []);
    setPublish(row.status === "published");
    setErr(null);
    setModal({ mode: "edit", row });
  }

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    (audience !== "roles" || roleIds.length > 0);

  function submit() {
    setErr(null);
    const input = {
      title: title.trim(),
      content: content.trim(),
      category,
      target_audience: audience,
      role_ids: audience === "roles" ? roleIds : undefined,
      status: publish ? ("published" as const) : ("draft" as const),
    };

    if (modal?.mode === "create") {
      createAnn.mutate(input, {
        onSuccess: () => {
          setModal(null);
          showToast(publish ? "Announcement published" : "Draft saved");
        },
        onError: (e) => setErr(e instanceof Error ? e.message : "Could not post that announcement"),
      });
    } else if (modal?.row) {
      updateAnn.mutate(
        { id: modal.row.id, input },
        {
          onSuccess: () => {
            setModal(null);
            showToast("Announcement updated");
          },
          onError: (e) => setErr(e instanceof Error ? e.message : "Could not update that announcement"),
        },
      );
    }
  }

  function doDelete() {
    if (!confirmDelete) return;
    const row = confirmDelete;
    setConfirmDelete(null);
    deleteAnn.mutate(row.id, {
      onSuccess: () => showToast("Announcement deleted"),
      onError: (e) => showToast(e instanceof Error ? e.message : "Could not delete that announcement"),
    });
  }

  return (
    <div>
      <PageHead
        title="Announcements"
        sub="Post and manage notices from the Finance office"
        actionLabel="New announcement"
        onAction={openCreate}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
        <StatCard label="Visible to you" value={String((announcements ?? []).length)} icon="megaphone" hi={String(mine.length)} sub="posted by Finance" pct={(announcements ?? []).length > 0 ? (mine.length / (announcements ?? []).length) * 100 : 0} foot="Across the institution" delay={0} />
        <StatCard label="Published" value={String(mine.filter((a) => a.status === "published").length)} icon="approve" hi={String(mine.length)} sub="Finance notices" pct={mine.length > 0 ? (mine.filter((a) => a.status === "published").length / mine.length) * 100 : 0} foot="Live for their audience" delay={55} />
        <StatCard label="Drafts" value={String(mine.filter((a) => a.status === "draft").length)} icon="history" hi={String(mine.length)} sub="Finance notices" pct={mine.length > 0 ? (mine.filter((a) => a.status === "draft").length / mine.length) * 100 : 0} foot="Not yet visible" delay={110} />
        <StatCard label="Urgent" value={String(mine.filter((a) => a.category === "emergency").length)} icon="shield" hi={String(mine.length)} sub="Finance notices" pct={mine.length > 0 ? (mine.filter((a) => a.category === "emergency").length / mine.length) * 100 : 0} foot="Marked urgent" delay={165} />
      </div>

      <div style={{ ...filterBarSx, marginTop: 22 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search announcements…" style={inputSx} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={selectSx}>
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectSx}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        {(q || catFilter || statusFilter) && (
          <button onClick={() => { setQ(""); setCatFilter(""); setStatusFilter(""); }} style={clearBtnSx}>Clear</button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 70, textAlign: "center", fontSize: 13.1, color: GREY.faint }}>Loading announcements…</div>
      ) : rows.length === 0 ? (
        <div style={cardSx}>
          <Empty
            title="No announcements to show"
            hint={(announcements ?? []).length === 0 ? "Post the first Finance notice." : "Try clearing the filters."}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((a, i) => {
            const isMine = a.posted_by_user_id === myUserId;
            const open = expanded === a.id;
            return (
              <div key={a.id} data-fin-lift="" className="fin-rise" style={{ ...cardSx, animationDelay: `${Math.min(i * 40, 240)}ms` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15.5, fontWeight: 800 }}>{a.title}</span>
                      {a.category && <Chip variant={a.category === "emergency" ? "solid" : "soft"}>{statusLabel(a.category)}</Chip>}
                      <Chip variant={a.status === "published" ? "outline" : "quiet"}>{statusLabel(a.status)}</Chip>
                      {isMine && <Chip variant="soft">Yours</Chip>}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        color: GREY.text,
                        marginTop: 8,
                        lineHeight: 1.6,
                        display: open ? "block" : "-webkit-box",
                        WebkitLineClamp: open ? "unset" : 2,
                        WebkitBoxOrient: "vertical",
                        overflow: open ? "visible" : "hidden",
                      }}
                    >
                      {a.content}
                    </div>
                    <div style={{ fontSize: 12, color: GREY.faint, marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>{formatDateTime(a.created_at)}</span>
                      {a.posted_by && (
                        <>
                          <span>·</span>
                          <span>{a.posted_by.name} ({a.posted_by.role})</span>
                        </>
                      )}
                      {a.target_audience && (
                        <>
                          <span>·</span>
                          <span>To {statusLabel(a.target_audience)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                    <button onClick={() => setExpanded(open ? null : a.id)} style={softBtnSx}>
                      {open ? "Collapse" : "Read"}
                    </button>
                    {/* Only the author can edit/delete — the backend enforces it. */}
                    {isMine && (
                      <>
                        <button onClick={() => openEdit(a)} style={softBtnSx}>Edit</button>
                        <button
                          onClick={() => setConfirmDelete(a)}
                          style={dangerBtnSx}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FinanceModal
        open={modal !== null}
        title={modal?.mode === "create" ? "New announcement" : "Edit announcement"}
        sub="Posted as the Finance office, institution-wide."
        cta={modal?.mode === "create" ? (publish ? "Publish" : "Save draft") : "Save changes"}
        busy={createAnn.isPending || updateAnn.isPending}
        disabled={!canSubmit}
        onClose={() => setModal(null)}
        onSubmit={submit}
        width={580}
      >
        {err && (
          <div style={{ background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 9, padding: "10px 13px", fontSize: 12.2, color: BLUE.strong, fontWeight: 600 }}>{err}</div>
        )}
        <div>
          <div style={fieldLabelSx}>Title <span style={{ color: BLUE.primary }}>*</span></div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Budget claim cut-off for this quarter" style={fieldInputSx} />
        </div>
        <div>
          <div style={fieldLabelSx}>Message <span style={{ color: BLUE.primary }}>*</span></div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="What do you need people to know?"
            style={{ ...fieldInputSx, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          />
        </div>
        <div style={fieldRow2Sx}>
          <div>
            <div style={fieldLabelSx}>Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)} style={{ ...fieldInputSx, background: "#fff" }}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={fieldLabelSx}>Audience</div>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as NonNullable<AnnouncementRow["target_audience"]>)}
              style={{ ...fieldInputSx, background: "#fff" }}
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        {audience === "roles" && (
          <div>
            <div style={fieldLabelSx}>Target roles <span style={{ color: BLUE.primary }}>*</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, maxHeight: 150, overflowY: "auto", border: `1px solid ${GREY.hair}`, borderRadius: 9, padding: 10 }}>
              {(roles ?? []).map((r) => {
                const picked = roleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => setRoleIds((prev) => (picked ? prev.filter((x) => x !== r.id) : [...prev, r.id]))}
                    style={{
                      borderRadius: 20,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: picked ? `1px solid ${BLUE.primary}` : `1px solid ${GREY.border}`,
                      background: picked ? BLUE.soft : "#fff",
                      color: picked ? BLUE.strong : GREY.text,
                    }}
                  >
                    {r.description ?? r.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} style={{ width: 15, height: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Publish now {publish ? "" : "— will be saved as a draft"}
          </span>
        </label>
      </FinanceModal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this announcement?"
        description={`"${confirmDelete?.title ?? ""}" will be removed for everyone. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: BLUE.ink, color: "#fff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
