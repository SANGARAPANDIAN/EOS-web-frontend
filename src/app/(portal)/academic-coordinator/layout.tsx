import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";
import { AcademicCoordinatorShell } from "@/modules/academic-coordinator/components/AcademicCoordinatorShell";

export default function AcademicCoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AcademicCoordinatorShell>{children}</AcademicCoordinatorShell>
    </ToastProvider>
  );
}
