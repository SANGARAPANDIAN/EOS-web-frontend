import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

/**
 * Uploads a certificate file via the existing shared attachments endpoint
 * (same Supabase Storage plumbing the EDC documents feature and
 * announcements attachments already use — IQAC already has role access to
 * it). apiClient.post() doesn't support FormData, so this does a plain
 * fetch with the same auth header apiClient injects.
 */
export async function uploadIqacCertificateFile(file: File): Promise<{ file_key: string; file_name: string; url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL.replace(/\/+$/, "")}/announcements/attachments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? "Upload failed");
  return json.data;
}

export interface PublicationVenueRow {
  venue: string;
  papers: number;
  citations: number;
  department_codes: string[];
}

/** GET /me/iqac/faculty-development/publications/venues?indexing= — real, computed venue rollup, optionally scoped to one real indexing value. */
export function useLeadingPublicationVenues(indexing?: string) {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "publications", "venues", indexing],
    queryFn: () => apiClient.get<PublicationVenueRow[]>("/me/iqac/faculty-development/publications/venues", { indexing: indexing || undefined }),
  });
}

/** GET /me/iqac/faculty-development/publications/indexing-options — every distinct real indexing value on file (empty until the additive column exists). */
export function useIndexingOptions() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "publications", "indexing-options"],
    queryFn: () => apiClient.get<string[]>("/me/iqac/faculty-development/publications/indexing-options"),
  });
}

export interface PublicationsQuality {
  this_year: number;
  last_year: number;
  target: number | null;
  attainment: number | null;
}

/** GET /me/iqac/faculty-development/publications/quality — This/Last calendar year real paper counts, target/attainment from iqac_metric_targets. */
export function usePublicationsQuality() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "publications", "quality"],
    queryFn: () => apiClient.get<PublicationsQuality>("/me/iqac/faculty-development/publications/quality"),
  });
}

export interface PublicationDepartmentRow {
  department: { id: number; name: string; code: string };
  papers: number;
  citations: number;
}

/** GET /me/iqac/faculty-development/publications/departments — department-wise rollup for the Publications page. */
export function usePublicationDepartments() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "publications", "departments"],
    queryFn: () => apiClient.get<PublicationDepartmentRow[]>("/me/iqac/faculty-development/publications/departments"),
  });
}

export interface VenuePublicationRow {
  id: number;
  title: string;
  type: string;
  year: number | null;
  doi: string | null;
  citation_count: number;
  author: { faculty_id: number; name: string; department_code: string | null };
}

export function useVenuePublications(venue: string | null) {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "publications", "venues", venue],
    queryFn: () => apiClient.get<VenuePublicationRow[]>(`/me/iqac/faculty-development/publications/venues/${encodeURIComponent(venue!)}`),
    enabled: !!venue,
  });
}

export interface CreatePublicationInput {
  faculty_id: number;
  title: string;
  type: string;
  year?: number;
  venue?: string;
  doi?: string;
  citation_count?: number;
}

/** POST /me/iqac/faculty-development/publications — real faculty_publications insert, backs the "+ Add faculty entry" action. */
export function useCreatePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePublicationInput) => apiClient.post("/me/iqac/faculty-development/publications", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "publications"] });
    },
  });
}

export interface AddPublicationEntryInput {
  faculty_id: number;
  title: string;
  venue?: string;
  author_role?: "first_author" | "co_author" | "corresponding_author";
  indexing?: string;
  /** Real once the additive published_date column exists — silently dropped server-side until then. */
  published_date?: string;
  status?: "published" | "accepted" | "under_review" | "submitted";
}

/** POST /me/iqac/faculty-development/publications/entries — real faculty_publications insert + the richer "Add faculty entry" fields in one call. */
export function useAddPublicationEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPublicationEntryInput) => apiClient.post("/me/iqac/faculty-development/publications/entries", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "publications"] });
    },
  });
}

export interface UpdatePublicationEntryInput {
  title?: string;
  venue?: string;
  author_role?: "first_author" | "co_author" | "corresponding_author";
  indexing?: string;
  published_date?: string;
  status?: "published" | "accepted" | "under_review" | "submitted";
  citation_count?: number;
}

