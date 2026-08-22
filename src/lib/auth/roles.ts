"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

export interface MyRole {
  id: number;
  name: string;
  description: string | null;
  isPrimary: boolean;
}

/** GET /auth/roles — every role the caller can switch into (primary role + any user_roles grants). */
export function useMyRoles() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["auth", "roles"],
    queryFn: () => apiClient.get<MyRole[]>("/auth/roles"),
    enabled: status === "authenticated",
    staleTime: 60 * 1000,
  });
}
