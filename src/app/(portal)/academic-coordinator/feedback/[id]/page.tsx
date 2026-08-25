"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/types/api";
import { useFeedbackForm, useFeedbackResults } from "@/modules/academic-coordinator/hooks/useFeedbackQueries";
import {
  useAddFeedbackQuestion,
  useDeleteFeedbackForm,
  useDeleteFeedbackQuestion,
} from "@/modules/academic-coordinator/hooks/useFeedbackMutations";
import type { FeedbackMatrixResults, FeedbackQuestionResult, FeedbackQuestionType } from "@/modules/academic-coordinator/types";

function RatingBar({ result }: { result: FeedbackQuestionResult }) {
  const dist = result.rating_distribution ?? {};
  const max = Math.max(1, ...Object.values(dist));
  return (
    <div className="mt-2 flex flex-col gap-1">
      {[5, 4, 3, 2, 1].map((v) => {
        const count = dist[v] ?? 0;
        return (
          <div key={v} className="flex items-center gap-2">
            <span className="w-3 text-[11px] text-subtle">{v}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-surface-tint">
              <div className="h-full rounded bg-primary" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="w-5 text-right text-[11px] text-subtle">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function QuestionResultBlock({ q }: { q: FeedbackQuestionResult }) {
  return (
    <div className="border-t border-divider py-3.5 first:border-t-0">
      <div className="flex justify-between gap-2.5">
        <div className="text-[13.5px] font-semibold text-ink">{q.question_text}</div>
        <span className="shrink-0 text-[11.5px] text-subtle">{q.response_count} responses</span>
      </div>
      {q.question_type === "rating" ? (
        <>
          <div className="mt-1.5 text-[22px] font-bold text-ink">
            {q.average_rating != null ? q.average_rating.toFixed(2) : "—"}
            <span className="text-xs font-medium text-subtle"> / 5 avg</span>
          </div>
          <RatingBar result={q} />
        </>
      ) : (
        <div className="mt-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
          {(q.responses ?? []).filter(Boolean).length === 0 ? (
            <p className="text-xs text-subtle">No text responses yet.</p>
          ) : (
            (q.responses ?? []).filter(Boolean).map((r, i) => (
              <div key={i} className="rounded-[8px] bg-surface-tint px-2.5 py-2 text-[12.5px] text-body">
                {r}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function FeedbackFormDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const formId = Number(params.id);

  const form = useFeedbackForm(formId);
  const results = useFeedbackResults(formId);
  const addQuestion = useAddFeedbackQuestion();
  const deleteQuestion = useDeleteFeedbackQuestion();
  const deleteForm = useDeleteFeedbackForm();

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<FeedbackQuestionType>("rating");
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);
  const [confirmingDeleteForm, setConfirmingDeleteForm] = useState(false);

  function handleAddQuestion() {
    const text = newQuestionText.trim();
    if (!text) return;
    addQuestion
      .mutateAsync({ formId, input: { question_text: text, question_type: newQuestionType } })
      .then(() => {
        setNewQuestionText("");
        show("Question added", "success");
      })
      .catch((err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"));
  }

  function handleDeleteQuestion(questionId: number) {
    if (deletingQuestionId != null) return;
    setDeletingQuestionId(questionId);
    deleteQuestion
      .mutateAsync({ formId, questionId })
      .then(() => show("Question removed", "success"))
      .catch((err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"))
      .finally(() => setDeletingQuestionId(null));
  }

  function handleDeleteForm() {
    if (deleteForm.isPending) return;
    deleteForm
      .mutateAsync(formId)
      .then(() => {
        show("Feedback form deleted", "success");
        router.push("/academic-coordinator/feedback");
      })
      .catch((err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong.", "error");
        setConfirmingDeleteForm(false);
      });
  }

  if (form.isLoading || !form.data) {
    return <p className="text-[13px] text-subtle">Loading…</p>;
  }

  const responseRate =
    results.data && results.data.target_student_count > 0
      ? Math.round((results.data.respondent_count / results.data.target_student_count) * 100)
      : null;

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <button
            type="button"
            onClick={() => router.push("/academic-coordinator/feedback")}
            className="mb-1.5 border-0 bg-transparent p-0 text-xs text-primary"
          >
            ← All feedback forms
          </button>
          <h1 className="m-0 text-2xl font-bold tracking-[-.015em] text-ink">{form.data.title}</h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {form.data.form_type === "end_semester" ? "End-of-semester faculty rating" : "General feedback"}
            {form.data.classSection ? ` · Section ${form.data.classSection}` : ""}
            {form.data.batchName ? ` · Batch ${form.data.batchName}` : ""}
          </p>
        </div>
        <Button variant="secondary" className="w-auto border-danger-border text-danger-fg" onClick={() => setConfirmingDeleteForm(true)}>
          Delete form
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <Card>
          <div className="text-xs text-subtle">Target students</div>
          <div className="mt-1 text-2xl font-bold text-ink">{results.data?.target_student_count ?? "—"}</div>
        </Card>
        <Card>
          <div className="text-xs text-subtle">Responses received</div>
          <div className="mt-1 text-2xl font-bold text-ink">{results.data?.respondent_count ?? "—"}</div>
        </Card>
        <Card>
          <div className="text-xs text-subtle">Response rate</div>
          <div className="mt-1 text-2xl font-bold text-ink">{responseRate != null ? `${responseRate}%` : "—"}</div>
        </Card>
      </div>

      <Card>
        <div className="mb-1 text-[15px] font-bold text-ink">Questions</div>
        <p className="m-0 text-[11.5px] text-subtle">Questions can only be edited or removed before the form receives any responses.</p>
        <div className="mt-2.5 flex flex-col">
          {form.data.questions.map((q) => (
            <div key={q.id} className="flex items-center gap-2.5 border-t border-divider py-2.5 first:border-t-0">
              <span className="w-4.5 text-xs text-subtle">{q.sequence_no}.</span>
              <span className="flex-1 text-[13px] text-ink">{q.question_text}</span>
              <Badge tone={q.question_type === "rating" ? "accent" : "neutral"}>{q.question_type === "rating" ? "Rating" : "Text"}</Badge>
              <button
                type="button"
                disabled={deletingQuestionId === q.id}
                onClick={() => handleDeleteQuestion(q.id)}
                title="Remove question"
                className="flex size-6.5 shrink-0 items-center justify-center rounded-[6px] border border-danger-border text-danger-fg disabled:cursor-not-allowed"
              >
                {deletingQuestionId === q.id ? (
                  <span className="inline-block size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Icon name="close" size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3.5 flex gap-2 border-t border-divider pt-3.5">
          <Input
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="Add another question…"
            maxLength={1000}
            className="flex-1"
          />
          <Select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value as FeedbackQuestionType)} className="w-25">
            <option value="rating">Rating</option>
            <option value="text">Text</option>
          </Select>
          <Button variant="primarySmall" className="w-auto" onClick={handleAddQuestion} disabled={addQuestion.isPending}>
            {addQuestion.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-1 text-[15px] font-bold text-ink">Results</div>
        <p className="m-0 text-[11.5px] text-subtle">All responses are anonymous — no student identity is ever shown.</p>

        {results.isLoading && <p className="mt-3 text-[12.5px] text-subtle">Loading results…</p>}

        {results.data && results.data.form_type === "general" && (
          <div>{results.data.questions.map((q) => <QuestionResultBlock key={q.id} q={q} />)}</div>
        )}

        {results.data && results.data.form_type === "end_semester" && <MatrixResults results={results.data} />}
      </Card>

      <ConfirmDialog
        open={confirmingDeleteForm}
        title="Delete feedback form?"
        description="This permanently removes the form and its questions. Forms that already have student responses cannot be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteForm}
        onCancel={() => setConfirmingDeleteForm(false)}
      />
    </div>
  );
}

function MatrixResults({ results }: { results: FeedbackMatrixResults }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (results.rows.length === 0) {
    return <p className="mt-3 text-[12.5px] text-subtle">No faculty roster found for this class yet.</p>;
  }

  return (
    <div className="mt-2.5 flex flex-col">
      {results.rows.map((row) => {
        const ratingQuestions = row.questions.filter((q) => q.question_type === "rating");
        const overallAvg =
          ratingQuestions.length > 0
            ? ratingQuestions.reduce((sum, q) => sum + (q.average_rating ?? 0), 0) / ratingQuestions.filter((q) => q.average_rating != null).length || 0
            : null;
        const expanded = expandedRow === row.mapping_id;
        return (
          <div key={row.mapping_id} className="border-t border-divider first:border-t-0">
            <div onClick={() => setExpandedRow(expanded ? null : row.mapping_id)} className="flex cursor-pointer items-center gap-3 py-3">
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold text-ink">{row.faculty_name}</div>
                <div className="text-[11.5px] text-subtle">{row.subject_name}</div>
              </div>
              <div className="text-lg font-bold text-ink">{overallAvg != null && overallAvg > 0 ? overallAvg.toFixed(2) : "—"}</div>
              <Icon name={expanded ? "expand_less" : "expand_more"} size={18} className="text-subtle" />
            </div>
            {expanded && <div className="pb-2.5">{row.questions.map((q) => <QuestionResultBlock key={q.id} q={q} />)}</div>}
          </div>
        );
      })}
    </div>
  );
}
