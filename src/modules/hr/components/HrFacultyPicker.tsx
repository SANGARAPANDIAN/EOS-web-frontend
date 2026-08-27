"use client";

import { useState } from "react";
import { Avatar, Input, Select } from "@/components/ui";
import { useHrFacultySearch, type HrFaculty } from "@/modules/hr/api/facultyDirectory";
import { useHrDepartments } from "@/modules/hr/api/departments";

function facultyLabel(f: HrFaculty): string {
  return [f.prefix, f.first_name, f.last_name].filter(Boolean).join(" ");
}

/**
 * Searchable faculty selector for the HR screens.
 *
 * Replaces the plain dropdown those pages used. That dropdown asked for
 * `limit: 200`, which the API rejects outright (its cap is 100), so it rendered
 * empty every time — and with ~500 active faculty even a valid 100-row list
 * could not have held everyone.
 *
 * The results list is fetched before anyone types (opens on the first page
 * of faculty so scroll-and-pick needs no search at all) but only ever
 * RENDERS while the input is focused — otherwise every page embedding this
 * picker showed a full faculty list sitting open under an empty, untouched
 * search box, reading as a rendering bug rather than a picker. Typing
 * narrows the list server-side once open. Blur closes it after a short
 * delay so a click on a result (which blurs the input first) still
 * registers before the list unmounts.
 */
export function HrFacultyPicker({
  value,
  onChange,
  status = "active",
  placeholder = "Search by name, roll no, designation or email",
  disabled,
  showDepartmentFilter = true,
}: {
  /** Selected faculty, or null when nothing is chosen yet. */
  value: HrFaculty | null;
  onChange: (faculty: HrFaculty | null) => void;
  status?: "active" | "inactive";
  placeholder?: string;
  disabled?: boolean;
  showDepartmentFilter?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [departmentId, setDepartmentId] = useState("all");
  const [open, setOpen] = useState(false);
  const departments = useHrDepartments();

  // Stop querying once someone is chosen (so the result list does not linger
  // underneath the selection) and before the input is ever focused (so
  // opening a page with several of these pickers doesn't fire a search for
  // every one of them up front).
  const matches = useHrFacultySearch(value || !open ? null : term, {
    status,
    departmentId: departmentId === "all" ? undefined : Number(departmentId),
  });
  const rows = matches.data?.data ?? [];
  const total = matches.data?.meta?.total ?? 0;

  if (value) {
    return (
      <div className="mt-1.5 flex items-center gap-3 rounded-[10px] border border-border-default bg-surface-tint px-3.5 py-2.5">
        <Avatar name={facultyLabel(value)} imageUrl={value.profile_url} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-extrabold text-ink">{facultyLabel(value)}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">
            {[value.staff_code, value.designation, value.department?.name].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            setTerm("");
          }}
          className="shrink-0 text-[12.5px] font-bold text-primary disabled:opacity-40"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative mt-1.5">
      <div className={showDepartmentFilter ? "grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]" : ""}>
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setOpen(true)}
          // A click on a result button blurs the input first — closing
          // immediately would unmount the list before that click's onClick
          // fires. The short delay lets the click register; onMouseDown
          // below (which fires before blur) additionally guards it.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          disabled={disabled}
        />
        {showDepartmentFilter && (
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={disabled}>
            <option value="all">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Floats over whatever sits below the picker instead of pushing it
          down the page — a page embedding several of these (or a table
          right underneath) shouldn't reflow every time this opens. */}
      {open && (
        <div className="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-[10px] border border-border-default bg-surface shadow-modal">
          <div className="max-h-[260px] overflow-y-auto">
            {matches.isLoading ? (
              <div className="px-3.5 py-3 text-[12.5px] text-subtle">Loading faculty…</div>
            ) : rows.length === 0 ? (
              <div className="px-3.5 py-3 text-[12.5px] text-subtle">
                {term.trim() ? "No faculty matched that search." : "No faculty on record."}
              </div>
            ) : (
              rows.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange(f)}
                  className="flex w-full items-center gap-3 border-b border-divider bg-surface px-3.5 py-2.5 text-left last:border-b-0 hover:bg-surface-tint"
                >
                  <Avatar name={facultyLabel(f)} imageUrl={f.profile_url} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-ink">{facultyLabel(f)}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-muted">
                      {[f.staff_code, f.designation, f.department?.name].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* The API caps a page at 100 rows, so say so rather than implying the
              visible list is everyone who matched. */}
          {total > rows.length && (
            <div className="border-t border-divider bg-surface-tint px-3.5 py-1.5 text-[11.5px] text-subtle">
              Showing {rows.length} of {total} — type to narrow the list.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
