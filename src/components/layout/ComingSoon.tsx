import { Card, EmptyState } from "@/components/ui";

/** Placeholder for HoD sidebar sections not yet built — keeps every nav link real (no 404s) without faking functionality. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{title}</h1>
      <Card>
        <EmptyState message="This section is coming soon." />
      </Card>
    </div>
  );
}
