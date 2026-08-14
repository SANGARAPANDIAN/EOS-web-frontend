"use client";

import { useMemo, useState } from "react";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import {
  useSubmitFeedbackResponses,
  type EndSemesterFeedbackFormDetail,
  type FeedbackResponseItem,
} from "@/modules/student/api/feedback";
import { ApiError } from "@/types/api";

const FIRST_COL_WIDTH = 240;
const CELL_WIDTH = 210;

function cellKey(mappingId: number, questionId: number) {
  return `${mappingId}:${questionId}`;
}

export function FeedbackMatrix({ formId, form }: { formId: number; form: EndSemesterFeedbackFormDetail }) {
  const submit = useSubmitFeedbackResponses(formId);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const completed = form.completed;
  const gridTemplateColumns = `${FIRST_COL_WIDTH}px repeat(${form.questions.length}, ${CELL_WIDTH}px)`;

  const savedByCell = useMemo(() => {
    const map = new Map<string, { rating_value: number | null; response_text: string | null }>();
    for (const r of form.responses) {
      map.set(cellKey(r.mapping_id, r.question_id), r);
    }
    return map;
  }, [form.responses]);

  const totalCells = form.rows.length * form.questions.length;
  const answeredCellCount = useMemo(() => {
    let count = 0;
    for (const row of form.rows) {
      for (const q of form.questions) {
        const key = cellKey(row.mapping_id, q.id);
        if (q.question_type === "rating" ? ratings[key] !== undefined : (texts[key] ?? "").trim() !== "") count++;
      }
    }
    return count;
  }, [form.rows, form.questions, ratings, texts]);
  const allAnswered = totalCells > 0 && answeredCellCount === totalCells;

  async function handleSubmit() {
    setError(null);
    const responses: FeedbackResponseItem[] = [];
    for (const row of form.rows) {
      for (const q of form.questions) {
        const key = cellKey(row.mapping_id, q.id);
        responses.push(
          q.question_type === "rating"
            ? { question_id: q.id, mapping_id: row.mapping_id, rating_value: ratings[key] }
            : { question_id: q.id, mapping_id: row.mapping_id, response_text: texts[key] },
        );
      }
    }
    try {
      await submit.mutateAsync(responses);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  if (form.rows.length === 0) {
    return (
      <Card>
        <EmptyState message="No faculty are currently mapped to your class for this feedback form." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-card border border-border-default bg-surface">
        <div style={{ minWidth: FIRST_COL_WIDTH + form.questions.length * CELL_WIDTH }}>
          <div className="grid border-b border-divider" style={{ gridTemplateColumns }}>
            <div className="sticky left-0 z-10 border-r border-divider bg-surface-muted px-4 py-3 text-[11px] font-bold uppercase tracking-[.04em] text-subtle">
              Faculty
            </div>
            {form.questions.map((q, i) => (
              <div key={q.id} className="bg-surface-muted px-3 py-3 text-[11.5px] font-bold text-ink">
                {i + 1}. {q.question_text}
              </div>
            ))}
          </div>

          {form.rows.map((row) => (
            <div key={row.mapping_id} className="grid border-b border-divider last:border-0" style={{ gridTemplateColumns }}>
              <div className="sticky left-0 z-10 border-r border-divider bg-surface px-4 py-3">
                <div className="text-[13px] font-bold text-ink">{row.faculty_name}</div>
                <div className="text-[11.5px] text-muted">{row.subject_name}</div>
              </div>
              {form.questions.map((q) => {
                const key = cellKey(row.mapping_id, q.id);
                const saved = savedByCell.get(key);

                if (q.question_type === "rating") {
                  return (
                    <div key={q.id} className="flex items-center px-3 py-2.5">
                      <Select
                        disabled={completed}
                        value={completed ? saved?.rating_value ?? "" : ratings[key] ?? ""}
                        onChange={(e) => setRatings((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        {(form.rating_scale?.options ?? []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  );
                }

                return (
                  <div key={q.id} className="flex items-center px-3 py-2.5">
                    <Input
                      disabled={completed}
                      value={completed ? saved?.response_text ?? "" : texts[key] ?? ""}
                      onChange={(e) => setTexts((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Your answer"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!completed && (
        <div className="max-w-[560px]">
          {error && (
            <div className="mb-3 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <Button onClick={handleSubmit} disabled={!allAnswered || submit.isPending}>
            {submit.isPending ? "Submitting…" : `Answer all questions (${answeredCellCount}/${totalCells})`}
          </Button>
        </div>
      )}
    </div>
  );
}
