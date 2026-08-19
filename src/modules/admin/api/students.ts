import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface StudentListItem {
  id: number;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  admission_no: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  student_type: "hosteller" | "dayscholar";
  dayscholar_mode: "transport" | "own_vehicle" | null;
  status: "active" | "inactive";
  admission_date: string | null;
  created_at: string;
  photo_url: string | null;
  photo_uploaded_at: string | null;
  batch: { id: number; name: string } | null;
  class: { id: number; section: string; current_semester: number | null } | null;
  course: { id: number; name: string; code: string } | null;
  department: { id: number; name: string } | null;
  quota: { id: number; name: string } | null;
}

export interface StudentAddress {
  address_type: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

/**
 * GET /students/:id/edit-profile — mirrors the backend's AdminUpdateStudentDto
 * field list (current value of every field the edit form can write), plus
 * `addresses` for the Addresses section.
 */
export interface StudentEditProfile {
  // Not students columns at all — first_name/last_name live on the linked
  // soa_applications row, contacts/family/identity_marks on their own
  // tables — but bundled into this same read so the edit modal only needs
  // one fetch to hydrate every field it can write, across however many
  // separate PATCH endpoints saving them actually takes (see
  // UpdateStudentProfileInput's own comment for which ones use which).
  first_name: string | null;
  last_name: string | null;
  contacts: { student_email1: string | null; student_email2: string | null; student_mobile: string | null } | null;
  family: StudentFamily | null;
  identity_marks: Array<{ mark_number: number; description: string | null }>;
  roll_no: string | null;
  register_no: string | null;
  admission_no: string | null;
  admission_date: string | null;
  admission_type: string | null;
  joined_academic_year: string | null;
  gender: string | null;
  date_of_birth: string | null;
  student_type: "hosteller" | "dayscholar";
  dayscholar_mode: "transport" | "own_vehicle" | null;
  vehicle_number: string | null;
  course_id: number;
  quota_id: number;
  class_id: number | null;
  batch_id: number;
  status: "active" | "inactive";
  is_first_graduate: boolean;
  nationality: string | null;
  religion: string | null;
  community: string | null;
  caste: string | null;
  mother_tongue: string | null;
  blood_group: string | null;
  is_father_exserviceman: boolean;
  exserviceman_info: string | null;
  is_diff_abled: boolean;
  diff_abled_info: string | null;
  photo_url: string | null;
  addresses: StudentAddress[];
}

// class_id can only be assigned through PATCH /students/:id (there's no way
// to explicitly clear it back to null) — everything else can be omitted
// (unchanged) or overwritten. photo_url and addresses aren't writable
// through this endpoint — photo_url only changes via the dedicated
// photo upload/delete endpoints, addresses via their own PATCH below.
// first_name/last_name DO go through this same PATCH /students/:id despite
// living on soa_applications, not students — see the backend DTO's own
// comment for why. contacts/family/identity_marks each save through their
// own PATCH (updateStudentContacts/Family/IdentityMarks below) since they're
// each a different table with their own upsert-by-student_id shape.
export type UpdateStudentProfileInput = Partial<
  Omit<StudentEditProfile, "class_id" | "photo_url" | "addresses" | "contacts" | "family" | "identity_marks">
> & {
  class_id?: number;
};

export interface UpdateStudentAddressesInput {
  addresses: Array<{
    address_type: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }>;
}

export interface UpdateStudentContactsInput {
  student_email1?: string;
  student_email2?: string;
  student_mobile?: string;
}

export interface UpdateStudentFamilyInput {
  father_name?: string;
  father_qualification?: string;
  father_occupation?: string;
  father_annual_income?: number;
  father_email?: string;
  father_mobile?: string;
  mother_name?: string;
  mother_qualification?: string;
  mother_occupation?: string;
  mother_annual_income?: number;
  mother_email?: string;
  mother_mobile?: string;
}

export interface UpdateStudentIdentityMarksInput {
  identity_marks: Array<{ mark_number: number; description?: string }>;
}

export interface StudentFamily {
  father_name: string | null;
  father_qualification: string | null;
  father_occupation: string | null;
  father_annual_income: string | null;
  father_email: string | null;
  father_mobile: string | null;
  mother_name: string | null;
  mother_qualification: string | null;
  mother_occupation: string | null;
  mother_annual_income: string | null;
  mother_email: string | null;
  mother_mobile: string | null;
}

export interface StudentProfileDetails {
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  course_name: string | null;
  quota_name: string | null;
  batch_name: string | null;
  class_section: string | null;
  student_type: "hosteller" | "dayscholar";
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  is_first_graduate: boolean | null;
  nationality: string | null;
  religion: string | null;
  community: string | null;
  mother_tongue: string | null;
  is_diff_abled: boolean | null;
  addresses: StudentAddress[];
  identity_marks: Array<{ mark_number: number; description: string }>;
  family_details: StudentFamily | null;
  contacts: {
    student_email1: string | null;
    student_email2: string | null;
    student_mobile: string | null;
  } | null;
}

export interface StudentLifecycle {
  application_submitted_at: string | null;
  application_status: string | null;
  admitted_at: string | null;
  current_status: "active" | "inactive";
  alumni_status: string | null;
  alumni_joined_at: string | null;
}

export interface StudentSubject {
  subject_id: number;
  name: string;
  subject_code: string;
  credits: number | null;
  semester: number;
}

export interface StudentExamMark {
  id: number;
  marks_obtained: string | null;
  max_marks: string;
  entered_at: string;
  exam_subject_mapping: {
    id: number;
    exam_id: number;
    subject_id: number;
    exams: { id: number; academic_year: string; semester: number; exam_types: { name: string } | null };
    subjects: { id: number; name: string; subject_code: string };
  };
}

export interface StudentHostelResident {
  id: number;
  hostel: { id: number; name: string; code: string } | null;
  room: { id: number; room_number: string } | null;
  sharing: string | null;
  fee_status: "not_applicable" | "unpaid" | "partially_paid" | "paid";
  allocated_date: string | null;
  current_status: "in_hostel" | "on_leave";
}

export interface StudentPlacementHistoryItem {
  drive_id: number;
  company_name: string;
  scheduled_date: string;
  drive_status: string;
  application_status: string;
}

export interface StudentBorrowRecord {
  id: number;
  book: { id: number; title: string; qr_code: string | null };
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: string;
  is_overdue: boolean;
  days_overdue: number;
  returned_late: boolean;
  fine_amount: number;
  fine_paid: boolean;
}

export interface StudentProjectsResponse {
  student_id: number;
  profile: {
    id: number;
    resume_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    leetcode_url: string | null;
    hackerrank_url: string | null;
    codeforces_url: string | null;
  } | null;
  projects: Array<{
    id: number;
    title: string;
    description: string | null;
    faculty: { id: number; first_name: string; last_name: string } | null;
  }>;
}

export interface StudentAttendanceSummary {
  overall: { total_days: number; present: number; absent: number; percentage: number };
  by_subject: Array<{ subject_id: number; subject_name: string; total: number; present: number; percentage: number }>;
  records: Array<{ attendance_date: string; subject_id: number | null; status: "present" | "absent" }>;
}

export interface StudentAttendanceTerm {
  semester: number;
  from: string;
  to: string;
  working_days: number;
  present: number;
  absent: number;
  percentage: number;
  periods: number[];
  days: Array<{
    date: string;
    subjects: Array<{ subject_id: number | null; subject_name: string; status: "present" | "absent" }>;
    lost: number;
    period_marks: Array<{ period_number: number; subject_name: string | null; status: "present" | "absent" | null }>;
  }>;
  absences: Array<{ date: string; subjects_missed: string[]; lost: number; running_total: number }>;
}

export interface StudentRequestItem {
  type: "leave" | "outing" | "bonafide" | "od";
  id: number;
  label: string;
  from_date: string | null;
  to_date: string | null;
  detail: string | null;
  status: string;
  created_at: string;
}

export interface StudentAnnouncement {
  id: number;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
}

export interface StudentCertificate {
  id: number;
  certificate_type_id: number;
  certificate_name: string;
  is_available: boolean;
  file_url: string | null;
  verified_at: string | null;
}

export interface StudentTransport {
  route: { id: number; name: string } | null;
  boarding_stage: { id: number; stage_name: string; fee_amount: string } | null;
  destination_stage: { id: number; stage_name: string } | null;
}

export interface StudentMedicalVisit {
  id: number;
  visit_date: string;
  reason: string | null;
  diagnosis: string | null;
  treatment_given: string | null;
  referred_to_hospital: boolean;
  attended_by: { name: string; designation: string | null } | null;
}

export interface FeeSummary {
  total_demand: string;
  total_paid: string;
  total_outstanding: string;
  due_status: "paid" | "partial" | "pending";
}

export interface StudentFeeWorkspace {
  student_profile: {
    student_id: number;
    student_name: string | null;
    register_number: string | null;
    admission_no: string | null;
    student_id_no: string;
    programme: string;
    department: string;
    batch: string;
    quota: string;
    gender: string | null;
    status: string;
  };
  fee_summary: FeeSummary;
  demand_summary: Array<{
    student_fee_demand_mapping_id: number;
    fee_structure_name: string;
    academic_year: string;
    semester: number | null;
    total_amount: string;
    paid_amount: string;
    outstanding_amount: string;
    due_status: "paid" | "partial" | "pending";
  }>;
  payment_summary: { payment_count: number; total_paid: string; last_payment_date: string | null };
}

export interface StudentsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentsListResponse {
  data: StudentListItem[];
  meta: StudentsListMeta;
}

export interface ListStudentsParams {
  [key: string]: string | number | boolean | undefined | null;
  page?: number;
  limit?: number;
  q?: string;
  batch_id?: number;
  course_id?: number;
  class_id?: number;
  quota_id?: number;
  department_id?: number;
  status?: "active" | "inactive";
  student_type?: "hosteller" | "dayscholar";
}

interface PaginatedData<T> {
  page: number;
  page_size: number;
  total: number;
  data: T[];
}

export interface ClassMentor {
  id: number;
  class_id: number;
  faculty_id: number;
  academic_year: string;
  assigned_by_user_id: number | null;
  faculty: { id: number; first_name: string; last_name: string; designation: string | null };
}

/** GET /students */
export function useStudents(params: ListStudentsParams) {
  return useQuery({
    queryKey: ["students", "list", params],
    queryFn: () => apiClient.get<StudentsListResponse>("/students", params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Reads only `meta.total` for a given filter — asks the server for a single
 * row (`limit: 1`) instead of pulling every matching student just to count
 * them, so this stays cheap regardless of roll size.
 */
export function useStudentCount(params: ListStudentsParams = {}) {
  return useQuery({
    queryKey: ["students", "count", params],
    queryFn: () => apiClient.get<StudentsListResponse>("/students", { ...params, limit: 1 }),
    select: (res) => res.meta.total,
  });
}

/** GET /students/:id */
export function useStudent(id: number) {
  return useQuery({
    queryKey: ["students", "detail", id],
    queryFn: () => apiClient.get<StudentListItem>(`/students/${id}`),
  });
}

/** GET /fee-payments/students/:id/workspace */
export function useStudentFeeWorkspace(id: number) {
  return useQuery({
    queryKey: ["students", "fee-workspace", id],
    queryFn: () => apiClient.get<StudentFeeWorkspace>(`/fee-payments/students/${id}/workspace`),
  });
}

/** GET /students/:id/edit-profile — loaded only while the Edit profile modal is open. */
export function useStudentEditProfile(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "edit-profile", id],
    queryFn: () => apiClient.get<StudentEditProfile>(`/students/${id}/edit-profile`),
    enabled,
  });
}

/** PATCH /students/:id */
export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStudentProfileInput }) =>
      apiClient.patch<StudentListItem>(`/students/${id}`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["students", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "edit-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "list"] });
    },
  });
}

