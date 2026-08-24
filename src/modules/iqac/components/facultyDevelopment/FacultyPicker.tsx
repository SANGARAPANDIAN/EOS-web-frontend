"use client";

import { useState } from "react";
import { useFacultyList } from "@/modules/iqac/api/faculty";
import type { FacultyRow } from "@/modules/iqac/api/faculty";

function IdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold tracking-[.06em] text-subtle uppercase">{label}</div>
      <div className="mt-0.5 text-[13.5px] font-bold text-ink">{value}</div>
    </div>
  );
}

/**
 * Search-a-faculty-member-then-show-their-real-identity block, mirroring
 * StudentPicker. Faculty id/Department/Designation come straight from the
 * same real FacultyRow already used across the IQAC Faculty & Staff page.
 */
export function FacultyPicker({ selected, onSelect }: { selected: FacultyRow | null; onSelect: (f: FacultyRow | null) => void }) {
  const [query, setQuery] = useState("");
  const faculty = useFacultyList({ q: query.trim() || undefined, status: "all" });

  if (selected) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Faculty</div>
          <button type="button" onClick={() => onSelect(null)} className="text-[12px] font-bold text-primary hover:underline">
            Change
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 rounded-[10px] border border-border-default bg-surface-tint p-3.5 sm:grid-cols-3">
          <IdentityField label="Faculty id" value={selected.staff_code ?? "—"} />
          <IdentityField label="Faculty" value={selected.name} />
          <IdentityField label="Department" value={selected.department?.code ?? "—"} />
          <IdentityField label="Designation" value={selected.designation} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Faculty</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search faculty by name"
        className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
      />
      {query.trim() && !faculty.isLoading && (
        <div className="mt-1.5 max-h-[160px] overflow-y-auto rounded-[10px] border border-border-default">
          {(faculty.data?.faculty ?? []).slice(0, 20).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                onSelect(f);
                setQuery("");
              }}
              className="block w-full px-3.5 py-2 text-left text-[13px] text-ink hover:bg-surface-tint"
            >
              {f.name} · {f.designation} · {f.department?.code ?? "—"}
            </button>
          ))}
          {(faculty.data?.faculty ?? []).length === 0 && <div className="px-3.5 py-2 text-[13px] text-subtle">No matching faculty.</div>}
        </div>
      )}
    </div>
  );
}
