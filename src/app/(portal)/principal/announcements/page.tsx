"use client";

import { useEffect, useState } from "react";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import { PrincipalAnnouncementComposer } from "@/modules/principal/components/PrincipalAnnouncementComposer";
import { principalColors } from "@/modules/principal/theme";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDayAndTime } from "@/lib/utils/date";
import { useInitialQueryParam } from "@/lib/utils/useInitialQueryParam";

function audienceLine(a: { class_labels?: string[]; role_labels?: string[]; target_audience: string }): string {
  if (a.class_labels && a.class_labels.length > 0) return a.class_labels.join(", ");
  if (a.role_labels && a.role_labels.length > 0) return a.role_labels.join(", ");
  return a.target_audience;
}

function posterLine(a: { posted_by?: { role: string; designation: string | null; department: string | null } }): string {
  const p = a.posted_by;
  if (!p) return "Unknown";
  const role = p.designation ?? p.role;
  return p.department ? `${role} · ${p.department}` : role;
}

export default function PrincipalAnnouncementsPage() {
  const announcements = useAnnouncements();
  const [composerOpen, setComposerOpen] = useState(false);
  const initialAction = useInitialQueryParam("action");

  // Header "+" quick action lands here as /principal/announcements?action=new
  // — open the same real composer the page's own "New announcement" button
  // uses, rather than a second create flow.
  useEffect(() => {
    if (initialAction === "new") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComposerOpen(true);
    }
  }, [initialAction]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-[34px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
          >
            Announcements
          </h1>
          <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
            Circulars from the institution and posts you publish to your department
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-white"
          style={{ background: principalColors.primary }}
        >
          <Icon name="campaign" size={18} />
          New announcement
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {announcements.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-6" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="mt-3.5 h-5 w-64" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-3/4" />
            </div>
          ))}

        {announcements.data?.length === 0 && (
          <div className="rounded-2xl border p-6 text-sm" style={{ background: principalColors.bg, borderColor: principalColors.border, color: principalColors.textFaint }}>
            No announcements have been posted to the Principal role yet — publish one, or wait for
            one addressed to you.
          </div>
        )}

        {announcements.data?.map((a) => (
          <div
            key={a.id}
            className="rounded-2xl border p-6 hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]"
            style={{ background: principalColors.bg, borderColor: principalColors.border }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="rounded-md px-2 py-1 text-[11px] font-bold tracking-wide"
                style={{ background: principalColors.surfaceMuted, color: principalColors.textMuted }}
              >
                {a.target_audience.toUpperCase()}
              </span>
              <span className="text-[13px]" style={{ color: principalColors.textSubtle }}>
                {formatDayAndTime(a.created_at)}
              </span>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[13px]" style={{ color: principalColors.textSubtle }}>
                  {posterLine(a)}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
                  style={
                    a.status === "published"
                      ? { background: principalColors.surfaceTint, color: principalColors.primaryDark }
                      : { background: principalColors.surfaceMuted, color: principalColors.textFaint }
                  }
                >
                  {a.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-3 text-lg font-bold" style={{ color: principalColors.heading }}>
              {a.title}
            </div>
            <p className="mt-1.5 text-sm" style={{ color: principalColors.body }}>
              {a.content}
            </p>
            <div className="mt-3 text-[13px]" style={{ color: principalColors.textSubtle }}>
              Audience · {audienceLine(a)}
            </div>
          </div>
        ))}
      </div>

      {composerOpen && <PrincipalAnnouncementComposer onClose={() => setComposerOpen(false)} />}
    </div>
  );
}