/** PATCH /me/iqac/faculty-development/publications/:id — real faculty_publications update. */
export function useUpdatePublicationEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePublicationEntryInput }) =>
      apiClient.patch(`/me/iqac/faculty-development/publications/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "publications"] });
    },
  });
}

/** DELETE /me/iqac/faculty-development/publications/:id */
export function useDeletePublicationEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/iqac/faculty-development/publications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "publications"] });
    },
  });
}

export interface FacultySummary {
  id: number;
  name: string;
  staff_code: string | null;
  designation: string;
  department: { id: number; code: string; name: string } | null;
}

export interface FacultyQualityMetric {
  this_year: number;
  last_year: number;
  target: number | null;
  attainment: number | null;
}

export interface DevelopmentProgramRow {
  id: number;
  faculty: FacultySummary;
  programme_name: string;
  host_agency: string | null;
  duration: string | null;
  attended_on: string | null;
  status: string;
}

/** GET /me/iqac/faculty-development/fdp/quality */
export function useFdpQuality() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "fdp", "quality"],
    queryFn: () => apiClient.get<FacultyQualityMetric>("/me/iqac/faculty-development/fdp/quality"),
  });
}

/** GET /me/iqac/faculty-development/fdp?department_id= — real faculty_development_programs rows (program_type='fdp'). */
export function useFdp(departmentId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "fdp", departmentId],
    queryFn: () => apiClient.get<DevelopmentProgramRow[]>("/me/iqac/faculty-development/fdp", { department_id: departmentId ?? undefined }),
  });
}

export interface AddDevelopmentProgramEntryInput {
  faculty_id: number;
  programme_name: string;
  host_agency?: string;
  duration?: string;
  attended_on?: string;
  status?: "registered" | "attended" | "completed";
}

/** POST /me/iqac/faculty-development/fdp — real faculty_development_programs insert (program_type='fdp'). */
export function useAddFdpEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddDevelopmentProgramEntryInput) => apiClient.post("/me/iqac/faculty-development/fdp", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "fdp"] });
    },
  });
}

export type UpdateDevelopmentProgramEntryInput = Partial<Omit<AddDevelopmentProgramEntryInput, "faculty_id">>;

/** PATCH /me/iqac/faculty-development/fdp/:id — real faculty_development_programs update. */
export function useUpdateFdpEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateDevelopmentProgramEntryInput }) =>
      apiClient.patch(`/me/iqac/faculty-development/fdp/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "fdp"] });
    },
  });
}

/** DELETE /me/iqac/faculty-development/fdp/:id */
export function useDeleteFdpEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/iqac/faculty-development/fdp/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "fdp"] });
    },
  });
}

/** GET /me/iqac/faculty-development/sttp/quality */
export function useSttpQuality() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "sttp", "quality"],
    queryFn: () => apiClient.get<FacultyQualityMetric>("/me/iqac/faculty-development/sttp/quality"),
  });
}

/** GET /me/iqac/faculty-development/sttp?department_id= — real faculty_development_programs rows (program_type='sttp'). */
export function useSttp(departmentId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "sttp", departmentId],
    queryFn: () => apiClient.get<DevelopmentProgramRow[]>("/me/iqac/faculty-development/sttp", { department_id: departmentId ?? undefined }),
  });
}

/** POST /me/iqac/faculty-development/sttp — real faculty_development_programs insert (program_type='sttp'). */
export function useAddSttpEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddDevelopmentProgramEntryInput) => apiClient.post("/me/iqac/faculty-development/sttp", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "sttp"] });
    },
  });
}

/** PATCH /me/iqac/faculty-development/sttp/:id — real faculty_development_programs update. */
export function useUpdateSttpEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateDevelopmentProgramEntryInput }) =>
      apiClient.patch(`/me/iqac/faculty-development/sttp/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "sttp"] });
    },
  });
}

/** DELETE /me/iqac/faculty-development/sttp/:id */
export function useDeleteSttpEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/iqac/faculty-development/sttp/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "sttp"] });
    },
  });
}

export interface ResearchRow {
  id: number;
  faculty: FacultySummary;
  centre_name: string;
  focus_area: string | null;
  project_status: string;
  role: string;
  joined_on: string | null;
}

/** GET /me/iqac/faculty-development/research/quality */
export function useResearchQuality() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "research", "quality"],
    queryFn: () => apiClient.get<FacultyQualityMetric>("/me/iqac/faculty-development/research/quality"),
  });
}

/** GET /me/iqac/faculty-development/research?department_id= — real faculty_research_project_members rows. */
export function useResearch(departmentId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "research", departmentId],
    queryFn: () => apiClient.get<ResearchRow[]>("/me/iqac/faculty-development/research", { department_id: departmentId ?? undefined }),
  });
}

export interface AddResearchEntryInput {
  faculty_id: number;
  centre_name: string;
  focus_area?: string;
  role: string;
  joined_on?: string;
}

/** POST /me/iqac/faculty-development/research — finds/creates the real project by centre_name, inserts a real membership row. */
export function useAddResearchEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddResearchEntryInput) => apiClient.post("/me/iqac/faculty-development/research", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "research"] });
    },
  });
}

export interface UpdateResearchEntryInput {
  role?: string;
  joined_on?: string;
  focus_area?: string;
  status?: "ongoing" | "completed";
}

/** PATCH /me/iqac/faculty-development/research/:id — role/joined_on edit the membership; focus_area/status edit the shared project. */
export function useUpdateResearchEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateResearchEntryInput }) =>
      apiClient.patch(`/me/iqac/faculty-development/research/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "research"] });
    },
  });
}

