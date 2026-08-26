"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge, SegmentedTabs, EmptyState, Icon } from "@/components/ui";
import { useFeedbackForms, type FeedbackFormSummary } from "@/modules/student/api/feedback";

type Tab = "pending" | "history";

function FormCard({ f }: { f: FeedbackFormSummary }) {
  return (
    <Link href={`/student/feedback/${f.id}`}>
      <Card className="h-full transition-colors hover:bg-nav-hover">
        <div className="flex items-center justify-between">
          <Icon name="reviews" size={20} className="text-primary" />
          <div className="flex items-center gap-1.5">
            {f.form_type === "end_semester" && <Badge tone="neutral">End-semester</Badge>}
            <Badge tone={f.completed ? "accent" : "accentDark"}>{f.completed ? "Submitted" : "Pending"}</Badge>
          </div>
        </div>
        <div className="mt-2 text-[15px] font-bold text-ink">{f.title}</div>
        <div className="mt-0.5 text-[12px] text-muted">{f.question_count} questions</div>
      </Card>
    </Link>
  );
}

export default function FeedbackPage() {
  const forms = useFeedbackForms();
  const [tab, setTab] = useState<Tab>("pending");

  const pending = forms.data?.filter((f) => !f.completed) ?? [];
  const history = forms.data?.filter((f) => f.completed) ?? [];
  const visible = tab === "pending" ? pending : history;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Feedback</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {tab === "pending" ? "Forms awaiting your response" : "Forms you've already submitted"}
          </p>
        </div>
        <SegmentedTabs
          options={[
            { key: "pending", label: `Pending${pending.length > 0 ? ` (${pending.length})` : ""}` },
            { key: "history", label: "History" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {forms.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            message={tab === "pending" ? "No feedback forms pending right now." : "No submitted feedback yet."}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {visible.map((f) => (
            <FormCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}
