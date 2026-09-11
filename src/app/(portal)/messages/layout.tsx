import { MessagesShell } from "@/modules/messaging/MessagesShell";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <MessagesShell>{children}</MessagesShell>;
}
