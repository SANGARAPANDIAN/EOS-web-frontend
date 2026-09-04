import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type SoaStatus = "applied" | "fees_paid" | "admission_confirmed" | "cancelled";

export interface SoaApplication {
  id: number;
  first_name: string;
  last_name: string | null;
  status: SoaStatus;
  created_at: string;
}

export interface CreateSoaApplicationInput {
  first_name: string;
  last_name?: string;
  father_name?: string;
  mother_name?: string;
  parent_contact?: string;
  student_contact?: string;
  student_whatsapp?: string;
  student_email?: string;
  cutoff_physics?: number;
  cutoff_chemistry?: number;
  cutoff_maths?: number;
  community?: string;
}

export interface TransportStage {
  id: number;
  route_id: number;
  stage_name: string;
  sequence_no: number;
  fee_amount: string;
}

export interface HostelRoomType {
  id: number;
  name: string;
}

export interface SensitiveInfoInput {
  aadhar_number?: string;
  pan_number?: string;
}

export interface IdentityMarkInput {
  mark_number: number;
  description?: string;
}

export interface FamilyDetailsInput {
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

export interface PerfectEntryContactsInput {
  student_email1?: string;
  student_email2?: string;
  student_mobile?: string;
}

export interface PerfectEntryAddressInput {
  address_type: "permanent" | "temporary";
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface PerfectEntryCertificateInput {
  certificate_type_id: number;
  is_available: boolean;
  file_url?: string;
}

export interface CreatePerfectEntryInput {
  email: string;
  /** Omit to have the backend auto-generate a random 6-digit numeric code (the wizard's "Auto-generate" toggle). */
  password?: string;
  course_id: number;
  quota_id: number;
  batch_id: number;
  student_id_no: string;
  roll_no?: string;
  register_no?: string;
  admission_no?: string;
  admission_date?: string;
  admission_type?: string;
  joined_academic_year?: string;
  gender?: string;
  date_of_birth?: string;
  student_type: "hosteller" | "dayscholar";
  dayscholar_mode?: "transport" | "own_vehicle";
  vehicle_number?: string;
  transport_stage_id?: number;
  hostel_room_type_id?: number;
  is_first_graduate?: boolean;
  nationality?: string;
  religion?: string;
  community?: string;
  caste?: string;
  mother_tongue?: string;
  blood_group?: string;
  is_father_exserviceman?: boolean;
  exserviceman_info?: string;
  is_diff_abled?: boolean;
  diff_abled_info?: string;
  counselling_order_no?: string;
  counselling_rank_no?: string;
  govt_quota_admission_no?: string;
  joined_through?: string;
  knew_institution_by?: string;
  nominee?: string;
  sensitive_info?: SensitiveInfoInput;
  identity_marks?: IdentityMarkInput[];
  family_details?: FamilyDetailsInput;
  contacts?: PerfectEntryContactsInput;
  addresses?: PerfectEntryAddressInput[];
  photo_url?: string;
  certificates?: PerfectEntryCertificateInput[];
}

export interface CertificateType {
  id: number;
  name: string;
}

export interface UploadedDocument {
  certificate_type_id: number;
  file_url: string;
  preview_url: string;
}

export interface PerfectEntryResult {
  id: number;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  admission_no: string | null;
  soa_application_id: number;
  user_id: number;
  /** The plaintext login password — typed by the admin or auto-generated, either way shown exactly once here (password_hash is one-way). */
  password: string;
  /** Best-effort SMS delivery of the credentials above — `sent: false` is expected until a real provider is configured. */
  sms: { sent: boolean; note: string };
}

export interface SoaApplicationLinkedStudent {
  id: number;
  student_id_no: string;
}

export interface SoaApplicationDraftSummary {
  saved_categories: string[];
  updated_at: string;
}

export interface SoaApplicationDetail extends SoaApplication {
  father_name: string | null;
  mother_name: string | null;
  parent_contact: string | null;
  student_contact: string | null;
  student_whatsapp: string | null;
  student_email: string | null;
  cutoff_physics: string | null;
  cutoff_chemistry: string | null;
  cutoff_maths: string | null;
  community: string | null;
  students: SoaApplicationLinkedStudent | null;
  admission_profile_drafts: SoaApplicationDraftSummary | null;
}

export interface ListSoaApplicationsParams {
  [key: string]: string | number | boolean | undefined | null;
  q?: string;
  status?: SoaStatus;
  has_draft?: boolean;
  /** Filters on created_at, independent of status — see backend DTO doc-comment. */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface SoaApplicationsListResponse {
  data: SoaApplicationDetail[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type UpdateSoaApplicationInput = Partial<CreateSoaApplicationInput>;

export interface ProfileDraft {
  values: Record<string, string>;
  marks: string[];
  saved_categories: string[];
  updated_at: string;
}

export interface SaveProfileDraftInput {
  values: Record<string, string>;
  marks: string[];
  saved_categories: string[];
}

export function useTransportStages(enabled: boolean) {
  return useQuery({
    queryKey: ["transport-stages"],
    queryFn: () => apiClient.get<TransportStage[]>("/transport-stages"),
    staleTime: 5 * 60_000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be set well above staleTime — same reference-data reasoning.
    gcTime: 10 * 60_000,
    enabled,
  });
}

export function useHostelRoomTypes(enabled: boolean) {
  return useQuery({
    queryKey: ["hostel-room-types"],
    queryFn: () => apiClient.get<HostelRoomType[]>("/hostel-room-types"),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled,
  });
}

export function useCertificateTypes(enabled: boolean) {
  return useQuery({
    queryKey: ["certificate-types"],
    queryFn: () => apiClient.get<CertificateType[]>("/certificate-types"),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled,
  });
}

/** Uploads immediately (no students row exists yet at this point in the wizard). */
export function useUploadApplicationPhoto() {
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.uploadFile<{ url: string }>(`/soa-applications/${id}/photo`, formData);
    },
  });
}

export function useUploadApplicationDocument() {
  return useMutation({
    mutationFn: ({ id, certificateTypeId, file }: { id: number; certificateTypeId: number; file: File }) => {
      const formData = new FormData();
      formData.append("certificate_type_id", String(certificateTypeId));
      formData.append("file", file);
      return apiClient.uploadFile<UploadedDocument>(`/soa-applications/${id}/documents`, formData);
    },
  });
}

export function useSoaApplications(params: ListSoaApplicationsParams) {
  return useQuery({
    queryKey: ["soa-applications", "list", params],
    queryFn: () => apiClient.get<SoaApplicationsListResponse>("/soa-applications", params),
    placeholderData: keepPreviousData,
  });
}

export function useSoaApplication(id: number) {
  return useQuery({
    queryKey: ["soa-applications", "detail", id],
    queryFn: () => apiClient.get<SoaApplicationDetail>(`/soa-applications/${id}`),
  });
}

export interface AdmittedCutoffSummary {
  /** (Physics + Chemistry) / 2 + Maths, averaged across admitted students — null if none have all three marks recorded. */
  average_cutoff: number | null;
  admitted_count: number;
  counted_count: number;
}

/** GET /soa-applications/admitted-cutoff-summary — for the admin dashboard's "Average cutoff" card. */
export function useAdmittedCutoffSummary() {
  return useQuery({
    queryKey: ["soa-applications", "admitted-cutoff-summary"],
    queryFn: () => apiClient.get<AdmittedCutoffSummary>("/soa-applications/admitted-cutoff-summary"),
  });
}

export function useCreateSoaApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSoaApplicationInput) => apiClient.post<SoaApplication>("/soa-applications", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["soa-applications", "list"] }),
  });
}

