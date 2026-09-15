import { RequireAuth } from "@/components/auth/RequireAuth";
import { DynamicPageTitle } from "@/components/layout/DynamicPageTitle";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DynamicPageTitle />
      {children}
    </RequireAuth>
  );
}
