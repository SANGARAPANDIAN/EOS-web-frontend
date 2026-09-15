import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/student-higher-education/
// student-higher-education.{controller,service}.ts — GET /me/higher-education
// (MeHigherEducationController, Student-only). student_higher_education.student_id
// is @unique, so a student has at most one record — null if a Principal/class
// advisor has never added one for them (this is a staff-entered record, the
// student has no self-service create/update here).
export interface MyHigherEducation {
  id: number;
  preferred_course: string;
  preferred_country: string;
  preferred_university: string | null;
  remarks: string | null;
  created_at: string;
  is_scholarship: boolean | null;
  scholarship_name: string | null;
  scholarship_value: number | null;
  admission_status: string | null;
  offer_status: string | null;
  visa_status: string | null;
  intake_term: string | null;
  sop_status: string | null;
  recommendation_status: string | null;
  research_output: string | null;
  internship_details: string | null;
  application_submitted_date: string | null;
  interview_date: string | null;
  funding_source: string | null;
}

export function useMyHigherEducation() {
  return useQuery({
    queryKey: ["student", "higher-education", "mine"],
    queryFn: () => apiClient.get<MyHigherEducation | null>("/me/higher-education"),
  });
}
