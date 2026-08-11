import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MyIdentity {
  role: "student";
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

/** GET /me/my-profile — display identity (name, resume, social links). */
export function useMyIdentity() {
  return useQuery({
    queryKey: ["me", "my-profile"],
    queryFn: () => apiClient.get<MyIdentity>("/me/my-profile"),
  });
}

export interface MyAcademicProfile {
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  course_name: string;
  quota_name: string;
  batch_name: string;
  class_section: string | null;
  student_type: string;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  is_first_graduate: boolean;
  addresses: unknown[];
  identity_marks: unknown[];
  family_details: unknown;
  contacts: unknown[];
}

/** GET /me/profile — core academic profile (register number, course, batch, section). */
export function useMyAcademicProfile() {
  return useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => apiClient.get<MyAcademicProfile>("/me/profile"),
  });
}

export interface AcademicCalendarEvent {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
}

export interface MyAcademicCalendar {
  semester: number | null;
  start_date: string | null;
  end_date: string | null;
  events: AcademicCalendarEvent[];
}

/** GET /me/academic-calendar — current semester number + semester date range + events. */
export function useMyAcademicCalendar() {
  return useQuery({
    queryKey: ["me", "academic-calendar"],
    queryFn: () => apiClient.get<MyAcademicCalendar>("/me/academic-calendar"),
  });
}
