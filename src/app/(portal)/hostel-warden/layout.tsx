import { HostelWardenShell } from "@/modules/hostel-warden/HostelWardenShell";

export default function HostelWardenLayout({ children }: { children: React.ReactNode }) {
  return <HostelWardenShell>{children}</HostelWardenShell>;
}
