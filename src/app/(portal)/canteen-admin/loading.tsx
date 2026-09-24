import { MessageLoading } from "@/components/ui/message-loading";

/**
 * Next.js route-loading boundary — shown in place of `children` in
 * layout.tsx the moment navigation into this portal starts. Same pattern as
 * gate-warden/loading.tsx and principal/loading.tsx.
 */
export default function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-primary">
      <MessageLoading size={32} />
    </div>
  );
}
