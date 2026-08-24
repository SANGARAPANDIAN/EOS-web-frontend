import { FinanceShell } from "@/modules/finance/FinanceShell";
import { RequireRole } from "@/components/auth/RequireRole";

// Role-gated exactly like the Billing module's layout. The real backend role
// is `finance` (ROLES.FINANCE) and every /finance/* endpoint is independently
// guarded server-side too — this gate is the UX half (don't render a portal
// the user can't use), never the security boundary on its own.
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["finance"]}>
      <FinanceShell>{children}</FinanceShell>
    </RequireRole>
  );
}
