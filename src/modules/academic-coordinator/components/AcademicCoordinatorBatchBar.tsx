"use client";

import { Select } from "@/components/ui/Select";
import { useAcademicYear } from "../context/AcademicYearContext";

/**
 * The batch/cohort selector used to live inside the module's own bespoke
 * topbar (AcademicCoordinatorTopbar, now removed in favour of the shared
 * Topbar). The shared Topbar has no equivalent slot for a module-specific
 * scoping control, so this renders as a small control row at the top of the
 * page content instead — still backed by the same AcademicYearContext, so it
 * still selects a batch and still scopes every page to that cohort exactly
 * as before.
 */
export function AcademicCoordinatorBatchBar() {
  const { batchId, setBatchId, batches } = useAcademicYear();

  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="text-[13px] font-semibold text-muted">Batch</span>
      <Select
        value={batchId ?? ""}
        onChange={(e) => setBatchId(Number(e.target.value))}
        title="Batch — scopes every page to this cohort"
        className="h-10 w-auto min-w-0 flex-none rounded-card-sm font-semibold"
      >
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.start_year}-{b.end_year}
          </option>
        ))}
      </Select>
    </div>
  );
}
