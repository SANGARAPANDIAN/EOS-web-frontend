import { EmptyState } from "@/components/ui";

/** Placeholder for an IQAC page not yet built — the sidebar/shell landed first, pages come next. */
export function ComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{title}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p>
      </div>
      <div className="rounded-card border border-border-default bg-surface p-5">
        <EmptyState message="This page is coming soon." />
      </div>
    </div>
  );
}
