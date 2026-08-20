import { LibraryShell } from "@/modules/library/LibraryShell";
import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <LibraryShell>{children}</LibraryShell>
    </ToastProvider>
  );
}
