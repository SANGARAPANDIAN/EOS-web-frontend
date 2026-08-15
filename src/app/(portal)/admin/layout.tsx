import { AdminShell } from "@/modules/admin/AdminShell";
import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
