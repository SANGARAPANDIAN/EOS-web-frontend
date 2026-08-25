import { RequireRole } from "@/components/auth/RequireRole";
import { IqacShell } from "@/modules/iqac/IqacShell";

export default function IqacLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={["iqac"]}>
      <IqacShell>{children}</IqacShell>
    </RequireRole>
  );
}
