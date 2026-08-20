"use client";

import { FilterBar, Input, Select } from "@/modules/admin/components/ui";
import type { Batch } from "@/modules/placement/api/refData";

export interface StudentFiltersValue {
  query: string;
  batchId: number | "all";
  department: string;
  year: string;
  status: string;
  classLabel: string;
}

export const STUDENT_STATUS_OPTIONS = ["All statuses", "Placed", "In process", "Not placed", "Not applied"];

export const DEFAULT_STUDENT_FILTERS: StudentFiltersValue = {
  query: "",
  batchId: "all",
  department: "All departments",
  year: "All years",
  status: "All statuses",
  classLabel: "All classes",
};

interface StudentFiltersProps {
  value: StudentFiltersValue;
  onChange: (value: StudentFiltersValue) => void;
  batches?: Batch[];
  departmentOptions: string[];
  yearOptions: string[];
  classOptions: string[];
}

function isDefault(value: StudentFiltersValue): boolean {
  return (
    value.query === "" &&
    value.batchId === "all" &&
    value.department === "All departments" &&
    value.year === "All years" &&
    value.status === "All statuses" &&
    value.classLabel === "All classes"
  );
}

export function StudentFilters({ value, onChange, batches, departmentOptions, yearOptions, classOptions }: StudentFiltersProps) {
  return (
    <FilterBar>
      <Input
        leadingIcon="search"
        placeholder="Search by name, ID or register number"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        className="max-w-xs"
      />
      <Select
        value={value.batchId === "all" ? "all" : String(value.batchId)}
        onChange={(e) => onChange({ ...value, batchId: e.target.value === "all" ? "all" : Number(e.target.value) })}
        className="w-40"
      >
        <option value="all">All batches</option>
        {batches?.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
      <Select value={value.department} onChange={(e) => onChange({ ...value, department: e.target.value })} className="w-44">
        {departmentOptions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <Select value={value.classLabel} onChange={(e) => onChange({ ...value, classLabel: e.target.value })} className="w-36">
        {classOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select value={value.year} onChange={(e) => onChange({ ...value, year: e.target.value })} className="w-32">
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      <Select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })} className="w-40">
        {STUDENT_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {!isDefault(value) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_STUDENT_FILTERS)}
          className="ml-auto text-sm font-semibold text-admin-primary hover:text-admin-primary-dark"
        >
          Reset filters
        </button>
      )}
    </FilterBar>
  );
}
