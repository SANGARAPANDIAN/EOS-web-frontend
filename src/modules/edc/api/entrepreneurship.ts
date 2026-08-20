import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/student-entrepreneurship/
// student-entrepreneurship.{controller,service}.ts — GET /me/edc-entrepreneurship
// (MeEdcEntrepreneurshipController, EDC_COORDINATOR-only), added this
// session. Institution-wide, every real student_entrepreneurship row,
// resolved fresh on every request (no caching of the row set).
//
// "Startups" is NOT a separate backend concept — there is no
// ventures/startups table anywhere in the schema. It's the same rows as
// "EDC Students", filtered to ventures beyond idea stage (see
// isBeyondIdeaStage below) — same derivation the Startups page itself does
// client-side.

export interface EdcEntrepreneurshipRow {
  id: number;
  mentor_faculty_name: string | null;
  business_name: string;
  business_description: string | null;
  sector: string | null;
  stage: string | null;
  funding_required: number | null;
  remarks: string | null;
  created_at: string;
  is_incubated: boolean | null;
  registration_type: string | null;
  website: string | null;
  venture_logo_url: string | null;
  current_status_note: string | null;
  role: string | null;
  year_started: number | null;
  business_category: string | null;
  problem_statement: string | null;
  location: string | null;
  business_model: string | null;
  target_customers: string | null;
  linkedin_url: string | null;
  co_founders: string | null;
  team_size: number | null;
  student_team_note: string | null;
  mentor_faculty_id: number | null;
  external_mentor_name: string | null;
  external_mentor_org: string | null;
  team_roles_note: string | null;
  idea_developed: boolean | null;
  prototype_developed: boolean | null;
  mvp_launched: boolean | null;
  product_launched: boolean | null;
  customers_count: number | null;
  monthly_revenue: number | null;
  growth_stage: string | null;
  funding_status: string | null;
  funding_received: number | null;
  funding_source: string | null;
  govt_grant_scheme: string | null;
  incubator_support: string | null;
  accelerator_support: string | null;
  student: {
    id: number;
    student_id_no: string;
    name: string;
    section: string | null;
    department: { code: string; name: string } | null;
  };
}

export function useEdcEntrepreneurship() {
  return useQuery({
    queryKey: ["edc", "entrepreneurship"],
    queryFn: () => apiClient.get<EdcEntrepreneurshipRow[]>("/me/edc-entrepreneurship"),
  });
}

export interface StudentSearchResult {
  id: number;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  name: string;
  email: string;
  department: { id: number; name: string; code: string } | null;
  section: string | null;
  batch_name: string | null;
  has_venture: boolean;
  similarity: number;
}

/** GET /me/edc-entrepreneurship/search-students?q= — the "Add Student" search step. */
export function useSearchStudentsForEdc(q: string) {
  return useQuery({
    queryKey: ["edc", "search-students", q],
    queryFn: () => apiClient.get<StudentSearchResult[]>("/me/edc-entrepreneurship/search-students", { q }),
    enabled: q.trim().length >= 2,
  });
}

export interface CreateEdcVentureInput {
  student_id: number;
  business_name: string;
  business_description?: string;
  sector?: string;
  stage?: string;
  funding_required?: number;
  remarks?: string;
  registration_type?: "private_limited" | "llp" | "proprietorship" | "unregistered";
  is_incubated?: boolean;
  role?: string;
  year_started?: number;
  current_status_note?: string;
  business_category?: string;
  problem_statement?: string;
  location?: string;
  business_model?: string;
  target_customers?: string;
  website?: string;
  linkedin_url?: string;
  co_founders?: string;
  team_size?: number;
  student_team_note?: string;
  mentor_faculty_id?: number;
  external_mentor_name?: string;
  external_mentor_org?: string;
  team_roles_note?: string;
  idea_developed?: boolean;
  prototype_developed?: boolean;
  mvp_launched?: boolean;
  product_launched?: boolean;
  customers_count?: number;
  monthly_revenue?: number;
  growth_stage?: string;
  funding_status?: string;
  funding_received?: number;
  funding_source?: string;
  govt_grant_scheme?: string;
  incubator_support?: string;
  accelerator_support?: string;
}

/** POST /me/edc-entrepreneurship — the "Add Student" create step. Real
 * time: updates EDC Students/Startups/sidebar-badge everywhere the moment
 * this succeeds, since they all read the same GET /me/edc-entrepreneurship. */
export function useCreateEdcVenture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEdcVentureInput) => apiClient.post<EdcEntrepreneurshipRow>("/me/edc-entrepreneurship", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "entrepreneurship"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "search-students"] });
    },
  });
}

export type UpdateEdcVentureInput = Partial<CreateEdcVentureInput>;

/** PATCH /me/edc-entrepreneurship/:id — mentor assignment + funding edits
 * (Venture detail / Mentors / Funding screens), added this session. Real
 * time: every screen reading useEdcEntrepreneurship() updates the moment
 * this succeeds, same as create. */
export function useUpdateEdcVenture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateEdcVentureInput }) =>
      apiClient.patch<EdcEntrepreneurshipRow>(`/me/edc-entrepreneurship/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "entrepreneurship"] });
    },
  });
}

/** DELETE /me/edc-entrepreneurship/:id — added this session (no delete
 * endpoint existed at all before). Removes the venture and cascades its
 * incubation record/milestones server-side. */
export function useDeleteEdcVenture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/edc-entrepreneurship/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edc", "entrepreneurship"] });
      queryClient.invalidateQueries({ queryKey: ["edc", "incubations"] });
    },
  });
}

/** GET /me/faculty-directory — minimal student-safe faculty picker
 * (name + department only), reused here for EDC's mentor picker (added
 * EDC_COORDINATOR to this endpoint's @Roles this session — no dedicated
 * "mentor roster" table exists, this IS the real faculty list). */
export interface FacultyDirectoryEntry {
  id: number;
  name: string;
  department_name: string | null;
}

export function useFacultyDirectory() {
  return useQuery({
    queryKey: ["edc", "faculty-directory"],
    queryFn: () => apiClient.get<FacultyDirectoryEntry[]>("/me/faculty-directory"),
  });
}

/** A venture counts as a "startup" (beyond idea stage) once any real
 * progress flag is true, or it has a legal registration — no single
 * "stage" enum exists on the backend to check instead (the free-text
 * `stage`/`growth_stage` columns are unreliable — see the one real seeded
 * row, which has stage:"Idea" despite registration_type:"private_limited"). */
export function isBeyondIdeaStage(row: EdcEntrepreneurshipRow): boolean {
  return Boolean(
    row.prototype_developed || row.mvp_launched || row.product_launched || (row.registration_type && row.registration_type !== "unregistered"),
  );
}
