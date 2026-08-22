import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MyIdentity {
  id: number;
  email: string;
  name: string;
}

/** GET /auth/me — media_room@eos.test has no staff profile row, so `name` falls back to the email. */
export function useMyIdentity() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<MyIdentity>("/auth/me"),
    staleTime: 5 * 60_000,
  });
}
