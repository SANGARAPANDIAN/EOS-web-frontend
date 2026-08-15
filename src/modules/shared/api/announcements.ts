import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Announcement {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience: string;
  category: string | null;
  batch_id: number | null;
  department_id: number | null;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  status: string;
  class_ids: number[];
  role_ids: number[];
  /** Only populated by GET /announcements and GET /announcements/:id (the student-facing reads). */
  posted_by?: { name: string; role: string; designation: string | null; department: string | null };
  /** Human-readable labels for class_ids/role_ids (e.g. "CSE-A", "hod") — resolved server-side. */
  class_labels?: string[];
  role_labels?: string[];
}

/** GET /announcements — visibility-filtered server-side by the caller's role/class/department. */
export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiClient.get<Announcement[]>("/announcements"),
  });
}
