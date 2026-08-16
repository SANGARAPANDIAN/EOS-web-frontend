import { SportsAdminShell } from "@/modules/sports-admin/SportsAdminShell";

export default function SportsAdminLayout({ children }: { children: React.ReactNode }) {
  return <SportsAdminShell>{children}</SportsAdminShell>;
}
