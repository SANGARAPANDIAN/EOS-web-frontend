"use client";

import { useState } from "react";
import { Button, EmptyState } from "@/components/ui";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import { useDeleteAnnouncement } from "@/modules/higher-education/api/announcements";
import { NewAnnouncementModal, EditAnnouncementModal, AnnouncementCard } from "@/modules/higher-education/components/AnnouncementParts";
import { useAuth } from "@/lib/auth/AuthContext";

export default function HigherEducationAnnouncementsPage() {
  const { session } = useAuth();
  const announcements = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();
  const [showNew, setShowNew] = useState(false);
  // Only ever set for an announcement this user posted — the card hides Edit
  // otherwise, and the server enforces the same rule.
  const [editing, setEditing] = useState<{ id: number; title: string; content: string; category?: string | null } | null>(null);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Announcements</h1>
          <p className="mt-1 text-[13px] text-muted">Circulars from the institution and posts you publish.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowNew(true)}>
          New announcement
        </Button>
      </div>

      {showNew && <NewAnnouncementModal onClose={() => setShowNew(false)} />}

      <div className="flex flex-col gap-3">
        {announcements.isLoading ? (
          <EmptyState message="Loading…" />
        ) : !announcements.data || announcements.data.length === 0 ? (
          <EmptyState message="No announcements yet." />
        ) : (
          announcements.data.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              canDelete={a.posted_by_user_id === session?.user.id}
              onDelete={(id) => deleteAnnouncement.mutate(id)}
              onEdit={() => setEditing({ id: a.id, title: a.title, content: a.content, category: a.category })}
            />
          ))
        )}
      </div>
      {editing && <EditAnnouncementModal announcement={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
