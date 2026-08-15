import { TransportShell } from "@/modules/transport/TransportShell";

export default function TransportLayout({ children }: { children: React.ReactNode }) {
  return <TransportShell>{children}</TransportShell>;
}
