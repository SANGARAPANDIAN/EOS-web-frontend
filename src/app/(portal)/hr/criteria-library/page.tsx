"use client";

import { useState } from "react";
import { Button, ConfirmDialog, DataTable, Icon, IconButton, Input, Modal, Select } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useAppraisalCriteria,
  useAppraisalDivisions,
  useCreateAppraisalCriterion,
  useCreateAppraisalDivision,
  useDeleteAppraisalCriterion,
  useUpdateAppraisalCriterion,
  type AppraisalCriterion,
  type AppraisalDivision,
} from "@/modules/hr/api/appraisalCriteria";
import { ApiError } from "@/types/api";

const LIMIT = 50;
const CURRENT_YEAR = new Date().getFullYear();
/** Last five academic years, newest first — same "YYYY-YYYY" free-text convention the criterion form writes. */
const ACADEMIC_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const startYear = CURRENT_YEAR - i;
  return `${startYear}-${startYear + 1}`;
});
const DEFAULT_ACADEMIC_YEAR = ACADEMIC_YEAR_OPTIONS[0];

interface AddDivisionModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Thin wrapper only — `Modal` renders no children while `open` is false, so
 * `AddDivisionForm` unmounts while closed and mounts fresh each time it
 * opens. That gives "reset on open" for free without a reset-on-open effect
 * (flagged by the repo's react-hooks/set-state-in-effect lint rule).
 */
function AddDivisionModal({ open, onClose }: AddDivisionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add division">
      <AddDivisionForm onClose={onClose} />
    </Modal>
  );
}

function AddDivisionForm({ onClose }: { onClose: () => void }) {
  const createDivision = useCreateAppraisalDivision();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Division name is required.");
      return;
    }
    setError(null);
    try {
      await createDivision.mutateAsync(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add division.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-body">Division name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Teaching" autoFocus />
      </div>
      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
      <div className="mt-2 flex justify-end gap-2.5 border-t border-divider pt-5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" className="w-auto px-6" onClick={submit} disabled={createDivision.isPending}>
          {createDivision.isPending ? "Saving…" : "Add division"}
        </Button>
      </div>
    </div>
  );
}

interface CriterionFormModalProps {
  open: boolean;
  criterion: AppraisalCriterion | null;
  divisions: AppraisalDivision[] | undefined;
  onClose: () => void;
}

/** Same mount-while-open-only trick as AddDivisionModal above. */
function CriterionFormModal({ open, criterion, divisions, onClose }: CriterionFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={criterion ? "Edit criterion" : "Add criterion"}>
      <CriterionForm criterion={criterion} divisions={divisions} onClose={onClose} />
    </Modal>
  );
}

interface CriterionFormProps {
  criterion: AppraisalCriterion | null;
  divisions: AppraisalDivision[] | undefined;
  onClose: () => void;
}

