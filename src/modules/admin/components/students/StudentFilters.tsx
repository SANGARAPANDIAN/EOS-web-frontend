"use client";

import { Icon } from "@/components/ui/Icon";
import { Select } from "@/modules/admin/components/ui/Select";
import { useDepartments, useBatches, useCourses, useQuotas } from "@/modules/admin/api/refData";
import type { ListStudentsParams } from "@/modules/admin/api/students";

export type StudentFiltersValue = Pick<
  ListStudentsParams,
  "status" | "department_id" | "batch_id" | "course_id" | "quota_id" | "student_type"
>;

interface StudentFiltersProps {
  value: StudentFiltersValue;
  onChange: (value: StudentFiltersValue) => void;
  onClearAll: () => void;
}

function toId(value: string): number | undefined {
  return value ? Number(value) : undefined;
}

/** Reason shown on every filter the schema can't back yet — same wording pattern as the rest of this page. */
const NOT_REAL = "Needs data that doesn't exist as a queryable field yet";

const hasAnyFilter = (value: StudentFiltersValue) => Object.values(value).some((v) => v !== undefined);

export function StudentFilters({ value, onChange, onClearAll }: StudentFiltersProps) {
  const { data: departments } = useDepartments();
  const { data: batches } = useBatches();
  const { data: courses } = useCourses();
  const { data: quotas } = useQuotas();

  return (
    <div className="flex flex-col gap-3">
      {/* Matches the old console's exact 6 filters, in its exact order. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-admin-muted">
          <Icon name="filter_list" size={17} />
          Filters
        </span>

        <Select
          className="w-fit min-w-[150px]"
          value={value.status ?? ""}
          onChange={(e) => onChange({ ...value, status: (e.target.value || undefined) as never })}
        >
          <option value="">Status: All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          {/* Not real in this schema (students.status is active/inactive only) — shown, disabled, for parity with the old console. */}
          <option disabled title={NOT_REAL}>
            Graduated — not tracked
          </option>
          <option disabled title={NOT_REAL}>
            Alumni — not tracked
          </option>
          <option disabled title={NOT_REAL}>
            Suspended — not tracked
          </option>
          <option disabled title={NOT_REAL}>
            Transferred — not tracked
          </option>
        </Select>

        <Select
          className="w-fit min-w-[150px]"
          value={value.department_id ?? ""}
          onChange={(e) => onChange({ ...value, department_id: toId(e.target.value) })}
        >
          <option value="">Dept: All</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id} title={d.name}>
              {d.code}
            </option>
          ))}
        </Select>

        <Select className="w-fit min-w-[150px]" disabled defaultValue="" title={`Year — ${NOT_REAL} (no per-student study-year field)`}>
          <option value="">Year: All</option>
          <option value="1">Year 1</option>
          <option value="2">Year 2</option>
          <option value="3">Year 3</option>
          <option value="4">Year 4</option>
        </Select>

        <Select className="w-fit min-w-[150px]" disabled defaultValue="" title={`Fees — ${NOT_REAL} (no per-student fee-status endpoint)`}>
          <option value="">Fees: All</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
          <option value="due">Any dues</option>
        </Select>

        <Select
          className="w-fit min-w-[150px]"
          disabled
          defaultValue=""
          title={`Attendance — ${NOT_REAL} (no attendance-summary endpoint)`}
        >
          <option value="">Attendance: All</option>
          <option value="high">85% and above</option>
          <option value="mid">75–84%</option>
          <option value="low">Below 75%</option>
        </Select>

        <Select
          className="w-fit min-w-[150px]"
          value={value.quota_id ?? ""}
          onChange={(e) => onChange({ ...value, quota_id: toId(e.target.value) })}
        >
          <option value="">Quota: All</option>
          {quotas?.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </Select>

        {hasAnyFilter(value) && (
          <button type="button" onClick={onClearAll} className="ml-auto text-sm font-semibold text-admin-primary hover:text-admin-primary-dark">
            Clear all
          </button>
        )}
      </div>

      {/* Beyond the old console's own 6: real, additional facets this schema actually supports. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold tracking-wide text-admin-subtle uppercase">More filters</span>

        <Select
          className="w-fit"
          value={value.batch_id ?? ""}
          onChange={(e) => onChange({ ...value, batch_id: toId(e.target.value) })}
        >
          <option value="">Batch: All</option>
          {batches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>

        <Select
          className="w-fit"
          value={value.course_id ?? ""}
          onChange={(e) => onChange({ ...value, course_id: toId(e.target.value) })}
        >
          <option value="">Course: All</option>
          {courses?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </Select>

        <Select
          className="w-fit"
          value={value.student_type ?? ""}
          onChange={(e) => onChange({ ...value, student_type: (e.target.value || undefined) as never })}
        >
          <option value="">Type: All</option>
          <option value="hosteller">Hosteller</option>
          <option value="dayscholar">Day scholar</option>
        </Select>
      </div>
    </div>
  );
}
