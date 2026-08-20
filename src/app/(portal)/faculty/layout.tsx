import { AdvisorShell } from "@/modules/advisor/AdvisorShell";

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return <AdvisorShell>{children}</AdvisorShell>;
}
