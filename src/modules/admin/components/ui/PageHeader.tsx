import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Large title + muted description + right-aligned action buttons, used at the top of every admin page. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <h1 className="m-0 font-sans text-[30px] font-extrabold tracking-[-.02em] text-admin-ink">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] text-admin-muted">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
