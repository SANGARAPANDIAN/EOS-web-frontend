"use client";

import { FilterBar, Select } from "@/modules/admin/components/ui";
import { useDepartments } from "@/modules/admin/api/refData";

export interface FacultyFiltersValue {
  department_id?: number;
  designation?: string;
  status?: "active" | "inactive";
  year?: number;
}

interface FacultyFiltersBarProps {
  value: FacultyFiltersValue;
  onChange: (value: FacultyFiltersValue) => void;
  designationOptions: string[];
  yearOptions: number[];
}

function toId(value: string): number | undefined {
  return value ? Number(value) : undefined;
}

const hasAnyFilter = (value: FacultyFiltersValue) =>
  value.department_id !== undefined || value.designation !== undefined || value.status !== undefined || value.year !== undefined;

/** Department / designation / status / joining-year filters for the faculty directory. */
export function FacultyFiltersBar({ value, onChange, designationOptions, yearOptions }: FacultyFiltersBarProps) {
  const { data: departments } = useDepartments();

  return (
    <FilterBar>
      <Select
        aria-label="Department"
        value={value.department_id ?? ""}
        onChange={(e) => onChange({ ...value, department_id: toId(e.target.value) })}
        className="w-44"
      >
        <option value="">Department: All</option>
        {departments?.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Designation"
        value={value.designation ?? ""}
        onChange={(e) => onChange({ ...value, designation: e.target.value || undefined })}
        className="w-48"
      >
        <option value="">Designation: All</option>
        {designationOptions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Status"
        value={value.status ?? ""}
        onChange={(e) => onChange({ ...value, status: (e.target.value || undefined) as "active" | "inactive" | undefined })}
        className="w-36"
      >
        <option value="">Status: All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </Select>

      <Select
        aria-label="Date of joining"
        value={value.year ?? ""}
        onChange={(e) => onChange({ ...value, year: toId(e.target.value) })}
        className="w-48"
      >
        <option value="">Date of joining: All</option>
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>

      {hasAnyFilter(value) && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-auto text-sm font-semibold text-admin-primary hover:text-admin-primary-dark"
        >
          Clear all
        </button>
      )}
    </FilterBar>
  );
}
