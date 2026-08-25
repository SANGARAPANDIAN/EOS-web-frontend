import { EmptyState } from "@/components/ui";

/**
 * For a metric that isn't a "not built yet" gap but a real data-model gap —
 * distinct from ComingSoon, which implies the page just hasn't been wired
 * up. Says plainly what's missing instead of implying it's arriving soon.
 */
export function NotAvailable({ title, subtitle, reason }: { title: string; subtitle: string; reason: string }) {
  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{title}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p>
      </div>
      <div className="rounded-card border border-border-default bg-surface p-5">
        <EmptyState message={reason} />
      </div>
    </div>
  );
}
