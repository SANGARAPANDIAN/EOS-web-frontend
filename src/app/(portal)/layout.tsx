import { RequireAuth } from "@/components/auth/RequireAuth";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
