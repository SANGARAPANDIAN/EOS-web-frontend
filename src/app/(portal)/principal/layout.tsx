import { PrincipalShell } from "@/modules/principal/PrincipalShell";

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return <PrincipalShell>{children}</PrincipalShell>;
}
