"use client";

import { useMemo, useState } from "react";
import { Card, Badge, EmptyState, Icon } from "@/components/ui";
import { useAnnouncements } from "@/modules/shared/api/announcements";
import { formatDayAndTime } from "@/lib/utils/date";
import { ROLE_LABEL } from "@/lib/config";

const ALL = "all";

export default function AnnouncementsPage() {
  const announcements = useAnnouncements();
  const [filter, setFilter] = useState<string>(ALL);

  const audiences = useMemo(() => {
    const set = new Set<string>();
    for (const a of announcements.data ?? []) set.add(a.target_audience);
    return Array.from(set);
  }, [announcements.data]);

  const filtered = useMemo(() => {
    const data = announcements.data ?? [];
    return filter === ALL ? data : data.filter((a) => a.target_audience === filter);
  }, [announcements.data, filter]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Announcements</h1>
        <p className="mt-1 text-[13px] text-muted">Everything posted to you by the principal, HoD, faculty and offices.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[ALL, ...audiences].map((key) => {
          const active = key === filter;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${
                active ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-body hover:bg-nav-hover"
              }`}
            >
              {key === ALL ? "All" : key.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {announcements.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState message="No announcements to show." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{a.target_audience.replace(/_/g, " ")}</Badge>
                {a.posted_by && (
                  <span className="text-[12.5px] font-semibold text-body">
                    {ROLE_LABEL[a.posted_by.role] ?? a.posted_by.role} · {a.posted_by.name}
                  </span>
                )}
                <span className="text-[11px] text-subtle">· {formatDayAndTime(a.created_at)}</span>
              </div>
              <div className="mt-2 text-[16px] font-bold text-ink">{a.title}</div>
              <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-body">{a.content}</p>
              {a.file_url && (
                <a
                  href={a.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-[9px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12.5px] font-bold text-primary"
                >
                  <Icon name="description" size={16} />
                  {a.file_name ?? "Attachment"}
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
