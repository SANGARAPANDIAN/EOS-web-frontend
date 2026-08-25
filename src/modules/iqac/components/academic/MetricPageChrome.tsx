"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilterSelect } from "@/modules/iqac/components/PageControls";
import { Modal } from "@/components/ui";
import { useDepartmentsList } from "@/modules/iqac/api/departments";
import { useFacultyList } from "@/modules/iqac/api/faculty";
import { useClassOptions, useCreateClassRow, useAssignClassMentor, currentAcademicYearShort } from "@/modules/iqac/api/academicQuality";

/** "← IQAC dashboard" + breadcrumb — matches the design's metric-detail back nav exactly. */
export function MetricBackNav({ crumb }: { crumb: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3.5">
      <button
        type="button"
        onClick={() => router.push("/iqac/dashboard")}
        className="h-10 rounded-[9px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
      >
        ← IQAC dashboard
      </button>
      <span className="text-[13px] font-semibold text-subtle">{crumb}</span>
    </div>
  );
}

export function MetricHeader({
  name,
  blurb,
  addLabel,
  onAdd,
}: {
  name: string;
  blurb: string;
  /** The design reference's "+ Add class row" action — only Attendance/CGPA (trend/bands kinds) show this. */
  addLabel?: string;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[34px] font-extrabold tracking-[-.02em] text-ink">{name}</h1>
        <p className="text-[15px] font-medium text-muted">{blurb}</p>
      </div>
      {addLabel && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="hover-lift h-11 shrink-0 rounded-[10px] border border-primary-border bg-primary px-5 text-[13.5px] font-bold text-white"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

export interface MetricCard {
  label: string;
  value: string | number;
  foot: string;
  hasBar?: boolean;
  barPct?: number;
}

/** The design's "This year / Last year / Target / Attainment" card row. */
export function MetricCards({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="hover-lift flex flex-col gap-2 rounded-card border border-border-default bg-surface p-[18px]">
          <div className="text-[13px] font-bold text-muted">{c.label}</div>
          <div className="text-[27px] font-extrabold tracking-[-.02em] text-ink">{c.value}</div>
          <div className="text-[12px] font-semibold text-subtle">{c.foot}</div>
          {c.hasBar && (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-tint">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, c.barPct ?? 0)}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export interface RollupItem {
  code: string;
  value: string;
  pct: number | null;
}

/** The 8 department mini-cards, clickable to filter the register below. */
export function DepartmentRollup({
  items,
  selected,
  onSelect,
  footLabel = "this term",
}: {
  items: RollupItem[];
  selected: string | null;
  onSelect: (code: string | null) => void;
  footLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {items.map((d) => {
        const on = selected === d.code;
        return (
          <button
            key={d.code}
            type="button"
            onClick={() => onSelect(on ? null : d.code)}
            className={`hover-lift flex flex-col gap-1.5 rounded-[11px] border p-3 text-left ${
              on ? "border-primary-border bg-accent-50" : "border-border-default bg-surface"
            }`}
          >
            <span className="text-[11px] font-extrabold tracking-[.04em] text-muted">{d.code}</span>
            <span className="text-[17px] font-extrabold tracking-[-.01em] text-ink">{d.value}</span>
            <span className="block h-1 overflow-hidden rounded-full bg-surface-tint">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, d.pct ?? 0)}%` }} />
            </span>
            <span className="text-[10.5px] font-semibold text-subtle">{footLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface MetricSelect {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

/** Search + selects (row 1) and band toggle + count + Clear filters (row 2) — same two-row filter bar shape for every metric kind. */
export function MetricFilterBar({
  search,
  onSearch,
  searchPlaceholder,
  selects,
  bandOptions = [],
  band = "",
  onBand,
  countLabel,
  onClear,
}: {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  selects: MetricSelect[];
  bandOptions?: string[];
  band?: string;
  onBand?: (b: string) => void;
  countLabel: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-border-default bg-surface p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">Search</span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-3.5 text-[13.5px] font-semibold outline-none focus:border-primary"
          />
        </label>
        {selects.map((s) => (
          <div key={s.label} className="min-w-[150px]">
            <FilterSelect label={s.label} value={s.value} onChange={s.onChange} options={s.options} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-divider pt-3.5">
        {bandOptions.length > 0 && (
          <div className="flex gap-1 rounded-[10px] bg-surface-tint p-1">
            {bandOptions.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onBand?.(b)}
                className={`h-9 rounded-[8px] px-3.5 text-[12.5px] font-bold transition-colors ${band === b ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
              >
                {b}
              </button>
            ))}
          </div>
        )}
        <span className="text-[12.5px] font-semibold text-subtle">{countLabel}</span>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto h-9 rounded-[9px] border border-border-default bg-surface px-3.5 text-[12.5px] font-bold text-ink hover:bg-surface-tint"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

/**
 * The design reference's "Add department row" form — shared by Attendance
 * and CGPA (the only two kinds that show this action). Creates a real row
 * in the `classes` table (department/batch/course/section/semester) plus,
 * if a class advisor is picked, a real class_mentors assignment for the
 * current academic year. The class then shows up in the register with
 * honest "—" values until real attendance/grade data is recorded for it
 * elsewhere — this form never writes a fabricated attendance/CGPA number,
 * target, or attainment (none of those can be manually set here — there's
 * no per-class target table, and This year/Last year are always computed
 * from real data, never typed in).
 */
export function AddClassRowForm({
  crumb,
  onClose,
  onCreated,
}: {
  /** e.g. "Academic Quality · Attendance" — shown under the form title. */
  crumb: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const departments = useDepartmentsList();
  const classOptions = useClassOptions();
  const create = useCreateClassRow();
  const assignMentor = useAssignClassMentor();

  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [section, setSection] = useState("");
  const [batchId, setBatchId] = useState("");
  const [semester, setSemester] = useState("");
  const [facultyQuery, setFacultyQuery] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const faculty = useFacultyList({ q: facultyQuery.trim() || undefined, status: "all" });
  const coursesForDept = (classOptions.data?.courses ?? []).filter((c) => String(c.department_id) === departmentId);

  async function submit() {
    if (!departmentId || !courseId || !batchId || !section.trim()) {
      setError("Department, section, batch and course are all required.");
      return;
    }
    setError(null);
    try {
      const created = await create.mutateAsync({
        department_id: Number(departmentId),
        course_id: Number(courseId),
        batch_id: Number(batchId),
        section: section.trim(),
        current_semester: semester ? Number(semester) : undefined,
      });
      if (facultyId) {
        await assignMentor.mutateAsync({
          classId: created.id,
          faculty_id: Number(facultyId),
          academic_year: currentAcademicYearShort(),
        });
      }
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not create this class.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Add department row" subtitle={crumb}>
      <div className="grid grid-cols-2 gap-4">
        <FilterSelect
          label="Department"
          value={departmentId}
          onChange={(v) => {
            setDepartmentId(v);
            setCourseId("");
          }}
          options={[{ value: "", label: "Select department" }, ...(departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))]}
        />
        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Section</div>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. A"
            maxLength={5}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
        </div>
        <FilterSelect
          label="Batch"
          value={batchId}
          onChange={setBatchId}
          options={[{ value: "", label: "Select batch" }, ...(classOptions.data?.batches ?? []).map((b) => ({ value: String(b.id), label: b.label }))]}
        />
        <FilterSelect
          label="Semester"
          value={semester}
          onChange={setSemester}
          options={[{ value: "", label: "Select semester" }, ...Array.from({ length: 8 }, (_, i) => i + 1).map((s) => ({ value: String(s), label: `Semester ${s}` }))]}
        />
        <FilterSelect
          label="Course / programme"
          value={courseId}
          onChange={setCourseId}
          disabled={!departmentId}
          options={[{ value: "", label: departmentId ? "Select course" : "Select department first" }, ...coursesForDept.map((c) => ({ value: String(c.id), label: `${c.code} — ${c.name}` }))]}
        />
      </div>

      <div className="mt-4">
        <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Class advisor (optional)</div>
        <input
          value={facultyQuery}
          onChange={(e) => {
            setFacultyQuery(e.target.value);
            setFacultyId("");
          }}
          placeholder="Search faculty by name"
          className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
        />
        {facultyQuery.trim() && !faculty.isLoading && (
          <div className="mt-1.5 max-h-[160px] overflow-y-auto rounded-[10px] border border-border-default">
            {(faculty.data?.faculty ?? []).slice(0, 20).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFacultyId(String(f.id));
                  setFacultyQuery(`${f.name} (${f.department?.code ?? "—"})`);
                }}
                className={`block w-full px-3.5 py-2 text-left text-[13px] hover:bg-surface-tint ${String(f.id) === facultyId ? "bg-accent-50 font-bold text-primary" : "text-ink"}`}
              >
                {f.name} · {f.designation} · {f.department?.code ?? "—"}
              </button>
            ))}
            {(faculty.data?.faculty ?? []).length === 0 && <div className="px-3.5 py-2 text-[13px] text-subtle">No matching faculty.</div>}
          </div>
        )}
      </div>

      {error && <div className="mt-3 text-[13px] font-semibold text-danger-fg">{error}</div>}

      <div className="mt-4 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="h-[42px] rounded-[10px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink hover:bg-surface-tint">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={create.isPending || assignMentor.isPending}
          className="h-[42px] rounded-[10px] border border-primary-border bg-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
        >
          {create.isPending || assignMentor.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