/** PATCH /students/:id/addresses — upserts by (student_id, address_type); "permanent"/"temporary" only. */
export function useUpdateStudentAddresses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStudentAddressesInput }) =>
      apiClient.patch<{ addresses: StudentAddress[] }>(`/students/${id}/addresses`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["students", "edit-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "profile-details", id] });
    },
  });
}

/** PATCH /students/:id/contacts — upserts by student_id; read on the Personal Information tab via profile-details. */
export function useUpdateStudentContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStudentContactsInput }) =>
      apiClient.patch(`/students/${id}/contacts`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["students", "edit-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "profile-details", id] });
    },
  });
}

/** PATCH /students/:id/family — upserts by student_id; read on the Parents tab via useStudentFamily. */
export function useUpdateStudentFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStudentFamilyInput }) =>
      apiClient.patch<StudentFamily>(`/students/${id}/family`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["students", "edit-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "family", id] });
    },
  });
}

/** PATCH /students/:id/identity-marks — replaces the whole list every save; read on the Identity marks tab via profile-details. */
export function useUpdateStudentIdentityMarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStudentIdentityMarksInput }) =>
      apiClient.patch<Array<{ mark_number: number; description: string | null }>>(`/students/${id}/identity-marks`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["students", "edit-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "profile-details", id] });
    },
  });
}