function CriterionForm({ criterion, divisions, onClose }: CriterionFormProps) {
  const createCriterion = useCreateAppraisalCriterion();
  const updateCriterion = useUpdateAppraisalCriterion();
  const isEditing = criterion !== null;

  const [divisionId, setDivisionId] = useState(criterion ? String(criterion.division_id) : "");
  const [criteriaName, setCriteriaName] = useState(criterion?.criteria_name ?? "");
  const [maxScore, setMaxScore] = useState(criterion ? String(criterion.max_score) : "");
  const [academicYear, setAcademicYear] = useState(criterion?.academic_year ?? DEFAULT_ACADEMIC_YEAR);
  const [error, setError] = useState<string | null>(null);

  const isPending = createCriterion.isPending || updateCriterion.isPending;

  async function submit() {
    if (!divisionId || !criteriaName.trim() || !maxScore || !academicYear.trim()) {
      setError("All fields are required.");
      return;
    }
    const maxScoreNum = Number(maxScore);
    if (!Number.isFinite(maxScoreNum) || maxScoreNum <= 0) {
      setError("Max score must be a positive number.");
      return;
    }
    setError(null);
    const input = {
      division_id: Number(divisionId),
      criteria_name: criteriaName.trim(),
      max_score: maxScoreNum,
      academic_year: academicYear.trim(),
    };
    try {
      if (criterion) {
        await updateCriterion.mutateAsync({ id: criterion.id, input });
      } else {
        await createCriterion.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-body">Division</label>
        <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
          <option value="">Select division</option>
          {divisions?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-body">Criteria name</label>
        <Input value={criteriaName} onChange={(e) => setCriteriaName(e.target.value)} placeholder="e.g. Punctuality" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-body">Max score</label>
          <Input type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-body">Academic year</label>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2026-2027" />
        </div>
      </div>

      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

      <div className="mt-2 flex justify-end gap-2.5 border-t border-divider pt-5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" className="w-auto px-6" onClick={submit} disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Save changes" : "Add criterion"}
        </Button>
      </div>
    </div>
  );
}

export default function HrCriteriaLibraryPage() {
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [criterionModalState, setCriterionModalState] = useState<{ open: boolean; criterion: AppraisalCriterion | null }>({
    open: false,
    criterion: null,
  });
  const [deletingCriterion, setDeletingCriterion] = useState<AppraisalCriterion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const divisions = useAppraisalDivisions();
  const criteria = useAppraisalCriteria({
    division_id: divisionFilter !== "all" ? Number(divisionFilter) : undefined,
    academic_year: academicYearFilter !== "all" ? academicYearFilter : undefined,
    page,
    limit: LIMIT,
  });
  const deleteCriterion = useDeleteAppraisalCriterion();

  const rows = criteria.data?.data ?? [];
  const meta = criteria.data?.meta;

  function openAddCriterion() {
    setCriterionModalState({ open: true, criterion: null });
  }

  function openEditCriterion(criterion: AppraisalCriterion) {
    setCriterionModalState({ open: true, criterion });
  }

  function confirmDeleteCriterion() {
    if (!deletingCriterion) return;
    deleteCriterion.mutate(deletingCriterion.id, {
      onSuccess: () => {
        setDeletingCriterion(null);
        setDeleteError(null);
      },
      onError: (err) => {
        setDeleteError(err instanceof ApiError ? err.message : "Could not delete this criterion.");
        setDeletingCriterion(null);
      },
    });
  }

  const columns: DataTableColumn<AppraisalCriterion>[] = [
    {
      key: "name",
      header: "Criteria",
      width: "1.6fr",
      render: (row) => <span className="font-bold text-ink">{row.criteria_name}</span>,
    },
    {
      key: "division",
      header: "Division",
      width: "1fr",
      render: (row) => <span className="text-body">{row.appraisal_divisions.name}</span>,
    },
    {
      key: "max_score",
      header: "Max score",
      width: "110px",
      render: (row) => row.max_score,
    },
    {
      key: "year",
      header: "Academic year",
      width: "140px",
      render: (row) => row.academic_year,
    },
    {
      key: "actions",
      header: "",
      width: "100px",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <IconButton icon="edit" size={32} iconSize={16} title="Edit criterion" onClick={() => openEditCriterion(row)} />
          <IconButton
            icon="delete"
            size={32}
            iconSize={16}
            title="Delete criterion"
            onClick={() => {
              setDeleteError(null);
              setDeletingCriterion(row);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Criteria library</h1>
          <p className="mt-1 text-[13px] text-muted">Appraisal divisions and scoring criteria used by every faculty review</p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Button variant="secondary" className="w-auto" onClick={() => setShowDivisionModal(true)}>
            <Icon name="add" size={16} className="mr-1.5 align-middle" />
            Add division
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={openAddCriterion}>
            <Icon name="add" size={16} className="mr-1.5 align-middle" />
            Add criterion
          </Button>
        </div>
      </div>

      {deleteError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {deleteError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={divisionFilter}
          onChange={(e) => {
            setDivisionFilter(e.target.value);
            setPage(1);
          }}
          className="w-[200px]"
        >
          <option value="all">All divisions</option>
          {divisions.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <Select
          value={academicYearFilter}
          onChange={(e) => {
            setAcademicYearFilter(e.target.value);
            setPage(1);
          }}
          className="w-[160px]"
        >
          <option value="all">All years</option>
          {ACADEMIC_YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        loading={criteria.isLoading}
        emptyMessage="No criteria match these filters."
      />

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12.5px] text-muted">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" className="w-auto px-4 py-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              className="w-auto px-4 py-2"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AddDivisionModal open={showDivisionModal} onClose={() => setShowDivisionModal(false)} />

      <CriterionFormModal
        open={criterionModalState.open}
        criterion={criterionModalState.criterion}
        divisions={divisions.data}
        onClose={() => setCriterionModalState({ open: false, criterion: null })}
      />

      <ConfirmDialog
        open={deletingCriterion !== null}
        title="Delete criterion"
        description={deletingCriterion ? `Delete "${deletingCriterion.criteria_name}"? This can't be undone.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteCriterion}
        onCancel={() => setDeletingCriterion(null)}
      />
    </div>
  );
}
