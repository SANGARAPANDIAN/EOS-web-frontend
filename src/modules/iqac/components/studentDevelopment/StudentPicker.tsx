"use client";

import { useState } from "react";
import { useStudentsList } from "@/modules/iqac/api/students";
import type { StudentRow } from "@/modules/iqac/api/students";

/** Same "2 semesters per year" convention the backend's romanYear()/yearSemLabel() helpers use. */
function romanYear(semester: number | null): string | null {
  if (!semester) return null;
  const year = Math.ceil(semester / 2);
  return ["I", "II", "III", "IV", "V", "VI"][year - 1] ?? String(year);
}

function IdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold tracking-[.06em] text-subtle uppercase">{label}</div>
      <div className="mt-0.5 text-[13.5px] font-bold text-ink">{value}</div>
    </div>
  );
}

/**
 * Search-a-student-then-show-their-real-identity block, shared by every
 * "Add student entry" popup in Student Development. Roll no/Department/
 * Year/Section/Batch come straight from the same real StudentRow already
 * used across the IQAC Students page — no separate lookup, no fabricated
 * fields. "Year" is derived from real current_semester (2 semesters/year),
 * same as the rest of this codebase.
 */
export function StudentPicker({ selected, onSelect }: { selected: StudentRow | null; onSelect: (s: StudentRow | null) => void }) {
  const [query, setQuery] = useState("");
  const students = useStudentsList({ q: query.trim() || undefined, status: "all" });

  if (selected) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Student</div>
          <button type="button" onClick={() => onSelect(null)} className="text-[12px] font-bold text-primary hover:underline">
            Change
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 rounded-[10px] border border-border-default bg-surface-tint p-3.5 sm:grid-cols-3">
          <IdentityField label="Roll no" value={selected.roll_no ?? selected.student_id_no} />
          <IdentityField label="Student" value={selected.name} />
          <IdentityField label="Department" value={selected.department?.code ?? "—"} />
          <IdentityField label="Year" value={romanYear(selected.semester) ? `${romanYear(selected.semester)} year` : "—"} />
          <IdentityField label="Section" value={selected.section ?? "—"} />
          <IdentityField label="Batch" value={selected.batch?.name ?? "—"} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Student</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search student by name or roll number"
        className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
      />
      {query.trim() && !students.isLoading && (
        <div className="mt-1.5 max-h-[160px] overflow-y-auto rounded-[10px] border border-border-default">
          {(students.data?.students ?? []).slice(0, 20).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s);
                setQuery("");
              }}
              className="block w-full px-3.5 py-2 text-left text-[13px] text-ink hover:bg-surface-tint"
            >
              {s.name} · {s.roll_no ?? s.student_id_no} · {s.department?.code ?? "—"}
            </button>
          ))}
          {(students.data?.students ?? []).length === 0 && <div className="px-3.5 py-2 text-[13px] text-subtle">No matching student.</div>}
        </div>
      )}
    </div>
  );
}
