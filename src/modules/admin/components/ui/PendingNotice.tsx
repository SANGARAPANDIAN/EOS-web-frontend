import { Icon } from "@/components/ui/Icon";

/** Marks a chart/table that has no real data source yet — never fabricated. */
export function PendingNotice({ reason, height }: { reason: string; height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-admin-lg border border-dashed border-admin-border bg-admin-tint/60 px-4 text-center"
      style={{ minHeight: height ?? 140 }}
    >
      <Icon name="warning" size={20} className="text-admin-border-hover" />
      <p className="max-w-sm text-xs leading-relaxed text-admin-subtle">{reason}</p>
    </div>
  );
}
