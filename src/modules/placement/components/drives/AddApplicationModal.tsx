"use client";

import { useMemo, useState } from "react";
import { Modal, Button, Typeahead, useToast } from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import { useEligibleStudents, type EligibleStudent } from "@/modules/placement/api/students";
import { useAddApplication } from "@/modules/placement/api/applications";

interface AddApplicationModalProps {
  open: boolean;
  driveId: number;
  alreadyAppliedIds: Set<number>;
  onClose: () => void;
}

/** Typeahead over the full eligible-student roster (GET /student-profiles), filtered to exclude students already on this drive. */
export function AddApplicationModal({ open, driveId, alreadyAppliedIds, onClose }: AddApplicationModalProps) {
  const { show } = useToast();
  const { data: eligibleStudents, isLoading } = useEligibleStudents();
  const addApplication = useAddApplication(driveId);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<EligibleStudent | null>(null);

  const results = useMemo(() => {
    const pool = (eligibleStudents ?? []).filter((s) => !alreadyAppliedIds.has(s.id));
    const q = query.trim().toLowerCase();
    if (!q) return pool.slice(0, 20);
    return pool
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.studentIdNo.toLowerCase().includes(q) ||
          s.rollNo?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [eligibleStudents, alreadyAppliedIds, query]);

  function handleClose() {
    setQuery("");
    setSelected(null);
    onClose();
  }

  function handleAdd() {
    if (!selected) {
      show("Pick a student first.", "error");
      return;
    }
    addApplication.mutate(
      { studentId: selected.id },
      {
        onSuccess: () => {
          show("Student added to drive.", "success");
          handleClose();
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add student" subtitle="Search the eligible-student roster by name, roll number or student ID.">
      <div className="flex flex-col gap-4">
        {selected ? (
          <div className="flex items-center justify-between rounded-admin-lg border border-admin-border bg-admin-tint px-3.5 py-2.5">
            <div>
              <p className="text-sm font-semibold text-admin-ink">{selected.name ?? selected.studentIdNo}</p>
              <p className="text-xs text-admin-muted">
                {selected.studentIdNo}
                {selected.classLabel ? ` · ${selected.classLabel}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong"
              aria-label="Clear selection"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : (
          <Typeahead
            value={query}
            onChange={setQuery}
            results={results}
            isLoading={isLoading}
            getKey={(s) => s.id}
            renderResult={(s) => (
              <>
                <span className="text-sm font-semibold text-admin-ink">{s.name ?? s.studentIdNo}</span>
                <span className="text-xs text-admin-muted">
                  {s.studentIdNo}
                  {s.classLabel ? ` · ${s.classLabel}` : ""}
                </span>
              </>
            )}
            onSelect={setSelected}
            placeholder="Search name, roll no or student ID"
            minChars={0}
          />
        )}

        <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={addApplication.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleAdd} disabled={!selected || addApplication.isPending}>
            {addApplication.isPending ? "Adding…" : "Add to drive"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
