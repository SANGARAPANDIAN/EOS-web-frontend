"use client";

import Link from "next/link";
import { Card, Badge, EmptyState, Icon } from "@/components/ui";
import { useFeedbackForms } from "@/modules/student/api/feedback";

export default function FeedbackPage() {
  const forms = useFeedbackForms();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Feedback</h1>

      {forms.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !forms.data || forms.data.length === 0 ? (
        <Card>
          <EmptyState message="No feedback forms available right now." />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {forms.data.map((f) => (
            <Link key={f.id} href={`/student/feedback/${f.id}`}>
              <Card className="h-full transition-colors hover:bg-nav-hover">
                <div className="flex items-center justify-between">
                  <Icon name="reviews" size={20} className="text-primary" />
                  <Badge tone={f.completed ? "accent" : "accentDark"}>{f.completed ? "Submitted" : "Pending"}</Badge>
                </div>
                <div className="mt-2 text-[15px] font-bold text-ink">{f.title}</div>
                <div className="mt-0.5 text-[12px] text-muted">{f.question_count} questions</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
