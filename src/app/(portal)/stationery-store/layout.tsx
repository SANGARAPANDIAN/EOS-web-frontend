import { StationeryStoreShell } from "@/modules/stationery-store/StationeryStoreShell";
import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";

export default function StationeryStoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <StationeryStoreShell>{children}</StationeryStoreShell>
    </ToastProvider>
  );
}
