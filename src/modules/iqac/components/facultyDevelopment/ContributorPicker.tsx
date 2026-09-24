"use client";

import { useState } from "react";
import { PersonPicker } from "@/components/ui/PersonPicker";
import { Icon } from "@/components/ui";
import { useFacultyList, type FacultyRow } from "@/modules/iqac/api/faculty";
import { useStudentsList, type StudentRow } from "@/modules/iqac/api/students";

export interface Contributor {
  type: "faculty" | "student";
  id: number;
  name: string;
  subtitle: string;
  role: string;
}

export interface ContributorRoleOption {
  value: string;
  label: string;
}

type PickerItem = { type: "faculty"; row: FacultyRow } | { type: "student"; row: StudentRow };

function subtitleFor(item: PickerItem): string {
  return item.type === "faculty"
    ? [item.row.designation, item.row.department?.code].filter(Boolean).join(" · ")
    : [item.row.roll_no, item.row.department?.code].filter(Boolean).join(" · ");
}

/**
 * The "+"-driven faculty-or-student contributor list shared by the
 * Publications/Research/Patents entry modals — built on the shared
 * PersonPicker (search → pick → appended below with a per-row role
 * dropdown) rather than a new one-off picker per domain. Merges
 * useFacultyList/useStudentsList client-side into one combined result set
 * instead of adding a new backend search endpoint — both already search by
 * name and are already used elsewhere in this module (FacultyPicker/
 * StudentPicker). `roleOptions` is domain-specific (Primary/Secondary
 * author for Publications, Principal Investigator/Co-Investigator/Team
 * Member for Research, Inventor/Co-inventor for Patents) — a newly added
 * contributor defaults to the last option (the "plain member" role in
 * every one of those sets).
 */
export function ContributorPicker({
  value,
  onChange,
  roleOptions,
}: {
  value: Contributor[];
  onChange: (next: Contributor[]) => void;
  roleOptions: ContributorRoleOption[];
}) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const faculty = useFacultyList({ q: term || undefined });
  const students = useStudentsList({ q: term || undefined });

  const added = new Set(value.map((c) => `${c.type}-${c.id}`));
  const results: PickerItem[] = [
    ...(faculty.data?.faculty ?? []).map((row): PickerItem => ({ type: "faculty", row })),
    ...(students.data?.students ?? []).map((row): PickerItem => ({ type: "student", row })),
  ].filter((item) => !added.has(`${item.type}-${item.row.id}`));

  function addContributor(item: PickerItem) {
    onChange([
      ...value,
      { type: item.type, id: item.row.id, name: item.row.name, subtitle: subtitleFor(item), role: roleOptions[roleOptions.length - 1].value },
    ]);
    setTerm("");
    setOpen(false);
  }

  function updateRole(index: number, role: string) {
    onChange(value.map((c, i) => (i === index ? { ...c, role } : c)));
  }

  function removeContributor(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Contributors</div>

      <PersonPicker<PickerItem>
        value={null}
        onChange={(item) => item && addContributor(item)}
        getId={(item) => `${item.type}-${item.row.id}`}
        toRow={(item) => ({
          name: item.row.name,
          subtitle: `${item.type === "faculty" ? "Faculty" : "Student"} · ${subtitleFor(item)}`,
        })}
        results={results}
        isLoading={faculty.isLoading || students.isLoading}
        term={term}
        onTermChange={setTerm}
        open={open}
        onOpenChange={setOpen}
        placeholder="Search faculty or student by name, roll no. or email…"
        emptyMessage="Type a name, roll number or email to add a contributor."
      />

      {value.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {value.map((c, i) => (
            <div key={`${c.type}-${c.id}`} className="flex items-center gap-3 rounded-[10px] border border-border-default bg-surface px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold text-ink">{c.name}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-muted">
                  {c.type === "faculty" ? "Faculty" : "Student"}
                  {c.subtitle ? ` · ${c.subtitle}` : ""}
                </div>
              </div>
              <select
                value={c.role}
                onChange={(e) => updateRole(i, e.target.value)}
                className="h-9 shrink-0 rounded-[9px] border border-border-default bg-surface px-2.5 text-[12.5px] outline-none focus:border-primary"
              >
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeContributor(i)}
                aria-label={`Remove ${c.name}`}
                className="shrink-0 text-subtle hover:text-danger-fg"
              >
                <Icon name="close" size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
