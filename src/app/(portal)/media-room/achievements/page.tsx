"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Card, EmptyState, Icon, Input, Select } from "@/components/ui";
import {
  useAchievements,
  useAchievement,
  useCreateAchievement,
  useDeleteAchievement,
  useAddAchievementComment,
  type AchievementMediaType,
} from "@/modules/media-room/api/achievements";
import { useDepartments } from "@/modules/shared/api/departments";
import { useUploadAttachment } from "@/modules/media-room/api/upload";
import { useMyIdentity } from "@/modules/media-room/api/identity";
import { formatDisplayDate, formatDayAndTime } from "@/lib/utils/date";

function mediaTypeFor(file: File): AchievementMediaType {
  return file.type.startsWith("video/") ? "video" : "photo";
}

function NewAchievementModal({ onClose }: { onClose: () => void }) {
  const departments = useDepartments();
  const upload = useUploadAttachment();
  const create = useCreateAchievement();

  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [achievementDate, setAchievementDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const busy = upload.isPending || create.isPending;

  async function submit() {
    if (!departmentId) {
      setError("Select a department.");
      return;
    }
    if (!title.trim()) {
      setError("Give the achievement a title.");
      return;
    }
    if (files.length === 0) {
      setError("Attach at least one photo or video.");
      return;
    }
    setError(null);
    try {
      const media = [];
      for (const file of files) {
        const uploaded = await upload.mutateAsync(file);
        media.push({ media_type: mediaTypeFor(file), media_url: uploaded.url });
      }
      await create.mutateAsync({
        department_id: departmentId,
        title: title.trim(),
        description: description.trim() || undefined,
        achievement_date: achievementDate || undefined,
        media,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not post this achievement.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[500px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Post an achievement</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Department</label>
            <Select className="mt-1.5" value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Select department</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Title</label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Best Paper Award at ICCV 2026" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Description</label>
            <textarea
              className="mt-1.5 w-full rounded-[9px] border border-border-default bg-surface px-3 py-2 text-[13.5px] text-body outline-none focus:border-primary"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Achievement date</label>
            <Input className="mt-1.5" type="date" value={achievementDate} onChange={(e) => setAchievementDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Photos / videos (at least one)</label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-1.5 block w-full text-[13px]"
            />
            {files.length > 0 && <div className="mt-1 text-[12.5px] text-muted">{files.length} file{files.length === 1 ? "" : "s"} selected</div>}
          </div>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={busy}>
            {busy ? "Posting…" : "Post achievement"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AchievementDetailModal({ id, canDelete, onClose, onDeleted }: { id: number; canDelete: boolean; onClose: () => void; onDeleted: () => void }) {
  const detail = useAchievement(id);
  const addComment = useAddAchievementComment();
  const deleteAchievement = useDeleteAchievement();
  const [comment, setComment] = useState("");

  const a = detail.data;

  async function postComment() {
    if (!comment.trim()) return;
    await addComment.mutateAsync({ id, comment_text: comment.trim() });
    setComment("");
  }

  async function remove() {
    await deleteAchievement.mutateAsync(id);
    onDeleted();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">{a?.title ?? "Achievement"}</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-[26px] py-[22px]">
          {detail.isLoading || !a ? (
            <EmptyState message="Loading…" />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-[13px] text-muted">
                {a.departments.name}
                {a.achievement_date ? ` · ${formatDisplayDate(a.achievement_date)}` : ""}
              </div>
              {a.description && <p className="text-[13.5px] text-body">{a.description}</p>}
              {a.achievement_media.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {a.achievement_media.map((m) => (
                    <a key={m.id} href={m.media_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[9px] border border-border-default">
                      {m.media_type === "photo" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.media_url} alt="" className="h-[120px] w-full object-cover" />
                      ) : (
                        <div className="flex h-[120px] w-full items-center justify-center bg-icon-chip">
                          <Icon name="play_circle" size={28} className="text-primary" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}

              <div className="border-t border-divider pt-3">
                <h3 className="mb-2 text-[13.5px] font-extrabold text-ink">Comments ({a.achievement_comments.length})</h3>
                <div className="flex flex-col gap-2.5">
                  {a.achievement_comments.map((c) => (
                    <div key={c.id} className="rounded-[9px] bg-surface-tint px-3 py-2">
                      <div className="text-[12.5px] font-bold text-ink">{c.commenter?.name ?? "Someone"}</div>
                      <div className="text-[13px] text-body">{c.comment_text}</div>
                      <div className="mt-0.5 text-[11.5px] text-subtle">{formatDayAndTime(c.created_at)}</div>
                    </div>
                  ))}
                  {a.achievement_comments.length === 0 && <div className="text-[13px] text-muted">No comments yet.</div>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" className="flex-1" />
                  <Button variant="primarySmall" className="w-auto" onClick={postComment} disabled={addComment.isPending || !comment.trim()}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {canDelete && (
          <div className="flex justify-end border-t border-divider px-[26px] py-[18px]">
            <button
              type="button"
              onClick={remove}
              disabled={deleteAchievement.isPending}
              className="rounded-[7px] border border-danger-border px-3.5 py-2 text-[12.5px] font-bold text-danger-fg hover:bg-danger-bg"
            >
              Delete post
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function AchievementsPage() {
  const identity = useMyIdentity();
  const achievements = useAchievements(undefined, 50);
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = achievements.data?.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Achievements</h1>
          <p className="mt-1 text-[13px] text-muted">Press and recognition posts, shared institution-wide.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowNew(true)}>
          Post achievement
        </Button>
      </div>

      {showNew && <NewAchievementModal onClose={() => setShowNew(false)} />}
      {selectedId != null && (
        <AchievementDetailModal
          id={selectedId}
          canDelete={rows.find((r) => r.id === selectedId)?.posted_by_user_id === identity.data?.id}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      )}

      {achievements.isLoading ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No achievements posted yet." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {rows.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift"
              onClick={() => setSelectedId(a.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[16.5px] font-extrabold text-ink">{a.title}</div>
                  <div className="mt-0.5 text-[13px] text-muted">
                    {a.departments.name}
                    {a.achievement_date ? ` · ${formatDisplayDate(a.achievement_date)}` : ""}
                  </div>
                </div>
                {a.posted_by_user_id === identity.data?.id && <Badge tone="accent">Yours</Badge>}
              </div>
              {a.description && <p className="mt-2.5 line-clamp-2 text-[13.5px] text-body">{a.description}</p>}
              <div className="mt-3 flex items-center gap-3 border-t border-divider pt-3 text-[12.5px] text-subtle">
                <span className="inline-flex items-center gap-1">
                  <Icon name="photo_library" size={15} />
                  {a.achievement_media.length}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="chat_bubble" size={15} />
                  {a._count.achievement_comments}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
