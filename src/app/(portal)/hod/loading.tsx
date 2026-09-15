import { MessageLoading } from "@/components/ui/message-loading";

/**
 * Next.js route-loading boundary — shown in place of `children` in
 * layout.tsx the moment navigation into this portal starts, before that
 * page's own client component has even mounted. Distinct from the per-widget
 * Skeleton states inside each page (those cover the page's own data fetches,
 * once the page itself has mounted). Same pattern as principal/loading.tsx.
 */
export default function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-primary">
      <MessageLoading size={32} />
    </div>
  );
}
