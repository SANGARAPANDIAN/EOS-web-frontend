import { ParentShell } from "@/modules/parent/ParentShell";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <ParentShell>{children}</ParentShell>;
}
