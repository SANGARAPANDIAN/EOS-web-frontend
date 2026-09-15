"use client";

import { useState } from "react";
import { PersonPicker, Select } from "@/components/ui";
import { useHrFacultySearch, type HrFaculty } from "@/modules/hr/api/facultyDirectory";
import { useHrDepartments } from "@/modules/hr/api/departments";

function facultyLabel(f: HrFaculty): string {
  return [f.prefix, f.first_name, f.last_name].filter(Boolean).join(" ");
}

/**
 * Searchable faculty selector for the HR screens — a thin adapter over the
 * shared PersonPicker (search/select/hover list logic lives there once,
 * not re-implemented per module).
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
 * narrows the list server-side once open.
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

  return (
    <PersonPicker
      value={value}
      onChange={(f) => {
        onChange(f);
        if (!f) setTerm("");
      }}
      getId={(f) => f.id}
      toRow={(f) => ({
        name: facultyLabel(f),
        subtitle: [f.staff_code, f.designation, f.department?.name].filter(Boolean).join(" · "),
        avatarUrl: f.profile_url,
      })}
      results={matches.data?.data ?? []}
      total={matches.data?.meta?.total}
      isLoading={matches.isLoading}
      term={term}
      onTermChange={setTerm}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      disabled={disabled}
      emptyMessage="No faculty on record."
      noMatchMessage="No faculty matched that search."
      filters={
        showDepartmentFilter ? (
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={disabled}>
            <option value="all">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        ) : undefined
      }
    />
  );
}
