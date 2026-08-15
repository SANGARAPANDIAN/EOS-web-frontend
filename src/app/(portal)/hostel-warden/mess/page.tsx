"use client";

import { useMemo } from "react";
import { Card, EmptyState, ProgressBar } from "@/components/ui";
import { useMessFeedback } from "@/modules/hostel-warden/api/mess";
import { useResidents } from "@/modules/hostel-warden/api/residents";
import { formatDayAndTime } from "@/lib/utils/date";

export default function MessPage() {
  const feedback = useMessFeedback({ page_size: 100 });
  const residents = useResidents({ page_size: 100 });

  const nameFor = useMemo(() => {
    const map = new Map<number, string>();
    (residents.data?.data ?? []).forEach((r) => map.set(r.id, r.name));
    return map;
  }, [residents.data]);

  const entries = feedback.data?.data ?? [];
  const withComments = entries.filter((e) => e.comment && e.comment.trim().length > 0);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: entries.filter((e) => e.rating === star).length,
  }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Mess</h1>
        <p className="mt-1 text-[13px] text-muted">Resident feedback and ratings on the mess service.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-[13px] font-bold uppercase tracking-[.05em] text-muted">Average rating</div>
          <div className="mt-2 text-[34px] font-extrabold text-ink">
            {feedback.data?.average_rating != null ? feedback.data.average_rating.toFixed(1) : "—"}
            <span className="ml-1 text-[16px] font-bold text-subtle">/ 5</span>
          </div>
        </Card>
        <Card>
          <div className="text-[13px] font-bold uppercase tracking-[.05em] text-muted">Feedback entries</div>
          <div className="mt-2 text-[34px] font-extrabold text-ink">{feedback.data?.total ?? 0}</div>
        </Card>
        <Card>
          <div className="text-[13px] font-bold uppercase tracking-[.05em] text-muted">With comments</div>
          <div className="mt-2 text-[34px] font-extrabold text-ink">{withComments.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        <Card>
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Rating distribution</h2>
          {feedback.isLoading ? (
            <EmptyState message="Loading…" />
          ) : entries.length === 0 ? (
            <EmptyState message="No feedback recorded yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {distribution.map((d) => (
                <div key={d.star}>
                  <div className="mb-1.5 flex justify-between text-[13.5px]">
                    <span className="font-semibold text-body">{d.star} star</span>
                    <span className="font-mono text-ink">{d.count}</span>
                  </div>
                  <ProgressBar percent={Math.round((d.count / maxCount) * 100)} height={7} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Comments to review</h2>
          {withComments.length === 0 ? (
            <EmptyState message="No written feedback yet." />
          ) : (
            <div className="flex flex-col">
              {withComments.slice(0, 8).map((e) => (
                <div key={e.id} className="border-t border-divider py-3 first:border-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-bold text-ink">{nameFor.get(e.student_id) ?? `Student #${e.student_id}`}</span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-[12px] text-subtle">{formatDayAndTime(e.created_at)}</span>
                  </div>
                  <div className="mt-0.5 text-[13.5px] text-body">{e.comment}</div>
                  <div className="mt-0.5 text-[12.5px] text-subtle">{e.rating} / 5</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
