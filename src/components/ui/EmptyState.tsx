import { cn } from "@/lib/utils/cn";

export function EmptyState({ message, className }: { message: string; className?: string }) {
  return <div className={cn("py-5 text-[13px] text-subtle", className)}>{message}</div>;
}
