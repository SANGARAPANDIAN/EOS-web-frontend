import { RequireRole } from "@/components/auth/RequireRole";
import { HrShell } from "@/modules/hr/HrShell";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["hr_payroll"]}>
      <HrShell>{children}</HrShell>
    </RequireRole>
  );
}
