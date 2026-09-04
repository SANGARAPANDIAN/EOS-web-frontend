import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface StudentProfileUrls {
  resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  leetcode_url: string | null;
  hackerrank_url: string | null;
  codeforces_url: string | null;
}

export interface StudentProject {
  id: number;
  student_id: number;
  title: string;
  description: string | null;
  mentor_faculty_id: number | null;
  faculty: { id: number; first_name: string; last_name: string } | null;
}

export interface MyPlacementProfile {
  student_id: number;
  profile: StudentProfileUrls | null;
  projects: StudentProject[];
}

/** GET /student-profiles/me */
export function useMyPlacementProfile() {
  return useQuery({
    queryKey: ["student-profiles", "me"],
    queryFn: () => apiClient.get<MyPlacementProfile>("/student-profiles/me"),
  });
}

/** PATCH /student-profiles/me */
export function useUpdatePlacementProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<StudentProfileUrls>) => apiClient.patch("/student-profiles/me", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-profiles", "me"] }),
  });
}

/** POST /student-profiles/me/projects */
export function useAddStudentProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description?: string }) =>
      apiClient.post("/student-profiles/me/projects", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-profiles", "me"] }),
  });
}

/** DELETE /student-profiles/me/projects/:projectId */
export function useRemoveStudentProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => apiClient.delete(`/student-profiles/me/projects/${projectId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-profiles", "me"] }),
  });
}

export interface UpcomingDrive {
  drive_id: number;
  company_name: string;
  company_profile_info: string | null;
  scheduled_date: string;
  is_disclosed: boolean;
  disclosed_reveal_date: string | null;
  job_role: string | null;
  package_lpa: number | null;
  application_status: string;
  last_cleared_round: number | null;
}

/** GET /drives/student/upcoming */
export function useUpcomingDrives() {
  return useQuery({
    queryKey: ["drives", "student", "upcoming"],
    queryFn: () => apiClient.get<UpcomingDrive[]>("/drives/student/upcoming"),
  });
}

export interface PostedDrive {
  drive_id: number;
  company_name: string;
  company_profile_info: string | null;
  scheduled_date: string;
  is_disclosed: boolean;
  disclosed_reveal_date: string | null;
  job_role: string | null;
  package_lpa: number | null;
  eligibility_cgpa: number | null;
  registration_start: string | null;
  registration_end: string | null;
}

/** GET /drives/student/posted — open drives in their registration window, not yet shortlisted/applied for. */
export function usePostedDrives() {
  return useQuery({
    queryKey: ["drives", "student", "posted"],
    queryFn: () => apiClient.get<PostedDrive[]>("/drives/student/posted"),
  });
}

/** POST /drives/student/:id/apply — self-service application; moves the drive from "posted" to "upcoming". */
export function useApplyToDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driveId: number) => apiClient.post(`/drives/student/${driveId}/apply`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drives", "student", "posted"] });
      queryClient.invalidateQueries({ queryKey: ["drives", "student", "upcoming"] });
    },
  });
}

export interface DriveHistoryRow {
  drive_id: number;
  company_name: string;
  scheduled_date: string;
  drive_status: string;
  job_role: string | null;
  package_lpa: number | null;
  application_status: string;
  last_cleared_round: number | null;
}

/** GET /drives/student/history */
export function useDriveHistory() {
  return useQuery({
    queryKey: ["drives", "student", "history"],
    queryFn: () => apiClient.get<DriveHistoryRow[]>("/drives/student/history"),
  });
}
