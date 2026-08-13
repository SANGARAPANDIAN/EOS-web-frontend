import { EdcShell } from "@/modules/edc/EdcShell";
import { RequireRole } from "@/components/auth/RequireRole";

export default function EdcLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Material Symbols Outlined — this module's icon font, per the design
          reference. Scoped here rather than added to the root layout since
          no other module uses the Outlined variant (Advisor uses hand-drawn
          SVGs, the shared Icon component uses Rounded). */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0&display=swap"
      />
      <RequireRole allow={["edc_coordinator"]}>
        <EdcShell>{children}</EdcShell>
      </RequireRole>
    </>
  );
}
