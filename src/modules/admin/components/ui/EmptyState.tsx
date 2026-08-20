import { Icon } from "@/components/ui/Icon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon = "search_off", title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5 py-11 text-center">
      <Icon name={icon} size={38} className="text-admin-border-hover" />
      <div className="font-sans text-[17px] font-bold text-admin-ink">{title}</div>
      {description && <div className="text-sm text-admin-muted">{description}</div>}
    </div>
  );
}
