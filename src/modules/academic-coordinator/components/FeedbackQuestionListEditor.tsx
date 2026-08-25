"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import type { FeedbackQuestionInput, FeedbackQuestionType } from "../types";

interface FeedbackQuestionListEditorProps {
  questions: FeedbackQuestionInput[];
  onChange: (questions: FeedbackQuestionInput[]) => void;
  /** Rendered next to "+ Add question" — used by the create dialog for its "Load standard questions" shortcut. */
  headerExtra?: ReactNode;
}

/** Shared by the create dialog and the edit-draft dialog so the two never drift apart. */
export function FeedbackQuestionListEditor({ questions, onChange, headerExtra }: FeedbackQuestionListEditorProps) {
  function updateQuestion(index: number, patch: Partial<FeedbackQuestionInput>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  return (
    <div className="mt-3.5 border-t border-divider pt-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="m-0 text-[11px] font-bold tracking-[.04em] text-subtle">QUESTIONS</p>
        <div className="flex items-center gap-3">
          {headerExtra}
          <button
            type="button"
            onClick={() => onChange([...questions, { question_text: "", question_type: "rating" }])}
            className="text-xs font-semibold text-primary"
          >
            + Add question
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4.5 shrink-0 text-[11.5px] text-subtle">{i + 1}.</span>
            <Input
              value={q.question_text}
              onChange={(e) => updateQuestion(i, { question_text: e.target.value })}
              maxLength={1000}
              placeholder="Question text"
              className="flex-1"
            />
            <Select
              value={q.question_type}
              onChange={(e) => updateQuestion(i, { question_type: e.target.value as FeedbackQuestionType })}
              className="w-25 shrink-0"
            >
              <option value="rating">Rating</option>
              <option value="text">Text</option>
            </Select>
            <button
              type="button"
              onClick={() => removeQuestion(i)}
              disabled={questions.length === 1}
              title={questions.length === 1 ? "At least one question is required" : "Remove question"}
              className="flex size-7 shrink-0 items-center justify-center rounded-input border border-danger-border text-danger-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
