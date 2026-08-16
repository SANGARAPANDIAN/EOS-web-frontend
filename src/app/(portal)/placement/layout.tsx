import { PlacementShell } from "@/modules/placement/PlacementShell";
import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";

export default function PlacementLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PlacementShell>{children}</PlacementShell>
    </ToastProvider>
  );
}
