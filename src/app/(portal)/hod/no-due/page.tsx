"use client";

import { useState } from "react";
import { Select, Input, Badge, Button, EmptyState, Skeleton } from "@/components/ui";
import {
  useHodNoDueClasses,
  useHodNoDueList,
  useUpdateHodNoDue,
  type HodNoDueRow,
  type NoDuePatch,
} from "@/modules/hod/api/noDue";

const CATEGORIES: { key: keyof HodNoDueRow; label: string }[] = [
  { key: "library_cleared", label: "Library" },
  { key: "laboratory_cleared", label: "Laboratory" },
  { key: "fees_cleared", label: "Fees" },
  { key: "hostel_cleared", label: "Hostel" },
  { key: "sports_cleared", label: "Sports" },
];

function CategoryDot({ cleared, editable, onClick }: { cleared: boolean; editable?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={!editable}
      onClick={onClick}
      className={
        "flex size-7 items-center justify-center rounded-full text-[13px] font-bold " +
        (cleared ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fef7ec] text-[#92400e]") +
        (editable ? " cursor-pointer" : " cursor-default")
      }
    >
      {cleared ? "✓" : "···"}
    </button>
  );
}

export default function HodNoDuePage() {
  const classes = useHodNoDueClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const effectiveClassId = classId ?? classes.data?.[0]?.class_id ?? null;
  const list = useHodNoDueList(effectiveClassId, search);
  const update = useUpdateHodNoDue();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<NoDuePatch>({});

  function startEdit(row: HodNoDueRow) {
    setEditingId(row.student_id);
    setDraft({
      library_cleared: row.library_cleared,
      laboratory_cleared: row.laboratory_cleared,
      fees_cleared: row.fees_cleared,
      hostel_cleared: row.hostel_cleared,
      sports_cleared: row.sports_cleared,
    });
  }

  function toggle(key: keyof NoDuePatch) {
    setDraft((d) => ({ ...d, [key]: !d[key] }));
  }

  function tickAllAndIssue() {
    setDraft({
      library_cleared: true,
      laboratory_cleared: true,
      fees_cleared: true,
      hostel_cleared: true,
      sports_cleared: true,
    });
  }

  async function commit(studentId: number) {
    const allCleared =
      draft.library_cleared &&
      draft.laboratory_cleared &&
      draft.fees_cleared &&
      draft.hostel_cleared &&
      draft.sports_cleared;
    await update.mutateAsync({ studentId, patch: { ...draft, issue: Boolean(allCleared) } });
    setEditingId(null);
  }

  const c = list.data?.counts;
  const gridCols = "2.2fr 1fr 1fr 1fr 1fr 1fr 1.2fr 110px";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">No-Due Status</h1>
        <p className="mt-1 text-[13px] text-muted">
          Clearance across library, laboratory, fees, hostel and sports for every student
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={effectiveClassId ?? ""}
          onChange={(e) => setClassId(Number(e.target.value))}
          className="max-w-[240px]"
        >
          {(classes.data ?? []).map((c) => (
            <option key={c.class_id} value={c.class_id}>
              {c.year_label}-{c.section} · {c.year_label} Year, Section {c.section}
            </option>
          ))}
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Register number or name"
          className="max-w-[320px]"
        />
        <div className="ml-auto flex gap-2">
          <Badge tone="neutral">{c?.in_scope ?? 0} in scope</Badge>
          <Badge tone="accent">{c?.issued ?? 0} issued</Badge>
          <Badge tone="neutral">{c?.pending ?? 0} pending</Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border-default bg-surface">
        <div
          className="grid gap-2 px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle uppercase bg-surface-muted"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div>Student</div>
          {CATEGORIES.map((c) => (
            <div key={c.key} className="text-center">
              {c.label}
            </div>
          ))}
          <div>Overall</div>
          <div className="text-right">Action</div>
        </div>

        {list.isLoading ? (
          <div className="flex flex-col gap-px">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="border-t border-divider px-5 py-4 first:border-t-0">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : !list.data || list.data.rows.length === 0 ? (
          <EmptyState message="No students in this class." className="px-5" />
        ) : (
          list.data.rows.map((row) => {
            const editing = editingId === row.student_id;
            return (
              <div
                key={row.student_id}
                className={
                  "grid items-center gap-2 border-t border-divider px-5 py-3.5 text-[13px] text-ink " +
                  (editing ? "rounded-[10px] border border-border-accent" : "hod-hover-row")
                }
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-bold text-ink">{row.name ?? row.student_id_no}</div>
                  <div className="truncate text-[11.5px] text-subtle">
                    {row.student_id_no} · {row.class_label}
                  </div>
                </div>
                {CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex justify-center">
                    <CategoryDot
                      cleared={editing ? Boolean(draft[cat.key as keyof NoDuePatch]) : Boolean(row[cat.key])}
                      editable={editing}
                      onClick={() => toggle(cat.key as keyof NoDuePatch)}
                    />
                  </div>
                ))}
                <div>
                  <Badge tone={row.issued ? "accent" : "danger"}>
                    {row.issued ? "No-due issued" : "Not cleared"}
                  </Badge>
                </div>
                <div className="flex justify-end gap-2">
                  {editing ? (
                    <>
                      <Button variant="text" onClick={tickAllAndIssue}>
                        Tick all &amp; issue
                      </Button>
                      <Button
                        variant="primarySmall"
                        onClick={() => commit(row.student_id)}
                        disabled={update.isPending}
                      >
                        Done
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" onClick={() => startEdit(row)}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
