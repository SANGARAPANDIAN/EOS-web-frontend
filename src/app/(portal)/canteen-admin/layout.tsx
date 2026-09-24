import { RequireRole } from "@/components/auth/RequireRole";
import { CanteenAdminShell } from "@/modules/canteen-admin/CanteenAdminShell";

export default function CanteenAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["canteen_admin"]}>
      <CanteenAdminShell>{children}</CanteenAdminShell>
    </RequireRole>
  );
}
