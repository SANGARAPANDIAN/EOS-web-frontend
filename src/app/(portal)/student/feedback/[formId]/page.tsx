"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Badge, Button, Textarea, EmptyState, Icon } from "@/components/ui";
import { useFeedbackFormDetail, useSubmitFeedbackResponses } from "@/modules/student/api/feedback";
import { ApiError } from "@/types/api";
import { FeedbackMatrix } from "./FeedbackMatrix";

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Very good" },
  { value: 3, label: "Good" },
  { value: 2, label: "Satisfactory" },
  { value: 1, label: "Needs improvement" },
];

export default function FeedbackFormPage() {
  const params = useParams<{ formId: string }>();
  const formId = Number(params.formId);
  const form = useFeedbackFormDetail(formId);
  const submit = useSubmitFeedbackResponses(formId);

  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const generalForm = form.data && form.data.form_type === "general" ? form.data : undefined;
  const questions = useMemo(() => generalForm?.questions ?? [], [generalForm]);
  const answeredCount = useMemo(() => {
    return questions.filter((q) => (q.question_type === "rating" ? ratings[q.id] !== undefined : (texts[q.id] ?? "").trim() !== "")).length;
  }, [questions, ratings, texts]);
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  async function handleSubmit() {
    setError(null);
    try {
      await submit.mutateAsync(
        questions.map((q) =>
          q.question_type === "rating" ? { question_id: q.id, rating_value: ratings[q.id] } : { question_id: q.id, response_text: texts[q.id] },
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  if (form.isLoading) {
    return (
      <Card>
        <EmptyState message="Loading…" />
      </Card>
    );
  }

  const completed = form.data?.completed ?? false;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <Link href="/student/feedback" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary">
          <Icon name="arrow_back" size={16} />
          All forms
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-extrabold tracking-[-.02em] text-ink">{form.data?.title}</h1>
          {completed && <Badge tone="accentDark">Submitted</Badge>}
        </div>
      </div>

      {form.data?.form_type === "end_semester" ? (
        <FeedbackMatrix formId={formId} form={form.data} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <Card key={q.id}>
                <div className="text-[13.5px] font-bold text-ink">
                  {i + 1}. {q.question_text}
                </div>
                {q.question_type === "rating" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {RATING_OPTIONS.map((opt) => {
                      const selected = completed ? q.rating_value === opt.value : ratings[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={completed}
                          onClick={() => setRatings((prev) => ({ ...prev, [q.id]: opt.value }))}
                          className={`rounded-[9px] border px-3 py-2 text-[12.5px] font-bold transition-colors ${
                            selected ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-body hover:bg-nav-hover"
                          } disabled:cursor-default`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Textarea
                    className="mt-3"
                    rows={3}
                    disabled={completed}
                    value={completed ? q.response_text ?? "" : texts[q.id] ?? ""}
                    onChange={(e) => setTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Your answer"
                  />
                )}
              </Card>
            ))}
          </div>

          {!completed && questions.length > 0 && (
            <div className="max-w-[560px]">
              {error && (
                <div className="mb-3 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                  {error}
                </div>
              )}
              <Button onClick={handleSubmit} disabled={!allAnswered || submit.isPending}>
                {submit.isPending ? "Submitting…" : `Answer all questions (${answeredCount}/${questions.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
