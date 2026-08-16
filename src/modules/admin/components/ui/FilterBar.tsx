import type { ReactNode } from "react";
import { Card } from "@/modules/admin/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface FilterBarProps {
  /** Search input, selects — top row. */
  children: ReactNode;
  /** Pill filter-toggle row, rendered below `children` when present. */
  pills?: ReactNode;
  className?: string;
}

/** Card wrapper for a page's search/select/pill-filter row — students list, faculty list, approvals queue. */
export function FilterBar({ children, pills, className }: FilterBarProps) {
  return (
    <Card hoverable={false} className={cn("flex flex-col gap-3.5 p-4", className)}>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {pills && <div className="flex flex-wrap items-center gap-2.5">{pills}</div>}
    </Card>
  );
}