export function useUpdateSoaApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateSoaApplicationInput }) =>
      apiClient.patch<SoaApplicationDetail>(`/soa-applications/${id}`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["soa-applications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["soa-applications", "detail", id] });
    },
  });
}

export function useDeleteSoaApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number; deleted: boolean }>(`/soa-applications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["soa-applications", "list"] }),
  });
}

export function useUpdateSoaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: SoaStatus }) =>
      apiClient.patch<SoaApplication>(`/soa-applications/${id}/status`, { status }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["soa-applications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["soa-applications", "detail", id] });
    },
  });
}

/** Loaded once on the Complete Profile wizard's mount. `enabled` gates it on having a real applicationId. */
export function useProfileDraft(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["soa-applications", "draft", id],
    queryFn: () => apiClient.get<ProfileDraft | null>(`/soa-applications/${id}/draft`),
    enabled,
    staleTime: Infinity, // it's this tab's own in-progress edit — never silently refetched out from under the wizard
  });
}

export function useSaveProfileDraft() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SaveProfileDraftInput }) =>
      apiClient.put<ProfileDraft>(`/soa-applications/${id}/draft`, input),
  });
}

export function usePerfectEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CreatePerfectEntryInput }) =>
      apiClient.post<PerfectEntryResult>(`/soa-applications/${id}/perfect-entry`, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["soa-applications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["soa-applications", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["students", "list"] });
    },
  });
}
