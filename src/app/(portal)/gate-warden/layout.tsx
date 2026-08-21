import { RequireRole } from "@/components/auth/RequireRole";
import { GateWardenShell } from "@/modules/gate-warden/GateWardenShell";

export default function GateWardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["gate_warden"]}>
      <GateWardenShell>{children}</GateWardenShell>
    </RequireRole>
  );
}
