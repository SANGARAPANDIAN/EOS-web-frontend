import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MyIdentity {
  role: string;
  name: string;
  id_no: string;
  designation: string;
  department: string | null;
  photo_url: string | null;
  resume_url: string | null;
  work_email: string;
  date_of_joining: string | null;
  reporting_to: string | null;
  social_links: { id: number; title: string; url: string }[];
}

/**
 * GET /me/my-profile — falls back to the account email if this Principal
 * account has no linked faculty row yet (FACULTY_NOT_FOUND), which the
 * shell renders as an honest "no profile record yet" state rather than
 * crashing the dashboard header.
 */
export function useMyIdentity() {
  return useQuery({
    queryKey: ["me", "my-profile"],
    queryFn: () => apiClient.get<MyIdentity>("/me/my-profile"),
    retry: false,
  });
}
