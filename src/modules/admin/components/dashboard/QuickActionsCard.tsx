import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/modules/admin/components/ui/SectionCard";

interface QuickAction {
  icon: string;
  label: string;
  note: string;
}

/** Every action here is disabled — none of these flows are wired up yet, so the affordance stays visible but inert rather than silently missing. */
export function QuickActionsCard({ actions }: { actions: QuickAction[] }) {
  return (
    <SectionCard title="Quick actions" bodyClassName="flex flex-col gap-1 p-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled
          title={`${action.label} — module planned`}
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-admin-md px-3 py-2.5 text-left"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-admin-pill bg-admin-tint text-admin-subtle">
            <Icon name={action.icon} size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-admin-subtle">{action.label}</span>
            <span className="block truncate text-xs text-admin-subtle">{action.note}</span>
          </span>
          <Icon name="chevron_right" size={18} className="shrink-0 text-admin-border-hover" />
        </button>
      ))}
    </SectionCard>
  );
}