/** DELETE /me/iqac/faculty-development/research/:id — removes just this faculty's membership, not the shared project. */
export function useDeleteResearchEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/iqac/faculty-development/research/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "research"] });
    },
  });
}

export interface PatentRow {
  id: number;
  faculty: FacultySummary;
  title: string;
  stage: string;
  filed_year: number | null;
  stage_date: string | null;
  role: string;
}

/** GET /me/iqac/faculty-development/patents/quality */
export function usePatentsQuality() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "patents", "quality"],
    queryFn: () => apiClient.get<FacultyQualityMetric>("/me/iqac/faculty-development/patents/quality"),
  });
}

/** GET /me/iqac/faculty-development/patents?department_id= — real faculty_patent_inventors rows. */
export function usePatents(departmentId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "patents", departmentId],
    queryFn: () => apiClient.get<PatentRow[]>("/me/iqac/faculty-development/patents", { department_id: departmentId ?? undefined }),
  });
}

export interface AddPatentEntryInput {
  faculty_id: number;
  title: string;
  stage?: "filed" | "published" | "granted";
  filed_year?: number;
  stage_date?: string;
  role: string;
}

/** POST /me/iqac/faculty-development/patents — finds/creates the real patent by title, inserts a real inventorship row. */
export function useAddPatentEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPatentEntryInput) => apiClient.post("/me/iqac/faculty-development/patents", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "patents"] });
    },
  });
}

export interface UpdatePatentEntryInput {
  role?: string;
  title?: string;
  stage?: "filed" | "published" | "granted";
  filed_year?: number;
  stage_date?: string;
}

/** PATCH /me/iqac/faculty-development/patents/:id — role edits the inventorship; title/stage/filed_year/stage_date edit the shared patent. */
export function useUpdatePatentEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePatentEntryInput }) =>
      apiClient.patch(`/me/iqac/faculty-development/patents/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "patents"] });
    },
  });
}

/** DELETE /me/iqac/faculty-development/patents/:id — removes just this faculty's inventorship, not the shared patent. */
export function useDeletePatentEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/iqac/faculty-development/patents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "patents"] });
    },
  });
}

export interface FacultyCertificationRow {
  id: number;
  faculty: FacultySummary;
  platform: string;
  track: string;
  score: string | null;
  completed_on: string | null;
  status: string;
  certificate_url: string | null;
}

/** GET /me/iqac/faculty-development/certifications/quality */
export function useFacultyCertificationsQuality() {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "certifications", "quality"],
    queryFn: () => apiClient.get<FacultyQualityMetric>("/me/iqac/faculty-development/certifications/quality"),
  });
}

/** GET /me/iqac/faculty-development/certifications?department_id= — real faculty_certifications rows. */
export function useFacultyCertifications(departmentId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "faculty-development", "certifications", departmentId],
    queryFn: () => apiClient.get<FacultyCertificationRow[]>("/me/iqac/faculty-development/certifications", { department_id: departmentId ?? undefined }),
  });
}

export interface AddFacultyCertificationEntryInput {
  faculty_id: number;
  platform: string;
  track: string;
  score?: string;
  completed_on?: string;
  status?: "enrolled" | "in_progress" | "completed";
  certificate_url?: string;
}

/** POST /me/iqac/faculty-development/certifications — real faculty_certifications insert. */
export function useAddFacultyCertificationEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddFacultyCertificationEntryInput) => apiClient.post("/me/iqac/faculty-development/certifications", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "certifications"] });
    },
  });
}

/** PATCH /me/iqac/faculty-development/certifications/:id — real faculty_certifications update. */
export function useUpdateFacultyCertificationEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<Omit<AddFacultyCertificationEntryInput, "faculty_id">> }) =>
      apiClient.patch(`/me/iqac/faculty-development/certifications/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "certifications"] });
    },
  });
}

/** DELETE /me/iqac/faculty-development/certifications/:id */
export function useDeleteFacultyCertificationEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/iqac/faculty-development/certifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "faculty-development", "certifications"] });
    },
  });
}
