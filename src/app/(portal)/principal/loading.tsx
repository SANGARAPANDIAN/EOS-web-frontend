import { MessageLoading } from "@/components/ui/message-loading";
import { principalColors } from "@/modules/principal/theme";

/**
 * Next.js route-loading boundary — shown in place of `children` in
 * layout.tsx the moment navigation into any /principal/* route starts,
 * before that page's own client component has even mounted. Distinct from
 * the per-widget Skeleton states below it (those cover the page's own data
 * fetches, once the page itself has mounted).
 */
export default function PrincipalRouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <MessageLoading size={32} style={{ color: principalColors.primary }} />
    </div>
  );
}
