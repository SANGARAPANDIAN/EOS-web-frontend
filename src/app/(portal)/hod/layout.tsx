import { HodShell } from "@/modules/hod/HodShell";

export default function HodLayout({ children }: { children: React.ReactNode }) {
  return <HodShell>{children}</HodShell>;
}
