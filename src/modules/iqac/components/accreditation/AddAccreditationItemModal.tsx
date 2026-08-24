"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useCreateAccreditationItem, type AccreditationCycle } from "@/modules/iqac/api/accreditation";
import { useDepartmentsList } from "@/modules/iqac/api/departments";
import type { FacultyRow } from "@/modules/iqac/api/faculty";
import { FacultyPicker } from "@/modules/iqac/components/facultyDevelopment/FacultyPicker";

const STATUS_OPTIONS: { value: "pending" | "in_progress" | "complete"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
];

const CYCLE_LABELS: Record<AccreditationCycle, string> = {
  naac: "NAAC progress",
  aqar: "AQAR progress",
  ssr: "SSR progress",
};

/**
 * Records a real iqac_accreditation_criteria row. "Item ID" (e.g. "NAAC-C1")
 * isn't a form field — it's derived server-side from the cycle and the
 * criterion number picked here, matching the reference design's own
 * auto-generated code exactly.
 */
export function AddAccreditationItemModal({ cycle, onClose, onCreated }: { cycle: AccreditationCycle; onClose: () => void; onCreated: () => void }) {
  const addEntry = useCreateAccreditationItem(cycle);
  const departments = useDepartmentsList();

  const [criterionNumber, setCriterionNumber] = useState("1");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState<FacultyRow | null>(null);
  const [scope, setScope] = useState("all");
  const [dueDate, setDueDate] = useState("");
  const [readiness, setReadiness] = useState("0");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("pending");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!criterionNumber.trim() || !name.trim()) {
      setError("Criterion number and item name are both required.");
      return;
    }
    setError(null);
    try {
      await addEntry.mutateAsync({
        criterion_number: Number(criterionNumber),
        name: name.trim(),
        owner_faculty_id: owner?.id,
        department_id: scope === "all" ? undefined : Number(scope),
        due_date: dueDate || undefined,
        readiness_percent: readiness.trim() ? Number(readiness) : undefined,
        status,
        note: note.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this item.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Add accreditation item" subtitle={`${CYCLE_LABELS[cycle]} · IQAC cell`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Criterion</div>
            <input
              value={criterionNumber}
              onChange={(e) => setCriterionNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 1"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-subtle">Item ID becomes {cycle.toUpperCase()}-C{criterionNumber.trim() || "…"}</p>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Item</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Curricular aspects"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <FacultyPicker selected={owner} onSelect={setOwner} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Scope</div>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
            >
              <option value="all">All</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Due date</div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Readiness %</div>
            <input
              value={readiness}
              onChange={(e) => setReadiness(e.target.value.replace(/\D/g, ""))}
              placeholder="0–100"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Note (optional)</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Minutes attached"
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
        </div>

        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-[42px] rounded-[10px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink hover:bg-surface-tint">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={addEntry.isPending}
            className="h-[42px] rounded-[10px] border border-primary-border bg-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            {addEntry.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
