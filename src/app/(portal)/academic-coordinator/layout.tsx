import { ToastProvider } from "@/modules/admin/components/ui/ToastProvider";
import { AcademicCoordinatorShell } from "@/modules/academic-coordinator/components/AcademicCoordinatorShell";
import { AcademicCoordinatorBatchBar } from "@/modules/academic-coordinator/components/AcademicCoordinatorBatchBar";

export default function AcademicCoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AcademicCoordinatorShell>
        <AcademicCoordinatorBatchBar />
        {children}
      </AcademicCoordinatorShell>
    </ToastProvider>
  );
}
