import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/faculty/class-mentors/class-mentors.{controller,service}.ts
// Exact shapes confirmed by reading ClassMentorsService.

export interface MenteeProfile {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  admission_no: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  student_type: string;
  dayscholar_mode: string | null;
  vehicle_number: string | null;
  nationality: string | null;
  religion: string | null;
  community: string | null;
  caste: string | null;
  mother_tongue: string | null;
  blood_group: string | null;
  is_first_graduate: boolean;
  is_father_exserviceman: boolean;
  exserviceman_info: string | null;
  is_diff_abled: boolean;
  diff_abled_info: string | null;
  course: { id: number; name: string; code: string };
  quota: { id: number; name: string };
  class: { id: number; section: string; department: { id: number; name: string; code: string } } | null;
  batch: { id: number; name: string; start_year: number; end_year: number };
  addresses: { id: number; address_type: string; address_line: string | null; city: string | null; state: string | null; pincode: string | null }[];
  identity_marks: { id: number; mark_number: number; description: string | null }[];
  family_details: {
    father_name: string | null;
    father_qualification: string | null;
    father_occupation: string | null;
    father_annual_income: number | string | null;
    father_email: string | null;
    father_mobile: string | null;
    mother_name: string | null;
    mother_qualification: string | null;
    mother_occupation: string | null;
    mother_annual_income: number | string | null;
    mother_email: string | null;
    mother_mobile: string | null;
  } | null;
  contacts: { student_email1: string | null; student_email2: string | null; student_mobile: string | null } | null;
  profile_links: { resume_url: string | null; linkedin_url: string | null; github_url: string | null; leetcode_url: string | null; hackerrank_url: string | null; codeforces_url: string | null } | null;
  projects: { id: number; title: string; description: string | null }[];
}

/** GET /me/mentees/:student_id/profile */
export function useMenteeProfile(studentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "mentees", studentId, "profile"],
    queryFn: () => apiClient.get<MenteeProfile>(`/me/mentees/${studentId}/profile`),
    enabled: Boolean(studentId),
  });
}

export interface MenteeReport {
  id: number;
  student_id_no: string;
  name: string;
  official_email: string;
  unofficial_email: string | null;
  unofficial_email_alt: string | null;
  student_mobile: string | null;
  father: { name: string | null; mobile: string | null; email: string | null };
  mother: { name: string | null; mobile: string | null; email: string | null };
  aadhar_number: string | null;
  pan_number: string | null;
}

/** GET /me/mentees/:student_id/report — sensitive: Aadhar/PAN included. */
export function useMenteeReport(studentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "mentees", studentId, "report"],
    queryFn: () => apiClient.get<MenteeReport>(`/me/mentees/${studentId}/report`),
    enabled: false, // fetched on demand only (e.g. "Print profile"), not eagerly
  });
}

export interface MenteeDocument {
  certificate_type_id: number;
  name: string;
  is_available: boolean;
  file_url: string | null;
  verified_at: string | null;
}

/** GET /me/mentees/:student_id/documents — real student_certificates rows
 * (admin-set is_available/file_url/verified_at), added this session; the
 * table existed with zero endpoints reading it anywhere before. */
export function useMenteeDocuments(studentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "mentees", studentId, "documents"],
    queryFn: () => apiClient.get<MenteeDocument[]>(`/me/mentees/${studentId}/documents`),
    enabled: Boolean(studentId),
  });
}

export interface MenteePlacement {
  drive_id: number;
  company_name: string | null;
  is_disclosed: boolean;
  scheduled_date: string;
  application_status: string;
  updated_at: string;
}

/** GET /me/mentees/:student_id/placements */
export function useMenteePlacements(studentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "mentees", studentId, "placements"],
    queryFn: () => apiClient.get<MenteePlacement[]>(`/me/mentees/${studentId}/placements`),
    enabled: Boolean(studentId),
  });
}
