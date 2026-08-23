import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";
import { PlacementShell } from "@/modules/placement/components/PlacementShell";

export default function PlacementLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PlacementShell>{children}</PlacementShell>
    </ToastProvider>
  );
}
