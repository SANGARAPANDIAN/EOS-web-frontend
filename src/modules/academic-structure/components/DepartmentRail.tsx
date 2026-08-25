"use client";

import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
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
      <div className="border-b border-divider px-4 py-3.5">
        <span className="text-[11px] font-bold tracking-[.4px] text-subtle">DEPARTMENTS</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {departments.length === 0 && (
          <p className="p-3.5 text-[12.5px] text-subtle">No departments yet. Add the first one to begin.</p>
        )}
        {departments.map((d) => {
          const classCount = classes.filter((c) => c.department_id === d.id).length;
          const active = d.id === selectedId;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              className={cn(
                "mb-0.5 flex w-full items-center gap-2.5 rounded-input px-2.5 py-2.5 text-left",
                active ? "bg-accent-100" : "hover:bg-surface-tint",
              )}
            >
              <span
                className={cn(
                  "shrink-0 rounded-[4px] px-1.5 py-[3px] font-mono text-[10px] font-bold",
                  active ? "bg-accent-200 text-primary" : "bg-surface-tint text-muted",
                )}
              >
                {d.code}
              </span>
              <div className="min-w-0">
                <div className={cn("truncate text-[13px]", active ? "font-bold text-primary" : "font-semibold text-ink")}>
                  {d.name}
                </div>
                <div className="mt-0.5 text-[10.5px] text-subtle">
                  {classCount} {classCount === 1 ? "class" : "classes"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {onAdd && (
        <div className="border-t border-divider p-2.5">
          <Button variant="secondary" className="flex w-full items-center justify-center gap-1.5" onClick={onAdd}>
            <Icon name="add" size={16} /> Add department
          </Button>
        </div>
      )}
    </aside>
  );
}
