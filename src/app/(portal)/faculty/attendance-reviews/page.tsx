"use client";

import { Card, Badge, Button, EmptyState, SkeletonRows } from "@/components/ui";
import {
  usePendingAttendanceReviews,
  useReviewClassAttendance,
  type PendingAttendanceReview,
} from "@/modules/advisor/api/attendance";
import { formatDisplayDate } from "@/lib/utils/date";

function ReviewCard({ item }: { item: PendingAttendanceReview }) {
  const decide = useReviewClassAttendance();
  const approving =
    decide.isPending &&
    decide.variables?.classId === item.class_id &&
    decide.variables?.decision === "approve";
  const sendingBack =
    decide.isPending &&
    decide.variables?.classId === item.class_id &&
    decide.variables?.decision === "send_back";

  function decideMutation(decision: "approve" | "send_back") {
    decide.mutate({
      classId: item.class_id,
      subject_id: item.subject_id,
      attendance_date: item.attendance_date,
      decision,
    });
  }

  return (
    <Card className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Badge tone="accent">
            {item.department_code} · Section {item.class_section}
          </Badge>
          <span className="text-[13px] text-subtle">submitted {formatDisplayDate(item.submitted_for_review_at)}</span>
        </div>
      </div>

      <h2 className="mt-2 text-[16px] font-extrabold text-ink">
        {item.subject_code} · {item.subject_name}
      </h2>
      <p className="mt-1 text-[13px] text-body">
        {formatDisplayDate(item.attendance_date)} · {item.record_count} student{item.record_count === 1 ? "" : "s"} marked
      </p>

      {decide.isError && (
        <p className="mt-1.5 text-[12.5px] text-danger-fg">
          {decide.error instanceof Error ? decide.error.message : "Something went wrong. Please try again."}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2.5">
        <Button
          variant="secondary"
          className="shrink-0 text-danger-fg border-danger-border"
          onClick={() => decideMutation("send_back")}
          disabled={decide.isPending}
          loading={sendingBack}
        >
          Send back
        </Button>
        <Button variant="primarySmall" className="shrink-0" onClick={() => decideMutation("approve")} disabled={decide.isPending} loading={approving}>
          Approve &amp; publish
        </Button>
      </div>
    </Card>
  );
}

export default function AttendanceReviewsPage() {
  const reviews = usePendingAttendanceReviews();
  const items = reviews.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {reviews.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load attendance reviews — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Attendance Reviews</h1>
        <p className="mt-1 text-[13px] text-muted">
          Attendance submitted by subject teachers for classes you mentor, or your department if you are the HoD — approve to
          publish it to students and parents, or send it back for correction.
        </p>
      </div>

      {reviews.isLoading ? (
        <SkeletonRows count={3} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState message="Nothing waiting on your review right now." />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <ReviewCard key={`${item.class_id}-${item.subject_id}-${item.attendance_date}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
