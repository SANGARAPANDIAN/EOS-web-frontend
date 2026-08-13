import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// GET /me/mentee-higher-education (MeMenteeHigherEducationController) —
// Real-time scoped to the caller's own class_mentors assignment(s) —
// resolved fresh on every call, so a reassignment to a different class
// changes the list on the very next fetch. Field set matches the full
// student_higher_education row (StudentHigherEducationService.findAllForMentor)
// — every field the design's detail view needs that actually exists on the
// backend model. Fields the design shows that have NO backend source at all
// (GRE/IELTS test scores, passport number) are not in this type and are
// omitted in the UI, not invented — see page.tsx.

export interface MenteeHigherEducationRow {
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
  student: { id: number; student_id_no: string; name: string; section: string | null };
}

export function useMenteeHigherEducation() {
  return useQuery({
    queryKey: ["me", "mentee-higher-education"],
    queryFn: () => apiClient.get<MenteeHigherEducationRow[]>("/me/mentee-higher-education"),
  });
}
