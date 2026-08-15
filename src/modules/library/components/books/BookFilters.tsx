"use client";

import { FilterBar, Checkbox, Select } from "@/modules/admin/components/ui";
import { useDepartments } from "@/modules/admin/api/refData";
import { useCategories } from "@/modules/library/api/categories";
import { useRacks } from "@/modules/library/api/racks";

export interface BookFiltersValue {
  category_id?: number;
  department_id?: number;
  rack_id?: number;
  available_only?: boolean;
}

interface BookFiltersProps {
  value: BookFiltersValue;
  onChange: (value: BookFiltersValue) => void;
}

function toId(value: string): number | undefined {
  return value ? Number(value) : undefined;
}

const hasAnyFilter = (value: BookFiltersValue) =>
  value.category_id !== undefined || value.department_id !== undefined || value.rack_id !== undefined || !!value.available_only;

/** Category / department / rack / available-only filters for the book catalogue. */
export function BookFilters({ value, onChange }: BookFiltersProps) {
  const { data: categories } = useCategories();
  const { data: departments } = useDepartments();
  const { data: racks } = useRacks({ page_size: 100 });

  return (
    <FilterBar>
      <Select
        aria-label="Category"
        className="w-44"
        value={value.category_id ?? ""}
        onChange={(e) => onChange({ ...value, category_id: toId(e.target.value) })}
      >
        <option value="">All categories</option>
        {categories?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Department"
        className="w-44"
        value={value.department_id ?? ""}
        onChange={(e) => onChange({ ...value, department_id: toId(e.target.value) })}
      >
        <option value="">All departments</option>
        {departments?.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Rack"
        className="w-40"
        value={value.rack_id ?? ""}
        onChange={(e) => onChange({ ...value, rack_id: toId(e.target.value) })}
      >
        <option value="">All racks</option>
        {racks?.data.map((r) => (
          <option key={r.id} value={r.id}>
            {r.rack_code}
          </option>
        ))}
      </Select>

      <label className="flex items-center gap-2 text-sm text-admin-body">
        <Checkbox
          checked={!!value.available_only}
          onChange={(e) => onChange({ ...value, available_only: e.target.checked || undefined })}
        />
        Available only
      </label>

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