/** POST /students/:id/photo (multipart) */
export function useUploadStudentPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.uploadFile<{ photo_url: string; photo_uploaded_at: string }>(`/students/${id}/photo`, formData);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["students", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "edit-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "list"] });
    },
  });
}

/** DELETE /students/:id/photo */
export function useDeleteStudentPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ photo_url: string | null; photo_uploaded_at: string | null }>(`/students/${id}/photo`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["students", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "edit-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "list"] });
    },
  });
}

/**
 * POST /students/:id/reset-password — `adminPassword` is the calling admin's
 * own login password, a step-up confirmation the backend checks before doing
 * anything else. Omit `password` to have the server generate one — either
 * way the plaintext comes back once in the response, not cached.
 */
export function useResetStudentPassword() {
  return useMutation({
    mutationFn: ({ id, adminPassword, password }: { id: number; adminPassword: string; password?: string }) =>
      apiClient.post<{ password: string }>(
        `/students/${id}/reset-password`,
        password ? { adminPassword, password } : { adminPassword },
      ),
  });
}

/** All remaining per-section fetches are gated on `enabled` — each section's panel is only
    rendered (and thus mounted) once its rail tab is opened. */

export function useStudentProfileDetails(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "profile-details", id],
    queryFn: () => apiClient.get<StudentProfileDetails>(`/students/${id}/profile-details`),
    enabled,
  });
}

