"use client";

import { QueryProvider } from "@/lib/providers/QueryProvider";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { MessagingSocketProvider } from "@/lib/realtime/MessagingSocketProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <MessagingSocketProvider>{children}</MessagingSocketProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
