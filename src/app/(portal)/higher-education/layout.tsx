import { HigherEducationShell } from "@/modules/higher-education/HigherEducationShell";

export default function HigherEducationLayout({ children }: { children: React.ReactNode }) {
  return <HigherEducationShell>{children}</HigherEducationShell>;
}
