"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MAX_MEDIA_PER_POST,
  probeMedia,
  validateMediaBatch,
  type ProbedMedia,
} from "@/modules/media-room/mediaUpload";
import { Badge, Button, Card, EmptyState, Icon, SegmentedTabs, type BadgeTone } from "@/components/ui";
import {
  useAllClassIds,
  useMyAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useAnnouncementComments,
  useAddComment,
  useDeleteComment,
  SOCIAL_POST_FORMATS,
  type Announcement,
  type AnnouncementCategory,
} from "@/modules/media-room/api/announcements";
import { useUploadAttachment } from "@/modules/media-room/api/upload";
import { formatDayAndTime, formatDisplayDate, formatRelativeTime, getMonthGrid, monthLabel, toIsoDateString } from "@/lib/utils/date";

const TABS = [
  { key: "compose", label: "New post" },
  { key: "app", label: "App Explore feed" },
  { key: "calendar", label: "Content calendar" },
];

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "academic", label: "Academic" },
  { value: "department", label: "Department" },
  { value: "general", label: "General" },
];

const CATEGORY_TONE: Record<string, BadgeTone> = {
  event: "accent",
  academic: "accent",
  department: "neutral",
  general: "neutral",
  emergency: "danger",
};

/** No dedicated "title" field in the design's composer (just a caption) — announcements.title is NOT NULL, so it's derived. */
function deriveTitle(caption: string): string {
  const firstLine = caption.trim().split("\n")[0] ?? "";
  return firstLine.length > 0 ? firstLine.slice(0, 120) : "Untitled post";
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-[10px] border px-3.5 text-[13.5px] font-bold transition-colors ${
        active ? "border-primary-border bg-accent-50 text-primary" : "border-border-default bg-surface text-body hover:bg-surface-tint"
      }`}
    >
      {children}
    </button>
  );
}

// ── Tab 1: New post ─────────────────────────────────────────────────────────

function ComposeTab() {
  const allClassIds = useAllClassIds();
  const upload = useUploadAttachment();
  const create = useCreateAnnouncement();

  const [format, setFormat] = useState<string>(SOCIAL_POST_FORMATS[0]);
  const [category, setCategory] = useState<AnnouncementCategory>("event");
  const [caption, setCaption] = useState("");
  // Ordered carousel items. Array order IS the slide order; the server
  // assigns sequence_no from it (see insertAnnouncementMedia).
  const [media, setMedia] = useState<ProbedMedia[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [postDate, setPostDate] = useState("");
  const [postTime, setPostTime] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const busy = upload.isPending || create.isPending;

  // Object URLs live until explicitly revoked; without this, composing several
  // posts in one session leaks every preview it ever made.
  useEffect(
    () => () => {
      media.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount-only cleanup
    [],
  );
  const scheduling = postDate.trim().length > 0;

  async function submit(asDraft: boolean) {
    if (!caption.trim()) {
      setError("Write a caption first.");
      return;
    }
    if (!asDraft && !allClassIds.data?.length) {
      setError("Could not resolve the student audience. Try again in a moment.");
      return;
    }
    setError(null);
    try {
      // Uploaded one at a time on purpose: the storage endpoint is a single
      // multipart POST, and firing ten in parallel from a browser is how you
      // get half-finished batches when one fails. The first item also doubles
      // as announcements.file_key so older clients that only read that single
      // field still see the post's lead image.
      const uploadedMedia: {
        storage_key: string;
        media_type: "photo" | "video";
        width?: number;
        height?: number;
        duration_seconds?: number;
      }[] = [];
      for (const item of media) {
        const uploaded = await upload.mutateAsync(item.file);
        uploadedMedia.push({
          storage_key: uploaded.file_key,
          media_type: item.kind,
          width: item.width ?? undefined,
          height: item.height ?? undefined,
          duration_seconds: item.durationSeconds ?? undefined,
        });
      }
      const file_key = uploadedMedia[0]?.storage_key;
      const file_name = media[0]?.file.name;
      await create.mutateAsync({
        title: deriveTitle(caption),
        content: caption.trim(),
        category,
        class_ids: allClassIds.data ?? [],
        file_key,
        file_name,
        status: asDraft || scheduling ? "draft" : "published",
        scheduled_at: scheduling ? new Date(`${postDate}T${postTime || "09:00"}:00`).toISOString() : undefined,
        format,
        link_url: linkUrl.trim() || undefined,
        expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
        is_pinned: isPinned,
        allow_comments: allowComments,
        first_comment: firstComment.trim() || undefined,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
      });
      setCaption("");
      setMedia([]);
      setLinkUrl("");
      setFirstComment("");
      setIsPinned(false);
      setPostDate("");
      setPostTime("");
      setExpiresAt("");
      setNotice(
        asDraft
          ? "Saved as a draft."
          : scheduling
            ? `Scheduled for ${new Date(`${postDate}T${postTime || "09:00"}:00`).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. It publishes itself — no need to come back for it.`
            : "Published to the Explore feed.",
      );
      setTimeout(() => setNotice(null), 4000);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this post.");
    }
  }

  return (
    <div className="grid grid-cols-[1.25fr_1fr] items-start gap-4">
      <Card data-mr-lift="1">
        <h2 className="text-[19px] font-extrabold text-ink">New post</h2>
        <p className="mt-1 text-[13px] text-muted">Goes to the college app Explore feed</p>

        <div className="mt-5 text-[13.5px] font-bold text-primary">Post format</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOCIAL_POST_FORMATS.map((f) => (
            <Chip key={f} active={format === f} onClick={() => setFormat(f)}>
              {f}
            </Chip>
          ))}
        </div>

        <div className="mt-5 text-[13.5px] font-bold text-primary">Post category</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
              {c.label}
            </Chip>
          ))}
        </div>

        <div className="mt-5 text-[13.5px] font-bold text-primary">Caption</div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          maxLength={2200}
          placeholder="Write the caption. Mention the department, date, venue and the registration link."
          className="mt-2 w-full rounded-[12px] border border-border-default px-3.5 py-3 text-[14.5px] leading-relaxed outline-none focus:border-primary"
        />
        <div className="mt-1.5 flex items-center gap-2.5 font-mono text-[12.5px] text-subtle">
          <span>{caption.length} / 2200</span>
          <span>·</span>
          <span>#SriEshwar #SECE #Engineering</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[13.5px] font-bold text-primary">Publish date</div>
            <input
              type="date"
              value={postDate}
              onChange={(e) => setPostDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-[11px] border border-border-default px-3 text-[14.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-primary">Publish time</div>
            <input
              type="time"
              value={postTime}
              onChange={(e) => setPostTime(e.target.value)}
              disabled={!scheduling}
              className="mt-2 h-11 w-full rounded-[11px] border border-border-default px-3 text-[14.5px] outline-none focus:border-primary disabled:bg-surface-muted"
            />
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-primary">First comment</div>
            <input
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
              placeholder="Hashtags or credits posted as the first comment"
              className="mt-2 h-11 w-full rounded-[11px] border border-border-default px-3 text-[14.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-primary">Link in post</div>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Registration or admissions link"
              className="mt-2 h-11 w-full rounded-[11px] border border-border-default px-3 text-[14.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip active={isPinned} onClick={() => setIsPinned((v) => !v)}>
            {isPinned ? "✓ " : ""}Pin to top of Explore
          </Chip>
          <Chip active={allowComments} onClick={() => setAllowComments((v) => !v)}>
            {allowComments ? "✓ " : ""}Allow comments
          </Chip>
        </div>

        <div className="mt-5 text-[13.5px] font-bold text-primary">Creative</div>
        {media.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2.5">
            {media.map((item, index) => (
              <div
                key={item.previewUrl}
                className="relative h-[92px] w-[92px] overflow-hidden rounded-[10px] border border-border-default bg-ink"
              >
                {item.kind === "photo" ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote asset next/image can optimise */
                  <img src={item.previewUrl} alt="" className="size-full object-contain" />
                ) : (
                  <video src={item.previewUrl} className="size-full object-contain" muted />
                )}

                {/* Slide number: this order is exactly what viewers will swipe. */}
                <span className="absolute left-1 top-1 rounded-[5px] bg-ink/70 px-1.5 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                {item.kind === "video" && (
                  <span className="absolute bottom-1 left-1 rounded-[5px] bg-ink/70 px-1.5 text-[10px] font-bold text-white">
                    video
                  </span>
                )}

                <div className="absolute bottom-1 right-1 flex gap-1">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    disabled={index === 0}
                    onClick={() =>
                      setMedia((current) => {
                        const next = [...current];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return next;
                      })
                    }
                    className="rounded-[5px] bg-ink/70 px-1.5 text-[10px] font-bold text-white disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={index === media.length - 1}
                    onClick={() =>
                      setMedia((current) => {
                        const next = [...current];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        return next;
                      })
                    }
                    className="rounded-[5px] bg-ink/70 px-1.5 text-[10px] font-bold text-white disabled:opacity-30"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() =>
                      setMedia((current) => {
                        URL.revokeObjectURL(item.previewUrl);
                        return current.filter((m) => m.previewUrl !== item.previewUrl);
                      })
                    }
                    className="rounded-[5px] bg-danger-fg/85 px-1.5 text-[10px] font-bold text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="mt-2 flex h-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-border-default bg-surface-muted text-center">
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={async (e) => {
              const picked = Array.from(e.target.files ?? []);
              // Cleared so re-picking the same file always re-fires onChange.
              e.target.value = "";
              if (picked.length === 0) return;
              const problem = validateMediaBatch(media.length, picked);
              if (problem) {
                setMediaError(problem);
                return;
              }
              setMediaError(null);
              const probed = await Promise.all(picked.map(probeMedia));
              setMedia((current) => [...current, ...probed]);
            }}
            className="hidden"
          />
          <span className="font-mono text-[12.5px] text-muted">
            {media.length === 0
              ? "drop photos / videos here"
              : `add more · ${media.length}/${MAX_MEDIA_PER_POST}`}
          </span>
          <span className="text-[12px] text-subtle">
            Several files allowed — viewers swipe through them. First one is the cover.
          </span>
        </label>

        {mediaError && <div className="mt-2 text-[13px] font-semibold text-danger-fg">{mediaError}</div>}

        {error && <div className="mt-3 text-[13px] font-semibold text-danger-fg">{error}</div>}
        {notice && <div className="mt-3 text-[13px] font-semibold text-success-fg">{notice}</div>}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => submit(true)} disabled={busy} className="h-12 rounded-[11px] border border-border-default bg-surface px-5 text-[15px] font-bold text-ink hover:bg-surface-tint">
            Save draft
          </button>
          <Button variant="primarySmall" className="h-12 w-auto px-6" onClick={() => submit(false)} disabled={busy}>
            {busy ? "Saving…" : scheduling ? "Schedule post" : "Publish now"}
          </Button>
        </div>
      </Card>

      <Card data-mr-lift="1">
        <h2 className="text-[19px] font-extrabold text-ink">App preview</h2>
        <div className="mx-auto mt-4 w-[280px] overflow-hidden rounded-[24px] border border-border-default bg-surface-muted">
          <div className="bg-primary px-4 py-3.5 text-white">
            <div className="text-[15px] font-extrabold">Hi, Student</div>
            <div className="text-[12.5px] opacity-80">Good Morning!</div>
          </div>
          <div className="p-3">
            <div className="rounded-[13px] bg-surface p-3.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-[7px] bg-primary text-[11px] font-extrabold text-white">SE</div>
                <div className="text-[12.5px] font-extrabold text-ink">Sri Eshwar College of Engineering</div>
              </div>
              <div className="mt-2.5 min-h-[32px] whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{caption || "Your caption appears here…"}</div>
              <div className="mt-2.5 flex h-[100px] items-center justify-center rounded-[9px] bg-surface-tint font-mono text-[11.5px] text-subtle">creative 1080 × 1350</div>
              {firstComment && <div className="mt-2.5 truncate rounded-full border border-divider px-3 py-1.5 text-[12px] text-subtle">{firstComment}</div>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Tab 2: App Explore feed ──────────────────────────────────────────────────

function CommentsPanel({ post }: { post: Announcement }) {
  const comments = useAnnouncementComments(post.id);
  const addComment = useAddComment(post.id);
  const deleteComment = useDeleteComment(post.id);
  const [filter, setFilter] = useState<"all" | "unanswered">("all");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [text, setText] = useState("");

  const rows = comments.data ?? [];
  const topLevel = rows.filter((c) => c.parent_comment_id === null);
  const repliesOf = (id: number) => rows.filter((c) => c.parent_comment_id === id);
  const visible = filter === "unanswered" ? topLevel.filter((c) => repliesOf(c.id).length === 0) : topLevel;

  async function submit() {
    if (!text.trim()) return;
    await addComment.mutateAsync({ comment_text: text.trim(), parent_comment_id: replyTo ?? undefined });
    setText("");
    setReplyTo(null);
  }

  return (
    <Card data-mr-lift="1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-extrabold text-ink">Comments</h2>
          <p className="mt-1 truncate text-[13px] text-muted">{post.title}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({topLevel.length})
        </Chip>
        <Chip active={filter === "unanswered"} onClick={() => setFilter("unanswered")}>
          Unanswered ({topLevel.filter((c) => repliesOf(c.id).length === 0).length})
        </Chip>
      </div>

      <div className="mt-3 flex flex-col">
        {comments.isLoading ? (
          <EmptyState message="Loading…" />
        ) : visible.length === 0 ? (
          <EmptyState message="No comments yet." />
        ) : (
          visible.map((c) => (
            <div key={c.id} className="border-t border-divider py-3 first:border-0 first:pt-0">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-extrabold text-white">
                  {(c.commenter_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-ink">{c.commenter_name ?? "Unknown"}</span>
                    <span className="text-[12px] text-subtle">{formatRelativeTime(c.created_at)}</span>
                  </div>
                  <div className="mt-0.5 text-[13.5px] text-body">{c.comment_text}</div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <button type="button" onClick={() => setReplyTo(c.id)} className="text-[12px] font-bold text-primary hover:underline">
                      Reply
                    </button>
                    <button type="button" onClick={() => deleteComment.mutate(c.id)} className="text-[12px] font-bold text-danger-fg hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="ml-11 mt-2 flex items-start gap-2.5 rounded-[10px] bg-surface-muted p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-ink">{r.commenter_name ?? "Unknown"}</span>
                      <span className="text-[11.5px] text-subtle">{formatRelativeTime(r.created_at)}</span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-body">{r.comment_text}</div>
                  </div>
                  <button type="button" onClick={() => deleteComment.mutate(r.id)} className="shrink-0 text-[11.5px] font-bold text-danger-fg hover:underline">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-divider pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? "Write a reply…" : "Reply as Media Room…"}
          className="h-10 flex-1 rounded-[10px] border border-border-default px-3 text-[13.5px] outline-none focus:border-primary"
        />
        {replyTo && (
          <button type="button" onClick={() => setReplyTo(null)} className="text-[12px] font-bold text-muted">
            Cancel reply
          </button>
        )}
        <Button variant="primarySmall" className="h-10 w-auto px-4" onClick={submit} disabled={addComment.isPending || !text.trim()}>
          Send
        </Button>
      </div>
    </Card>
  );
}

function ExploreFeedTab() {
  const posts = useMyAnnouncements();
  const update = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();
  // Two-step delete: a post is live to the whole college and deleting it also
  // removes its comments and its uploaded media from storage, so a single
  // mis-click must not be enough.
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const published = useMemo(() => {
    const rows = (posts.data ?? []).filter((p) => p.status === "published");
    return [...rows].sort((a, b) => {
      const pin = Number(b.social?.is_pinned ?? false) - Number(a.social?.is_pinned ?? false);
      if (pin !== 0) return pin;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [posts.data]);

  const totalComments = published.reduce((sum, p) => sum + (p.comment_count ?? 0), 0);
  const totalUnanswered = published.reduce((sum, p) => sum + (p.unanswered_count ?? 0), 0);
  const totalPinned = published.filter((p) => p.social?.is_pinned).length;

  const activePost = published.find((p) => p.id === activeId) ?? published[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Live posts", value: published.length },
          { label: "Total comments", value: totalComments },
          { label: "Unanswered", value: totalUnanswered },
          { label: "Pinned", value: totalPinned },
        ].map((s) => (
          <div key={s.label} data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-[16px_18px]">
            <div className="text-[13px] text-muted">{s.label}</div>
            <div className="mt-1.5 text-[26px] font-extrabold text-ink">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1.2fr] items-start gap-4">
        <Card data-mr-lift="1">
          <h2 className="text-[19px] font-extrabold text-ink">Live on Explore</h2>
          <p className="mt-1 text-[13px] text-muted">Select a post to read and moderate its comments</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {published.length === 0 ? (
              <EmptyState message="Nothing published yet." />
            ) : (
              published.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`cursor-pointer rounded-[12px] border p-3.5 ${p.id === activePost?.id ? "border-primary-border bg-accent-50" : "border-border-default bg-surface hover:bg-surface-tint"}`}
                >
                  <div className="flex items-center gap-2">
                    {p.social?.is_pinned && <Badge tone="accent">Pinned</Badge>}
                    {p.social?.format && <Badge tone="neutral">{p.social.format}</Badge>}
                    <span className="text-[12px] text-subtle">{formatDayAndTime(p.created_at)}</span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(editingId === p.id ? null : p.id);
                        setEditText(p.content);
                      }}
                      className="text-[12px] font-bold text-primary hover:underline"
                    >
                      Edit
                    </button>
                    {confirmDeleteId === p.id ? (
                      <>
                        <button
                          type="button"
                          disabled={remove.isPending}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            try {
                              await remove.mutateAsync(p.id);
                              setConfirmDeleteId(null);
                              // Selection would otherwise point at a post that
                              // no longer exists.
                              if (activeId === p.id) setActiveId(null);
                            } catch (err: unknown) {
                              setDeleteError(
                                (err as { message?: string })?.message ?? "Could not delete this post.",
                              );
                            }
                          }}
                          className="text-[12px] font-bold text-danger-fg hover:underline disabled:opacity-50"
                        >
                          {remove.isPending ? "Deleting…" : "Confirm delete"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                            setDeleteError(null);
                          }}
                          className="text-[12px] font-bold text-muted hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(p.id);
                          setDeleteError(null);
                        }}
                        className="text-[12px] font-bold text-danger-fg hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {confirmDeleteId === p.id && (
                    <div className="mt-2 rounded-[9px] border border-danger-border bg-danger-bg px-2.5 py-2 text-[12px] font-semibold text-danger-fg">
                      Removes this post from the app for everyone, along with its comments and uploaded media. This cannot be undone.
                      {deleteError && <div className="mt-1">{deleteError}</div>}
                    </div>
                  )}
                  {editingId === p.id ? (
                    <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-9 flex-1 rounded-[9px] border border-border-default px-2.5 text-[13px] outline-none focus:border-primary" />
                      <button
                        type="button"
                        onClick={async () => {
                          await update.mutateAsync({ id: p.id, content: editText });
                          setEditingId(null);
                        }}
                        className="h-9 rounded-[9px] bg-primary px-3 text-[12.5px] font-bold text-white"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 line-clamp-2 text-[13.5px] font-semibold text-ink">{p.content}</div>
                  )}
                  <div className="mt-2 flex gap-4 text-[12.5px] text-muted">
                    <span>
                      Comments <b className="text-ink">{p.comment_count ?? 0}</b>
                    </span>
                    <span>
                      Unanswered <b className="text-primary">{p.unanswered_count ?? 0}</b>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {activePost ? <CommentsPanel post={activePost} /> : (
          <Card data-mr-lift="1">
            <EmptyState message="Nothing to moderate yet." />
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: Content calendar ──────────────────────────────────────────────────

function CalendarTab() {
  const posts = useMyAnnouncements();
  const allClassIds = useAllClassIds();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      (posts.data ?? [])
        .filter((p) => p.scheduled_at || p.status === "published")
        .map((p) => ({ post: p, date: (p.scheduled_at ?? p.created_at).slice(0, 10) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [posts.data],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, true>();
    for (const e of entries) map.set(e.date, true);
    return map;
  }, [entries]);

  const weeks = getMonthGrid(cursor.year, cursor.month, "monday");
  const todayIso = toIsoDateString(new Date());

  const monthEntries = entries.filter((e) => {
    const d = new Date(`${e.date}T00:00:00`);
    return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
  });
  const visibleEntries = selectedDay ? monthEntries.filter((e) => e.date === selectedDay) : monthEntries;

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  async function saveCalPost() {
    if (!newTitle.trim() || !newDate) {
      setError("Post title and date are required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        title: deriveTitle(newTitle),
        content: newTitle.trim(),
        class_ids: allClassIds.data ?? [],
        status: "draft",
        scheduled_at: new Date(`${newDate}T${newTime || "09:00"}:00`).toISOString(),
      });
      setNewTitle("");
      setNewDate("");
      setNewTime("");
      setAddOpen(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not add this to the calendar.");
    }
  }

  return (
    <div className="grid grid-cols-[1fr_1.15fr] items-start gap-4">
      <Card data-mr-lift="1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shiftMonth(-1)} className="flex size-10 items-center justify-center rounded-[11px] border border-border-default hover:bg-surface-tint">
            ‹
          </button>
          <div className="text-center">
            <div className="text-[20px] font-extrabold text-ink">{monthLabel(cursor.year, cursor.month)}</div>
            <div className="text-[13px] text-muted">{monthEntries.length} posts this month</div>
          </div>
          <button type="button" onClick={() => shiftMonth(1)} className="flex size-10 items-center justify-center rounded-[11px] border border-border-default hover:bg-surface-tint">
            ›
          </button>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[12.5px] font-bold text-subtle">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map((cell, ci) => {
                if (!cell.iso) return <div key={ci} />;
                const hasEntries = byDate.has(cell.iso);
                const isToday = cell.iso === todayIso;
                const isSelected = cell.iso === selectedDay;
                return (
                  <button
                    type="button"
                    key={ci}
                    onClick={() => setSelectedDay(isSelected ? null : cell.iso)}
                    className={`flex aspect-square items-center justify-center rounded-[10px] text-[13.5px] font-bold ${
                      hasEntries ? "bg-accent-50 text-primary" : "text-ink hover:bg-surface-tint"
                    } ${isToday ? "ring-2 ring-primary" : ""} ${isSelected ? "bg-primary text-white" : ""}`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card data-mr-lift="1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-extrabold text-ink">{selectedDay ? formatDisplayDate(`${selectedDay}T00:00:00`) : "This month"}</h2>
            <p className="mt-0.5 text-[13px] text-muted">Scheduled drafts and published posts</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selectedDay && (
              <button type="button" onClick={() => setSelectedDay(null)} className="h-9 rounded-[9px] border border-border-default px-3 text-[13px] font-bold text-ink hover:bg-surface-tint">
                Show all
              </button>
            )}
            <Button variant="primarySmall" className="h-9 w-auto px-3.5 text-[13px]" onClick={() => setAddOpen((v) => !v)}>
              {addOpen ? "Close" : "+ Add to calendar"}
            </Button>
          </div>
        </div>

        {addOpen && (
          <div className="mt-4 rounded-[13px] border border-primary-border bg-accent-50 p-4">
            <div className="text-[15px] font-extrabold text-ink">Add to the calendar</div>
            <p className="mt-0.5 text-[12.5px] text-muted">Blocks the slot in the publishing queue. Write the full caption later from New post.</p>
            <div className="mt-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Elektra 2026 registration opens"
                className="h-11 w-full rounded-[10px] border border-border-default bg-surface px-3 text-[14px] outline-none focus:border-primary"
              />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-11 rounded-[10px] border border-border-default bg-surface px-3 text-[14px] outline-none focus:border-primary" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="h-11 rounded-[10px] border border-border-default bg-surface px-3 text-[14px] outline-none focus:border-primary" />
            </div>
            {error && <div className="mt-2 text-[12.5px] font-semibold text-danger-fg">{error}</div>}
            <div className="mt-3 flex justify-end gap-2.5">
              <button type="button" onClick={() => setAddOpen(false)} className="h-10 rounded-[9px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink">
                Cancel
              </button>
              <Button variant="primarySmall" className="h-10 w-auto px-4" onClick={saveCalPost} disabled={create.isPending}>
                Add to calendar
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col">
          {visibleEntries.length === 0 ? (
            <EmptyState message="Nothing scheduled." />
          ) : (
            visibleEntries.map((e) => {
              const d = new Date(`${e.date}T00:00:00`);
              const isDraft = e.post.status === "draft";
              return (
                <div key={e.post.id} className="flex items-center gap-4 border-t border-divider py-3 first:border-0 first:pt-0">
                  <div className="flex w-[54px] shrink-0 flex-col items-center rounded-[9px] border border-border-default bg-surface-muted py-1.5">
                    <span className="text-[17px] font-extrabold text-ink">{d.getDate()}</span>
                    <span className="text-[10px] font-bold uppercase text-subtle">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-bold text-ink">{e.post.content}</div>
                    {/* A scheduled post publishes itself (see
                        AnnouncementsService.publishDueScheduledAnnouncements,
                        which runs every minute), so this says when that will
                        happen rather than just "draft". "Publish now" is only
                        an early-release shortcut. */}
                    <div className="text-[12.5px] text-subtle">
                      {isDraft
                        ? e.post.scheduled_at
                          ? `Auto-publishes ${new Date(e.post.scheduled_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "Draft — no schedule set"
                        : "Published"}
                    </div>
                  </div>
                  {isDraft ? (
                    <button
                      type="button"
                      onClick={() => update.mutate({ id: e.post.id, status: "published", target_audience: "students", class_ids: allClassIds.data ?? [] })}
                      className="shrink-0 rounded-[8px] border border-primary-border px-2.5 py-1.5 text-[12px] font-bold text-primary hover:bg-accent-50"
                    >
                      Publish now
                    </button>
                  ) : (
                    <Badge tone="accent">Live</Badge>
                  )}
                  <button type="button" onClick={() => remove.mutate(e.post.id)} className="shrink-0 rounded-[8px] border border-danger-border px-2.5 py-1.5 text-[12px] font-bold text-danger-fg hover:bg-danger-bg">
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MediaPublishingPage() {
  const [tab, setTab] = useState("compose");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Social Media Publishing</h1>
          <p className="mt-1 text-[13px] text-muted">Publish to the Explore feed of the college mobile app and manage the comments students leave there</p>
        </div>
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "compose" && <ComposeTab />}
      {tab === "app" && <ExploreFeedTab />}
      {tab === "calendar" && <CalendarTab />}
    </div>
  );
}
