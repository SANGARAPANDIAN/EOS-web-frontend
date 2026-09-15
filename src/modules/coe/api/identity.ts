import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// GET /auth/me — src/auth/auth.controller.ts, any authenticated role. It
// does NOT join coe_profiles (confirmed: no route anywhere reads that
// table), so a coe user gets no display name from this — only email and
// their role row. There is no /coe/profile or equivalent, and no "Senior
// COE" role/flag reachable via any API — coe_profiles.is_senior exists in
// the schema but nothing ever reads or writes it.

export interface Me {
  id: number;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  roles: { id: number; name: string; description: string | null } | null;
  faculty: { id: number; first_name: string; last_name: string; designation: string | null } | null;
  students: Record<string, unknown> | null;
}

export function useMe() {
  return useQuery({
    queryKey: ["coe", "me"],
    queryFn: () => apiClient.get<Me>("/auth/me"),
    staleTime: 5 * 60 * 1000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be set well above staleTime — same reference-data reasoning.
    gcTime: 10 * 60 * 1000,
  });
}
