"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useFeedbackForm } from "../hooks/useFeedbackQueries";
import { useAddFeedbackQuestion, useDeleteFeedbackQuestion, useUpdateFeedbackForm, useUpdateFeedbackQuestion } from "../hooks/useFeedbackMutations";
import { FeedbackQuestionListEditor } from "./FeedbackQuestionListEditor";
import { FEEDBACK_COURSE_TYPE_LABELS, type FeedbackCourseType, type FeedbackFormDetail, type FeedbackQuestionInput } from "../types";

interface EditFeedbackFormDialogProps {
  /** null closes the dialog. Give the parent a `key={formId}` so a different draft always gets a fresh mount. */
  formId: number | null;
  onClose: () => void;
}

const FEEDBACK_CATEGORIES = Object.keys(FEEDBACK_COURSE_TYPE_LABELS) as FeedbackCourseType[];

/** A question in the editor — carries its real id when it already exists on the form, absent for one just added here. */
interface EditableQuestion extends FeedbackQuestionInput {
  id?: number;
}

/** Only reachable for a draft (see the list page's row-click logic) — a published form can already have responses, which the per-question endpoints below refuse to touch. */
export function EditFeedbackFormDialog({ formId, onClose }: EditFeedbackFormDialogProps) {
  const query = useFeedbackForm(formId);

  return (
    <Modal open={formId != null} onClose={onClose} title="Edit draft" className="max-w-2xl">
      {formId == null ? null : query.isLoading || !query.data ? (
        <EmptyState loading />
      ) : (
        <EditFeedbackFormDialogBody form={query.data} onClose={onClose} />
      )}
    </Modal>
  );
}

function EditFeedbackFormDialogBody({ form, onClose }: { form: FeedbackFormDetail; onClose: () => void }) {
  const { show } = useToast();
  const updateForm = useUpdateFeedbackForm();
  const addQuestion = useAddFeedbackQuestion();
  const updateQuestion = useUpdateFeedbackQuestion();
  const deleteQuestion = useDeleteFeedbackQuestion();

  const [title, setTitle] = useState(form.title);
  const [category, setCategory] = useState<FeedbackCourseType | "">(form.category ?? "");
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    form.questions.map((q) => ({ id: q.id, question_text: q.question_text, question_type: q.question_type })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return setError("Title is required.");
    const cleanQuestions = questions.map((q) => ({ ...q, question_text: q.question_text.trim() })).filter((q) => q.question_text);
    if (cleanQuestions.length === 0) return setError("Add at least one question.");

    setSaving(true);
    try {
      if (trimmedTitle !== form.title || (category || null) !== form.category) {
        await updateForm.mutateAsync({ id: form.id, input: { title: trimmedTitle, category: category || undefined } });
      }

      const originalById = new Map(form.questions.map((q) => [q.id, q]));
      const keptIds = new Set(cleanQuestions.filter((q): q is EditableQuestion & { id: number } => q.id != null).map((q) => q.id));

      for (const original of form.questions) {
        if (!keptIds.has(original.id)) {
          await deleteQuestion.mutateAsync({ formId: form.id, questionId: original.id });
        }
      }

      for (let i = 0; i < cleanQuestions.length; i++) {
        const q = cleanQuestions[i];
        const sequence_no = i + 1;
        const original = q.id != null ? originalById.get(q.id) : undefined;
        if (original) {
          if (original.question_text !== q.question_text || original.question_type !== q.question_type || original.sequence_no !== sequence_no) {
            await updateQuestion.mutateAsync({
              formId: form.id,
              questionId: original.id,
              input: { question_text: q.question_text, question_type: q.question_type, sequence_no },
            });
          }
        } else {
          await addQuestion.mutateAsync({ formId: form.id, input: { question_text: q.question_text, question_type: q.question_type, sequence_no } });
        }
      }

      show("Draft updated", "success");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Title *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </div>

      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Target</label>
        <div className="flex items-center rounded-input border border-border-default bg-surface-tint px-[13px] py-[11px] text-sm text-muted">
          {form.classSection ? `Section ${form.classSection}` : form.batchName ? `Batch: ${form.batchName}` : "—"}
        </div>
      </div>

      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Category</label>
        <Select value={category} onChange={(e) => setCategory(e.target.value as FeedbackCourseType | "")}>
          <option value="">No category</option>
          {FEEDBACK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {FEEDBACK_COURSE_TYPE_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>

      <FeedbackQuestionListEditor questions={questions} onChange={setQuestions} />

      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}

      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </>
  );
}
