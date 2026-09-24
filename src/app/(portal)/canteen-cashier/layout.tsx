import { RequireRole } from "@/components/auth/RequireRole";
import { CanteenCashierShell } from "@/modules/canteen-cashier/CanteenCashierShell";

export default function CanteenCashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["canteen_cashier"]}>
      <CanteenCashierShell>{children}</CanteenCashierShell>
    </RequireRole>
  );
}
