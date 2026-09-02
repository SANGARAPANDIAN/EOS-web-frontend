"use client";

import { useState } from "react";
import { Select, Input, Badge, Button, EmptyState, Skeleton } from "@/components/ui";
import {
  useHodNoDueClasses,
  useHodNoDueList,
  useUpdateHodNoDue,
  type HodNoDueRow,
} from "@/modules/hod/api/noDue";

// Every category here is computed live (fees/library/laboratory/hostel from
// real dues, academics from subject-handling faculty sign-off) — none is
// independently settable by a HoD, so this page has no per-category edit
// mode. The one real action is "Issue no-due", an explicit override that
// approves a student regardless of what the categories show.
const CATEGORIES: { key: keyof HodNoDueRow; label: string }[] = [
  { key: "library_cleared", label: "Library" },
  { key: "laboratory_cleared", label: "Laboratory" },
  { key: "fees_cleared", label: "Fees" },
  { key: "hostel_cleared", label: "Hostel" },
  { key: "academics_cleared", label: "Academics" },
];

function CategoryDot({ cleared }: { cleared: boolean }) {
  return (
    <span
      className={
        "flex size-7 items-center justify-center rounded-full text-[13px] font-bold " +
        (cleared ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fef7ec] text-[#92400e]")
      }
    >
      {cleared ? "✓" : "✕"}
    </span>
  );
}

export default function HodNoDuePage() {
  const classes = useHodNoDueClasses();
  const [classId, setClassId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const effectiveClassId = classId ?? classes.data?.[0]?.class_id ?? null;
  const list = useHodNoDueList(effectiveClassId, search);
  const update = useUpdateHodNoDue();

  const c = list.data?.counts;
  const gridCols = "2.2fr 1fr 1fr 1fr 1fr 1fr 1.2fr 130px";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {list.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load no-due data — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">No-Due Status</h1>
        <p className="mt-1 text-[13px] text-muted">
          Clearance across library, laboratory, fees, hostel and academics for every student
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

      <div className="overflow-x-auto rounded-card border border-border-default bg-surface">
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
        ) : list.isError ? null : !list.data || list.data.rows.length === 0 ? (
          <EmptyState message="No students in this class." className="px-5" />
        ) : (
          list.data.rows.map((row) => (
            <div
              key={row.student_id}
              className="grid items-center gap-2 border-t border-divider px-5 py-3.5 text-[13px] text-ink hod-hover-row"
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
                  <CategoryDot cleared={Boolean(row[cat.key])} />
                </div>
              ))}
              <div>
                <Badge tone={row.issued ? "accent" : "danger"}>
                  {row.issued ? "No-due issued" : "Not cleared"}
                </Badge>
              </div>
              <div className="flex justify-end">
                {row.issued ? (
                  <Button variant="secondary" disabled>
                    Issued
                  </Button>
                ) : (
                  <Button
                    variant="primarySmall"
                    onClick={() => update.mutate({ studentId: row.student_id, patch: { issue: true } })}
                    loading={update.isPending && update.variables?.studentId === row.student_id}
                  >
                    Issue no-due
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
