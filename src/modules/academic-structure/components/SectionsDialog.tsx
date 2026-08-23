"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { useCreateSections } from "../hooks/useAcademicStructureMutations";
import { SECTION_LETTERS, type Batch, type Course, type SchoolClass } from "../types";
import { cn } from "@/lib/utils/cn";

interface SectionsDialogProps {
  open: boolean;
  onClose: () => void;
  course: Course;
  batches: Batch[];
  classes: SchoolClass[];
}

/** Parses a free-text "E, F G" into ["E","F","G"] — trims, uppercases, dedupes, drops empties. */
function parseCustomSections(raw: string): string[] {
  const tokens = raw
    .split(/[,\s]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(tokens));
}

export function SectionsDialog({ open, onClose, course, batches, classes }: SectionsDialogProps) {
  const [batchId, setBatchId] = useState<string>(batches[0] ? String(batches[0].id) : "");
  const [semester, setSemester] = useState<string>("1");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createSections = useCreateSections();
  const { show } = useToast();

  const takenSections = useMemo(() => {
    if (!batchId) return new Set<string>();
    return new Set(
      classes.filter((c) => c.course_id === course.id && c.batch_id === Number(batchId)).map((c) => c.section),
    );
  }, [classes, course.id, batchId]);

  const semesterOptions = Array.from({ length: course.duration_years * 2 }, (_, i) => i + 1);

  const customSections = parseCustomSections(customText);
  const invalidCustom = customSections.filter((s) => s.length > 10 || !/^[A-Z0-9]+$/.test(s));
  const validCustom = customSections.filter((s) => s.length <= 10 && /^[A-Z0-9]+$/.test(s) && !takenSections.has(s));
  const allSelected = new Set([...chosen, ...validCustom]);

  function toggleLetter(letter: string) {
    if (takenSections.has(letter)) return;
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  }

  function handleBatchChange(value: string) {
    setBatchId(value);
    const nextTaken = new Set(
      classes.filter((c) => c.course_id === course.id && c.batch_id === Number(value)).map((c) => c.section),
    );
    setChosen((prev) => new Set([...prev].filter((l) => !nextTaken.has(l))));
  }

  function handleSave() {
    setError(null);
    if (!batchId) return setError("Pick a batch.");
    if (allSelected.size === 0) return setError("Pick or type at least one section to create.");

    createSections
      .mutateAsync({
        batch_id: Number(batchId),
        department_id: course.department_id,
        course_id: course.id,
        sections: Array.from(allSelected),
        current_semester: semester ? Number(semester) : undefined,
      })
      .then(({ created, skipped }) => {
        if (created.length === 0) {
          show("Nothing created", "error");
          return;
        }
        const batchName = batches.find((b) => b.id === Number(batchId))?.name ?? "";
        show(`${created.length} class${created.length === 1 ? "" : "es"} created`, "success");
        if (skipped.length > 0) {
          show(`Section ${skipped.join(", ")} already existed for ${batchName} — skipped.`, "info");
        }
        onClose();
      });
  }

  const allLettersTaken = SECTION_LETTERS.every((l) => takenSections.has(l));

  return (
    <Modal open={open} onClose={onClose} title="Add sections" subtitle={course.name} className="max-w-sm">
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Batch *</label>
        <Select value={batchId} onChange={(e) => handleBatchChange(e.target.value)}>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Starting semester</label>
        <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">Not set yet</option>
          {semesterOptions.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </Select>
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Sections *</label>
        <div className="flex gap-2">
          {SECTION_LETTERS.map((letter) => {
            const taken = takenSections.has(letter);
            const active = chosen.has(letter);
            return (
              <button
                key={letter}
                type="button"
                disabled={taken}
                onClick={() => toggleLetter(letter)}
                title={taken ? "exists" : undefined}
                className={cn(
                  "h-11 w-11 rounded-lg border text-sm font-bold transition-colors",
                  taken
                    ? "cursor-not-allowed border-border-default bg-surface-muted text-subtle"
                    : active
                      ? "cursor-pointer border-primary bg-primary text-white"
                      : "cursor-pointer border-border-default bg-surface text-body hover:border-border-accent",
                )}
              >
                {letter}
              </button>
            );
          })}
        </div>
        {allLettersTaken && (
          <p className="mt-1 text-[11px] text-subtle">A–D already exist for this batch — add more below.</p>
        )}
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">More sections (optional)</label>
        <Input value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="e.g. E, F" />
        <p className="mt-1 text-[11px] text-subtle">
          Not limited to A–D — type any section labels, separated by commas or spaces.
          {invalidCustom.length > 0 && (
            <span className="text-danger-fg"> &quot;{invalidCustom.join(", ")}&quot; — letters/numbers only, 10 chars max.</span>
          )}
        </p>
      </div>
      <p className="text-[11px] text-subtle">
        {allSelected.size > 0
          ? `Creating section ${Array.from(allSelected).join(", ")}.`
          : "Pick or type the sections to create."}
      </p>
      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}
      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={createSections.isPending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={createSections.isPending}>
          {createSections.isPending ? "Creating…" : "Create classes"}
        </Button>
      </div>
    </Modal>
  );
}
