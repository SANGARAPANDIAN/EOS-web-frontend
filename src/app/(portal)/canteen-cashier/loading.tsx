import { MessageLoading } from "@/components/ui/message-loading";

export default function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-primary">
      <MessageLoading size={32} />
    </div>
  );
}
