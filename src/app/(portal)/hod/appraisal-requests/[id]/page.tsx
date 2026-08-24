"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, Badge, Button, EmptyState, SkeletonBlock } from "@/components/ui";
import { useHodAppraisalDetail } from "@/modules/hod/api/appraisalRequests";
import { formatDisplayDate } from "@/lib/utils/date";

export default function HodAppraisalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const detail = useHodAppraisalDetail(id);

  if (detail.isLoading) {
    return <SkeletonBlock className="min-h-[300px]" />;
  }
  if (detail.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load this appraisal request — please try again.
      </div>
    );
  }
  if (!detail.data) {
    return (
      <Card>
        <EmptyState message="Appraisal request not found." />
      </Card>
    );
  }

  const d = detail.data;
  const divisions = [...new Set(d.entries.map((e) => e.division))];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <Button variant="secondary" className="w-fit" onClick={() => router.push("/hod/appraisal-requests")}>
        ← All appraisal requests
      </Button>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold text-ink">{d.faculty_name}</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              {d.designation} · cycle {d.cycle_academic_year} · submitted {formatDisplayDate(d.submitted_at)}
            </p>
          </div>
          {d.status === "pending" && <Badge tone="accentDark">Pending review</Badge>}
          {d.status === "sent_to_principal" && <Badge tone="accent">Sent to Principal</Badge>}
          {d.status === "sent_back" && <Badge tone="danger">Sent back</Badge>}
        </div>
        {d.status === "sent_back" && d.hod_remarks && (
          <div className="mt-4 rounded-[10px] border border-danger-border bg-danger-bg px-4 py-3">
            <div className="text-[11px] font-extrabold tracking-[.06em] text-danger-fg uppercase">Your remarks</div>
            <p className="mt-1 text-[13.5px] text-body">{d.hod_remarks}</p>
          </div>
        )}
      </Card>

      {divisions.map((division) => (
        <Card key={division} className="hod-hover-card">
          <h3 className="text-[16px] font-extrabold text-ink">{division}</h3>
          <div className="mt-3 flex flex-col gap-3">
            {d.entries
              .filter((e) => e.division === division)
              .map((e) => (
                <div key={e.id} className="border-t border-divider pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[13.5px] font-bold text-ink">{e.criteria_name}</span>
                    <span className="shrink-0 text-[13.5px] font-extrabold text-primary">
                      {e.score != null ? `${e.score} / ${e.max_score}` : `— / ${e.max_score}`}
                    </span>
                  </div>
                  {e.description && <p className="mt-1 text-[13px] text-body">{e.description}</p>}
                </div>
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
