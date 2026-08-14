import type { ReactNode } from "react";
import { Card } from "@/modules/admin/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

/** Titled panel used for dashboard/analytics chart cards — header row + body. */
export function SectionCard({ title, subtitle, actions, children, bodyClassName }: SectionCardProps) {
  return (
    <Card hoverable={false} className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-admin-divider px-5 py-4">
        <div>
          <h2 className="font-sans text-[15px] font-bold text-admin-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-admin-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}
