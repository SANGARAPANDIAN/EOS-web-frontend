"use client";

import { FilterBar, Input, Select } from "@/modules/admin/components/ui";

export interface InterviewFiltersValue {
  query: string;
  status: string;
  department: string;
}

interface InterviewFiltersProps {
  value: InterviewFiltersValue;
  onChange: (value: InterviewFiltersValue) => void;
  departmentOptions: string[];
}

export const INTERVIEW_STATUS_OPTIONS = ["All statuses", "Scheduled", "In progress", "Completed"];

const DEFAULT_VALUE: InterviewFiltersValue = { query: "", status: "All statuses", department: "All departments" };

export function InterviewFilters({ value, onChange, departmentOptions }: InterviewFiltersProps) {
  const isDefault = value.query === "" && value.status === "All statuses" && value.department === "All departments";

  return (
    <FilterBar>
      <Input
        leadingIcon="search"
        placeholder="Search by student or company"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        className="max-w-xs"
      />
      <Select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })} className="w-40">
        {INTERVIEW_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
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
      {!isDefault && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_VALUE)}
          className="ml-auto text-sm font-semibold text-admin-primary hover:text-admin-primary-dark"
        >
          Reset filters
        </button>
      )}
    </FilterBar>
  );
}

export const DEFAULT_INTERVIEW_FILTERS = DEFAULT_VALUE;
