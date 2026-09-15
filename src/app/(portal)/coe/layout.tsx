import { CoeShell } from "@/modules/coe/CoeShell";
import { RequireRole } from "@/components/auth/RequireRole";

export default function CoeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["coe"]}>
      <CoeShell>{children}</CoeShell>
    </RequireRole>
  );
}
