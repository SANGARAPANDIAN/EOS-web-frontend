import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodStudentProfile {
  student: {
    id: number;
    name: string | null;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    admission_no: string | null;
    department_name: string | null;
    department_code: string | null;
    programme: string | null;
    section: string | null;
    semester: number | null;
    year_label: string | null;
    batch_label: string | null;
    admission_type: string | null;
    admission_date: string | null;
    date_of_birth: string | null;
    gender: string | null;
    blood_group: string | null;
    mother_tongue: string | null;
    community: string | null;
    quota_name: string | null;
    is_first_graduate: boolean;
    residence: { type: "day_scholar" | "hosteller"; mode: string | null } | null;
    institute_email: string;
    personal_email: string | null;
    mobile: string | null;
    photo_url: string | null;
    aadhaar_masked: string | null;
    passport_number: string | null;
    passport_valid_until: string | null;
  };
  stats: {
    attendance_percent: number | null;
    cgpa: number | null;
    percentage: number | null;
    arrears: number;
  };
  advisor: { name: string; designation: string } | null;
  mentor: { name: string; designation: string } | null;
  addresses: {
    permanent: { address_line: string | null; city: string | null; district: string | null; state: string | null; pincode: string | null } | null;
    communication: { address_line: string | null; city: string | null; district: string | null; state: string | null; pincode: string | null } | null;
  };
  family: {
    father: { name: string; occupation: string | null; mobile: string | null; email: string | null; photo_url: string | null; annual_income: number | null } | null;
    mother: { name: string; occupation: string | null; mobile: string | null; email: string | null; photo_url: string | null; annual_income: number | null } | null;
  } | null;
  guardian: { relation: "father" | "mother"; name: string; mobile: string | null; email: string | null } | null;
  entrance_cutoff: { physics: number | null; chemistry: number | null; maths: number | null } | null;
  certificates: { id: number; name: string; is_available: boolean; verified_at: string | null; file_url: string | null }[];
  semester_wise_gpa: { semester: number; gpa: number | null; credits_earned: number; arrears: number }[];
  monthly_attendance: { month: string; percent: number }[];
  current_semester_subjects: {
    subject_id: number;
    name: string;
    code: string;
    internal_obtained: number | null;
    internal_max: number | null;
    external_obtained: number | null;
    external_max: number | null;
    total_percent: number | null;
    grade: string | null;
    attendance_percent: number | null;
  }[];
  fees: { status: "paid" | "partial" | "pending"; total: number; paid: number; due: number };
  placement_status: "placed" | "in_process" | "unplaced";
}

/** GET /hod/class-records/student/:id */
export function useHodStudentProfile(studentId: number | null) {
  return useQuery({
    queryKey: ["hod", "class-records", "student", studentId],
    queryFn: () => apiClient.get<HodStudentProfile>(`/hod/class-records/student/${studentId}`),
    enabled: studentId !== null,
  });
}

export interface HodMeetingNote {
  id: number;
  meeting_date: string;
  note: string;
  recorded_by: string | null;
  created_at: string;
}

/** GET /hod/class-records/student/:id/meeting-notes */
export function useHodMeetingNotes(studentId: number | null) {
  return useQuery({
    queryKey: ["hod", "class-records", "student", studentId, "meeting-notes"],
    queryFn: () =>
      apiClient.get<HodMeetingNote[]>(`/hod/class-records/student/${studentId}/meeting-notes`),
    enabled: studentId !== null,
  });
}

export interface AddMeetingNoteInput {
  meeting_date: string;
  note: string;
}

/** POST /hod/class-records/student/:id/meeting-notes */
export function useAddHodMeetingNote(studentId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddMeetingNoteInput) =>
      apiClient.post(`/hod/class-records/student/${studentId}/meeting-notes`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hod", "class-records", "student", studentId, "meeting-notes"],
      });
    },
  });
}
