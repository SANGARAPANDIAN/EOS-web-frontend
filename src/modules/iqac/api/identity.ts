import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MyIdentity {
  id: number;
  email: string;
  name: string;
}

/** GET /auth/me */
export function useMyIdentity() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<MyIdentity>("/auth/me"),
    staleTime: 5 * 60_000,
  });
}
