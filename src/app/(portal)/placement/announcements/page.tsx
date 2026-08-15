"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { friendlyError } from "@/lib/utils/errors";
import {
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  Card,
  ConfirmDialog,
  PendingNotice,
  EmptyState,
  useToast,
} from "@/modules/admin/components/ui";
import { dateTimeLabel } from "@/modules/placement/lib/format";
import {
  ANNOUNCEMENT_CATEGORIES,
  useAnnouncements,
  useDeleteAnnouncement,
  type AnnouncementListItem,
} from "@/modules/placement/api/announcements";
import { AnnouncementComposerModal } from "@/modules/placement/components/announcements/AnnouncementComposerModal";

const AUDIENCE_LABEL: Record<string, string> = {
  students: "Students",
  teachers: "Faculty / HODs",
  parents: "Parents",
  roles: "Placement cell staff",
};

const CATEGORY_TONE: Record<string, "danger" | "primary" | "neutral"> = {
  emergency: "danger",
  academic: "primary",
  placement: "primary",
};

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

  return (
    <Card hoverable={false} className="p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {a.category && <Badge tone={CATEGORY_TONE[a.category] ?? "neutral"}>{a.category}</Badge>}
        <span className="text-xs text-admin-muted">{dateTimeLabel(a.createdAt)}</span>
        <span className="flex-1" />
        <span className="text-xs text-admin-muted">{a.postedBy.name}</span>
        <Badge tone={a.status === "published" ? "primary" : "neutral"}>{a.status}</Badge>
      </div>
      <div className="mt-2.5 text-base font-bold tracking-[-.01em] text-admin-ink">{a.title}</div>
      <p className="mt-1 text-sm leading-relaxed text-admin-body">{a.content}</p>
      <div className="mt-2.5 flex items-center gap-3.5">
        <span className="text-xs text-admin-subtle">Audience · {audienceBits.join(" · ")}</span>
        {isMine && (
          <>
            <span className="flex-1" />
            <button type="button" onClick={onEdit} className="text-xs font-semibold text-admin-primary hover:text-admin-primary-dark">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="text-xs font-semibold text-admin-danger hover:text-admin-danger">
              Delete
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function PlacementAnnouncementsPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const { data, isLoading, error } = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState("");
  const [composerTarget, setComposerTarget] = useState<AnnouncementListItem | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementListItem | null>(null);

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => {
      const matchesQuery = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
      const matchesCategory = !category || a.category === category;
      const matchesAudience = !audience || a.targetAudience === audience;
      return matchesQuery && matchesCategory && matchesAudience;
    });
  }, [rows, query, category, audience]);

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteAnnouncement.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Announcement deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Announcements"
        description="Circulars from the institution and posts you publish to your department."
        actions={
          <Button variant="primary" onClick={() => setComposerTarget("new")}>
            New announcement
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-[220px] flex-1">
          <Input leadingIcon="search" placeholder="Search announcements" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {ANNOUNCEMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </Select>
        <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="">All audiences</option>
          {(["students", "teachers", "parents"] as const).map((a) => (
            <option key={a} value={a}>
              {AUDIENCE_LABEL[a]}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setQuery("");
            setCategory("");
            setAudience("");
          }}
        >
          Reset
        </Button>
      </div>

      <div className="flex flex-col gap-3.5">
        {isLoading && <PendingNotice reason="Loading…" height={100} />}
        {!isLoading && error && <PendingNotice reason={friendlyError(error)} height={100} />}
        {!isLoading && !error && filtered.length === 0 && <EmptyState icon="campaign" title="No announcements match these filters" />}
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

      <AnnouncementComposerModal
        open={composerTarget !== null}
        announcement={composerTarget === "new" || composerTarget === null ? null : composerTarget}
        onClose={() => setComposerTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete announcement"
        message={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteAnnouncement.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
