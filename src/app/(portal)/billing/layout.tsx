import { BillingShell } from "@/modules/billing/BillingShell";
import { RequireRole } from "@/components/auth/RequireRole";

// The Billing design source ("Billing Module - Web/Billing Admin.dc.html",
// line 15) sets `body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif }`
// — matches the app-wide root layout font already, so no local font override
// needed (unlike Secretary's Poppins override).
//
// Role-gated (same pattern as the EDC module's layout.tsx) — the real
// backend role is `billing` (ROLES.BILLING, roles.id=24, a real seeded
// account already exists: billing@eos.test). Without this gate, any
// authenticated role (e.g. Secretary) could reach every Billing screen
// just by typing the URL — that was the exact bug reported.
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["billing"]}>
      <BillingShell>{children}</BillingShell>
    </RequireRole>
  );
}
