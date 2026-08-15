"use client";

import { FilterBar, Input, Select } from "@/modules/admin/components/ui";

export interface OfferFiltersValue {
  query: string;
  status: string;
  department: string;
}

export const OFFER_STATUS_OPTIONS = ["All statuses", "Accepted", "Pending", "Declined"];

const DEFAULT_VALUE: OfferFiltersValue = { query: "", status: "All statuses", department: "All departments" };

interface OfferFiltersProps {
  value: OfferFiltersValue;
  onChange: (value: OfferFiltersValue) => void;
  departmentOptions: string[];
}

export function OfferFilters({ value, onChange, departmentOptions }: OfferFiltersProps) {
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
        {OFFER_STATUS_OPTIONS.map((s) => (
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

export const DEFAULT_OFFER_FILTERS = DEFAULT_VALUE;
