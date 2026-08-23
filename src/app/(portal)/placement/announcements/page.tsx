"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiError } from "@/types/api";
import { useAnnouncements } from "@/modules/placement/hooks/useAnnouncements";
import { useDeleteAnnouncement } from "@/modules/placement/hooks/useAnnouncementMutations";
import { AnnouncementComposerModal } from "@/modules/placement/components/announcements/AnnouncementComposerModal";
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementListItem } from "@/modules/placement/types";

const AUDIENCE_LABEL: Record<string, string> = {
  students: "Students",
  teachers: "Faculty / HODs",
  parents: "Parents",
  roles: "Placement cell staff",
};

const CAT_TONE: Record<string, { bg: string; fg: string }> = {
  emergency: { bg: "#eef1f6", fg: "#16224a" },
  academic: { bg: "#e8f0fe", fg: "#1d4ed8" },
  placement: { bg: "#e8f0fe", fg: "#1d4ed8" },
};

function catTone(category: string | null) {
  return (category && CAT_TONE[category]) || { bg: "#eff2f7", fg: "#46536a" };
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AnnouncementCard({
  a,
  isMine,
  onEdit,
  onDelete,
}: {
  a: AnnouncementListItem;
  isMine: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const audienceBits: string[] = [];
  if (a.classLabels.length > 0) audienceBits.push(`${a.classLabels.length} class${a.classLabels.length === 1 ? "" : "es"}`);
  if (a.roleLabels.length > 0) audienceBits.push(a.roleLabels.join(", "));
  audienceBits.push(AUDIENCE_LABEL[a.targetAudience] ?? a.targetAudience);
  const tone = catTone(a.category);

  return (
    <div className="rounded-card border border-border-default bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {a.category && (
          <span
            className="rounded-[6px] px-[9px] py-1 font-mono text-[10.5px] font-semibold tracking-[.9px] uppercase"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {a.category}
          </span>
        )}
        <span className="text-[12.5px] text-muted">{dateLabel(a.createdAt)}</span>
        <span className="flex-1" />
        <span className="text-[12.5px] text-muted">{a.postedBy.name}</span>
        <span
          className={`rounded-[6px] px-2.5 py-1 text-[10.5px] font-bold tracking-[.9px] uppercase ${
            a.status === "published" ? "bg-accent-100 text-primary" : "bg-surface-tint text-subtle"
          }`}
        >
          {a.status}
        </span>
      </div>
      <div className="mt-2.5 text-base font-bold tracking-[-.3px] text-ink">{a.title}</div>
      <div className="mt-1 text-[13px] leading-[1.55] text-body">{a.content}</div>
      <div className="mt-2.5 flex items-center gap-3.5">
        <span className="text-[12.5px] text-subtle">Audience · {audienceBits.join(" · ")}</span>
        {isMine && (
          <>
            <span className="flex-1" />
            <button type="button" onClick={onEdit} className="text-[12.5px] font-semibold text-primary">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="text-[12.5px] font-semibold text-danger-fg">
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PlacementAnnouncementsPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const { data, isLoading, error } = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [audience, setAudience] = useState("All audiences");
  const [composerTarget, setComposerTarget] = useState<AnnouncementListItem | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => {
      const matchesQuery = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
      const matchesCategory = category === "All categories" || a.category === category;
      const matchesAudience = audience === "All audiences" || a.targetAudience === audience;
      return matchesQuery && matchesCategory && matchesAudience;
    });
  }, [rows, query, category, audience]);

  function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    deleteAnnouncement.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Announcement deleted.", "success");
        setDeleteTarget(null);
        setDeleting(false);
      },
      onError: (err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong.", "error");
        setDeleting(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Announcements</h1>
          <p className="mt-1.5 text-[13px] text-muted">Circulars from the institution and posts you publish to your department</p>
        </div>
        <Button variant="primarySmall" onClick={() => setComposerTarget("new")}>
          New announcement
        </Button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search announcements" className="max-w-70" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
          {["All categories", ...ANNOUNCEMENT_CATEGORIES].map((c) => (
            <option key={c} value={c}>
              {c === "All categories" ? c : c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </Select>
        <Select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-auto">
          {["All audiences", "students", "teachers", "parents"].map((a) => (
            <option key={a} value={a}>
              {a === "All audiences" ? a : AUDIENCE_LABEL[a]}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setQuery("");
            setCategory("All categories");
            setAudience("All audiences");
          }}
        >
          Reset
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <div className="text-[13px] text-muted">Loading…</div>}
        {error && <div className="text-[13px] text-danger-fg">Failed to load announcements.</div>}
        {!isLoading && !error && filtered.length === 0 && <div className="text-[13px] text-muted">No announcements match these filters.</div>}
        {filtered.map((a) => (
          <AnnouncementCard
            key={a.id}
            a={a}
            isMine={session != null && session.user.id === a.postedByUserId}
            onEdit={() => setComposerTarget(a)}
            onDelete={() => setDeleteTarget(a)}
          />
        ))}
      </div>

      <AnnouncementComposerModal open={composerTarget !== null} announcement={composerTarget === "new" || composerTarget === null ? null : composerTarget} onClose={() => setComposerTarget(null)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete announcement"
        description={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
