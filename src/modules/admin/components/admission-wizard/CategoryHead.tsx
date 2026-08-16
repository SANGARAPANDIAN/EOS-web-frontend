import { Icon } from "@/components/ui/Icon";
import type { Category } from "@/modules/admin/config/admissionWizardSections";
import { CATEGORY_ICONS } from "@/modules/admin/components/admission-wizard/icons";

export function CategoryHead({ category }: { category: Category }) {
  return (
    <div className="flex items-start gap-3 p-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-admin-md bg-admin-tint-strong text-admin-primary">
        <Icon name={CATEGORY_ICONS[category.id] ?? "help"} size={20} />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-admin-ink">{category.label}</h2>
        <p className="mt-0.5 text-sm text-admin-muted">{category.lead}</p>
      </div>
    </div>
  );
}
