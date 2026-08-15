import { Icon } from "@/components/ui/Icon";

/** Honest "not written by the backend yet" placeholder for a whole category (Online profiles). */
export function DisabledStub({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-2 rounded-admin-md border border-dashed border-admin-border bg-admin-tint p-4 text-sm text-admin-muted">
      <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-admin-warning-fg" />
      <p>{reason}</p>
    </div>
  );
}