export function useStudentFamily(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "family", id],
    queryFn: () => apiClient.get<StudentFamily | null>(`/students/${id}/family`),
    enabled,
  });
}

export function useStudentLifecycle(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "lifecycle", id],
    queryFn: () => apiClient.get<StudentLifecycle>(`/students/${id}/lifecycle`),
    enabled,
  });
}

export function useStudentSubjects(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "subjects", id],
    queryFn: () => apiClient.get<StudentSubject[]>(`/students/${id}/subjects`),
    enabled,
  });
}

export function useStudentExamMarks(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "exam-marks", id],
    queryFn: () => apiClient.get<StudentExamMark[]>("/exam-marks", { student_id: id }),
    enabled,
  });
}

export function useStudentHostelResident(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "hostel-resident", id],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedData<StudentHostelResident>>("/hostel/residents", { student_id: id });
      return res.data[0] ?? null;
    },
    enabled,
  });
}

export function useStudentPlacementHistory(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "placements", id],
    queryFn: () => apiClient.get<StudentPlacementHistoryItem[]>(`/drives/students/${id}/history`),
    enabled,
  });
}

export function useStudentBorrowRecords(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "borrow-records", id],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedData<StudentBorrowRecord>>("/library/borrow-records", {
        student_id: id,
      });
      return res.data;
    },
    enabled,
  });
}

export function useLibrarySettings(enabled: boolean) {
  return useQuery({
    queryKey: ["library", "settings"],
    queryFn: () => apiClient.get<{ books_per_student: number }>("/library/settings"),
    enabled,
  });
}

export function useStudentProjects(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "projects", id],
    queryFn: () => apiClient.get<StudentProjectsResponse>(`/student-profiles/${id}`),
    enabled,
  });
}

export function useClassMentor(classId: number | null | undefined) {
  return useQuery({
    queryKey: ["classes", "mentor", classId],
    queryFn: async () => {
      const history = await apiClient.get<ClassMentor[]>(`/classes/${classId}/mentor`);
      return history[0] ?? null;
    },
    enabled: classId != null,
  });
}

export function useStudentAttendanceSummary(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "attendance-summary", id],
    queryFn: () => apiClient.get<StudentAttendanceSummary>(`/students/${id}/attendance-summary`),
    enabled,
  });
}

export function useStudentAttendanceBySemester(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "attendance-by-semester", id],
    queryFn: () => apiClient.get<StudentAttendanceTerm[]>(`/students/${id}/attendance-by-semester`),
    enabled,
  });
}

export function useStudentRequests(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "requests", id],
    queryFn: () => apiClient.get<StudentRequestItem[]>(`/students/${id}/requests`),
    enabled,
  });
}

export function useStudentAnnouncements(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "announcements", id],
    queryFn: () => apiClient.get<StudentAnnouncement[]>(`/students/${id}/announcements`),
    enabled,
  });
}

export function useStudentCertificates(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "certificates", id],
    queryFn: () => apiClient.get<StudentCertificate[]>(`/students/${id}/certificates`),
    enabled,
  });
}

/** Upsert-by-(student_id, certificate_type_id) — same POST whether this is the first row for a type or a replacement scan. */
export function useUpsertCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_id: number; certificate_type_id: number; is_available?: boolean; file?: File }) => {
      const formData = new FormData();
      formData.append("student_id", String(input.student_id));
      formData.append("certificate_type_id", String(input.certificate_type_id));
      if (input.is_available !== undefined) formData.append("is_available", String(input.is_available));
      if (input.file) formData.append("file", input.file);
      return apiClient.uploadFile<StudentCertificate>("/certificates", formData);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["students", "certificates", vars.student_id] });
    },
  });
}

export function useVerifyCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ certificateId, verified }: { certificateId: number; verified: boolean; studentId: number }) =>
      apiClient.patch<StudentCertificate>(`/certificates/${certificateId}`, { verified }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["students", "certificates", vars.studentId] });
    },
  });
}

export function useStudentTransport(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "transport", id],
    queryFn: () => apiClient.get<StudentTransport | null>(`/students/${id}/transport`),
    enabled,
  });
}

export function useStudentMedicalVisits(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["students", "medical", id],
    queryFn: () => apiClient.get<StudentMedicalVisit[]>(`/students/${id}/medical`),
    enabled,
  });
}
