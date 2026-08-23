"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";
import type { Department, SchoolClass } from "../types";

interface DepartmentRailProps {
  departments: Department[];
  classes: SchoolClass[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Omit to render read-only (no "+ Add department" button) — e.g. for a coordinator viewing the real structure without Admin's write access. */
  onAdd?: () => void;
}

export function DepartmentRail({ departments, classes, selectedId, onSelect, onAdd }: DepartmentRailProps) {
  return (
    <aside className="flex flex-col overflow-hidden rounded-card border border-border-default bg-surface">
      <div className="border-b border-divider px-4 py-[13px]">
        <span className="text-[11px] font-extrabold tracking-[.06em] text-subtle">DEPARTMENTS</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {departments.length === 0 && <EmptyState message="No departments yet. Add the first one to begin." />}
        {departments.map((d) => {
          const classCount = classes.filter((c) => c.department_id === d.id).length;
          const active = d.id === selectedId;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              className={cn(
                "mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                active ? "bg-accent-50" : "hover:bg-surface-muted",
              )}
            >
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-1 text-[10px] font-bold",
                  active ? "bg-accent-100 text-primary" : "bg-surface-muted text-muted",
                )}
              >
                {d.code}
              </span>
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate text-[13px]",
                    active ? "font-semibold text-primary" : "font-medium text-ink",
                  )}
                >
                  {d.name}
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted">
                  {classCount} {classCount === 1 ? "class" : "classes"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {onAdd && (
        <div className="border-t border-divider p-2.5">
          <Button variant="secondary" className="w-full" onClick={onAdd}>
            + Add department
          </Button>
        </div>
      )}
    </aside>
  );
}
