import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/fees-billing/{finance-overview,
// fee-payments}/*.{controller,service}.ts — the SAME real backend module
// the Admin finance dashboard already uses. ROLES.BILLING was added to
// every one of these routes' @Roles() this session (was ADMIN-only before).
// `quota`/`class_id` were added to the dashboard row DTO (purely additive,
// existing Admin consumers unaffected) since the Billing Students roster
// and the Announcements audience picker both need them for real.
//
// KNOWN GAPS (confirmed via exhaustive backend audit, not invented):
// no "collected today" figure (only monthly-granularity trend), no
// counter/online/DD collection-mode taxonomy (only the 5 raw
// payment_mode_enum values), no receipts-issued count.
//
// Refunds and Reconciliation were removed entirely per explicit product
// decision — no such feature exists anywhere in this module any more
// (DB tables dropped, backend modules deleted, frontend pages/hooks removed).

export interface ExecutiveKpis {
  totalFeeDemand: string;
  totalCollected: string;
  totalOutstanding: string;
  collectionPercentage: number;
  pendingEducationLoanDD: number;
  activeFeeStructures: number;
}
export interface FinanceOverview {
  executiveKPIs: ExecutiveKpis;
  financialAnalytics: {
    demandVsCollection: { totalDemand: string; totalCollected: string; totalOutstanding: string };
    monthlyCollectionTrend: { month: string; totalCollected: string }[];
    departmentOutstanding: { department: string; totalDemand: string; totalOutstanding: string }[];
    paymentStatusDistribution: { status: "paid" | "partial" | "pending"; count: number }[];
    collectionByPaymentMode: { mode: string; totalAmount: string; count: number }[];
  };
  operationalInsights: {
    recentPayments: { id: number; student_id: number; student_name: string | null; amount_paid: string; payment_date: string; payment_mode: string | null; receipt_no: string }[];
    topOutstandingStudents: { student_id: number; student_name: string | null; register_number: string | null; total_outstanding: string }[];
    concessionSummary: { total_concession_amount: string; count: number; settled_count: number; unsettled_count: number };
    educationLoanDDSummary: { total_amount: string; count: number; received_count: number; cleared_count: number; bounced_count: number };
  };
}

/** GET /finance-overview?batch= — real, institution-wide, or scoped to
 * one real batch when provided. */
export function useFinanceOverview(batch?: string) {
  return useQuery({
    queryKey: ["billing", "finance-overview", batch],
    queryFn: () => apiClient.get<FinanceOverview>(`/finance-overview${batch ? `?batch=${encodeURIComponent(batch)}` : ""}`),
  });
}

/** GET /finance-overview/batches — real batch names with at least one
 * fee-demand student. */
export function useFinanceBatches() {
  return useQuery({
    queryKey: ["billing", "finance-overview", "batches"],
    queryFn: () => apiClient.get<string[]>("/finance-overview/batches"),
  });
}

export interface FeePaymentDashboardRow {
  student_fee_demand_mapping_id: number;
  student_id: number;
  student_name: string | null;
  register_number: string | null;
  programme: string;
  department: string;
  batch: string;
  quota: string;
  class_id: number | null;
  fee_structure_name: string;
  academic_year: string;
  total_demand: string;
  paid_amount: string;
  outstanding_amount: string;
  due_status: "paid" | "partial" | "pending";
  last_payment_date: string | null;
}

/** GET /fee-payments/dashboard — real, one row per demand mapping (a
 * student with 2 fee structures appears twice); grouped client-side into
 * one row per student by the Students page. */
export function useFeePaymentsDashboard() {
  return useQuery({
    queryKey: ["billing", "fee-payments", "dashboard"],
    queryFn: () => apiClient.get<FeePaymentDashboardRow[]>("/fee-payments/dashboard"),
  });
}

export interface StudentWorkspace {
  student_profile: {
    student_id: number;
    student_name: string | null;
    register_number: string | null;
    roll_no: string | null;
    admission_no: string | null;
    student_id_no: string;
    programme: string;
    department: string;
    batch: string;
    quota: string;
    gender: string | null;
    status: string;
  };
  fee_summary: { total_demand: string; total_paid: string; total_outstanding: string; due_status: "paid" | "partial" | "pending" };
  demand_summary: { student_fee_demand_mapping_id: number; fee_structure_id: number; fee_structure_name: string; applies_to: string; academic_year: string; semester: number | null; total_amount: string; paid_amount: string; outstanding_amount: string; due_status: "paid" | "partial" | "pending" }[];
  payment_summary: { payment_count: number; total_paid: string; last_payment_date: string | null };
  payment_history: { id: number; student_fee_demand_mapping_id: number; amount_paid: string; payment_date: string; payment_mode: string | null; receipt_no: string; is_partial: boolean; collected_by_user_id: number | null }[];
  fee_concessions: { id: number; fee_structure_id: number; fee_structure_name: string; concession_amount: string; is_settled: boolean; settled_date: string | null }[];
  education_loan_dd: { id: number; student_fee_demand_mapping_id: number; dd_reference_number: string; bank_name: string; amount: string; status: string; acknowledgement_receipt_no: string | null; received_by_user_id: number | null }[];
}

/** GET /fee-payments/students/:studentId/workspace — real per-student detail. */
export function useStudentWorkspace(studentId: number | undefined) {
  return useQuery({
    queryKey: ["billing", "fee-payments", "workspace", studentId],
    queryFn: () => apiClient.get<StudentWorkspace>(`/fee-payments/students/${studentId}/workspace`),
    enabled: studentId !== undefined,
  });
}

export interface CategoryBreakdownItem {
  fee_structure_item_id: number;
  demand_category_name: string | null;
  original_amount: string;
  already_paid: string;
  outstanding_amount: string;
  status: "paid" | "partial" | "pending";
}

/** GET /student-fee-demand-mappings/:id/category-breakdown — real per-demand-mapping category rows. */
export function useCategoryBreakdown(demandMappingId: number | undefined) {
  return useQuery({
    queryKey: ["billing", "student-fee-demand-mappings", demandMappingId, "category-breakdown"],
    queryFn: () => apiClient.get<CategoryBreakdownItem[]>(`/student-fee-demand-mappings/${demandMappingId}/category-breakdown`),
    enabled: demandMappingId !== undefined,
  });
}

export interface CreateFeePaymentInput {
  fee_structure_item_id: number;
  amount_paid: number;
  // Real payment_mode_enum values (schema.prisma:4726) — note "netbanking",
  // not "net_banking", and "razorpay" exists too but is gateway-only, not
  // a counter-staff-selectable mode.
  payment_mode?: "cash" | "card" | "upi" | "dd" | "netbanking";
}

/** POST /student-fee-demand-mappings/:id/payments — real "receive a
 * payment", category-wise (against one fee_structure_item_id, not a lump
 * sum against the whole demand). receipt_no/is_partial are server-derived. */
export function useCreateFeePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ demandMappingId, input }: { demandMappingId: number; input: CreateFeePaymentInput }) =>
      apiClient.post(`/student-fee-demand-mappings/${demandMappingId}/payments`, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "workspace"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "student-fee-demand-mappings", vars.demandMappingId, "category-breakdown"] });
    },
  });
}

export interface FeePaymentListRow {
  id: number;
  student_fee_demand_mapping_id: number;
  student_id: number;
  student_name: string | null;
  register_number: string | null;
  department: string;
  demand_category_name: string | null;
  fee_structure_name: string | null;
  amount_paid: string;
  payment_date: string;
  payment_mode: string | null;
  receipt_no: string;
  is_partial: boolean;
}

/** GET /fee-payments — real, enriched flat receipt list (one row per
 * fee_payments record), used by the Fee Payments "History" tab and the
 * Receipts page. */
export function useFeePaymentsList() {
  return useQuery({
    queryKey: ["billing", "fee-payments", "list"],
    queryFn: () => apiClient.get<FeePaymentListRow[]>("/fee-payments"),
  });
}

export interface IssueReceiptNumberInput {
  fee_payment_ids: number[];
  print_date: string;
}
export interface IssueReceiptNumberResult {
  id: number;
  print_date: string;
}

/** POST /fee-payments/receipt-numbers — issues exactly one new, real,
 * sequential receipt number (fee_receipt_numbers.id, a DB SERIAL) covering
 * every fee_payment_id in one print action — never the same thing as any
 * individual payment's own receipt_no, and never generated client-side. */
export function useIssueReceiptNumber() {
  return useMutation({
    mutationFn: (input: IssueReceiptNumberInput) =>
      apiClient.post<IssueReceiptNumberResult>("/fee-payments/receipt-numbers", input),
  });
}

export interface DemandCategorySummaryRow {
  category_id: number;
  category_name: string;
  applies_to: string;
  students: number;
  raised: string;
  collected: string;
  balance: string;
}

/** GET /demand-categories/summary — real institution-wide raised/
 * collected/balance per demand category. */
export function useDemandCategorySummary() {
  return useQuery({
    queryKey: ["billing", "demand-categories", "summary"],
    queryFn: () => apiClient.get<DemandCategorySummaryRow[]>("/demand-categories/summary"),
  });
}

/** Groups the flat per-demand-mapping dashboard rows into one row per
 * student (summing demand/paid/outstanding across every fee structure the
 * student has), since the real backend returns one row per mapping. */
export interface BillingStudentRow {
  student_id: number;
  student_name: string;
  register_number: string;
  programme: string;
  department: string;
  batch: string;
  quota: string;
  class_id: number | null;
  fee_structures: string[];
  total_demand: number;
  paid_amount: number;
  outstanding_amount: number;
  due_status: "paid" | "partial" | "pending";
  last_payment_date: string | null;
  demand_mapping_ids: number[];
}
// ─────────────────────────────────────────────────────────────────────────
// Masters/Operations: Quota, Fee Structures, Fee Structure Items,
// Fee Concessions, Education Loan DD.
// Backend reference: EOSbackend1/src/modules/fees-billing/{quota,
// fee-structure,fee-structure-items,fee-concessions,education-loan-dd,
// demand,hostel-room-types,transport-routes,transport-stages}/*.
// ROLES.BILLING was already present on quota/fee-structure/
// fee-structure-items/fee-concessions/education-loan-dd/demand-categories.
// This session ADDED ROLES.BILLING (read-only, alongside each module's
// existing owner roles) to hostel-room-types and transport-routes/
// transport-stages GET endpoints, since without them Billing couldn't read
// the room-type/route/stage names needed to label hostel/transport fee
// structure items — Billing still cannot create/update/delete those
// catalogs, only Admin/Warden/Gate Warden can.
//
// KNOWN GAPS vs the design (confirmed via schema+controller audit, not
// invented): fee_structures only has {name, applies_to (quota|hostel|
// transport), quota_id, academic_year} — no per-item "study year" tag, no
// hostel gender/occupancy/block/mess fields, no bus "distance slab"/route
// grouping beyond the real transport_routes/transport_stages catalog. A fee
// structure holds an array of items (one per demand category / hostel room
// type / transport stage), not the single flat row the fake design assumed,
// so the page below groups items under their parent structure instead.
// fee_concessions belongs to a fee_structure (shared by every student on
// that structure), NOT to one student — there is no per-student concession
// "reason", "category" or pending/approved/rejected workflow anywhere in
// the schema, only a real is_settled boolean + settled_date. The
// Concessions page below reflects that real shape (settle/unsettle a
// structure-level concession) instead of the fake per-student approval
// queue. education_loan_dd's real status enum is
// received/cleared/bounced (no "Deposited").

export interface QuotaRow {
  id: number;
  name: string;
}

/** GET /quotas — real. */
export function useQuotas() {
  return useQuery({
    queryKey: ["billing", "quotas"],
    queryFn: () => apiClient.get<QuotaRow[]>("/quotas"),
  });
}

/** POST /quotas */
export function useCreateQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<QuotaRow>("/quotas", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "quotas"] }),
  });
}

/** PUT /quotas/:id */
export function useUpdateQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => apiClient.put<QuotaRow>(`/quotas/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "quotas"] }),
  });
}

/** DELETE /quotas/:id — 409 QUOTA_IN_USE if referenced by fee_structures or students. */
export function useDeleteQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/quotas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "quotas"] }),
  });
}

export interface DemandCategoryRow {
  id: number;
  name: string;
}

/** GET /demand-categories — real, used to label "quota"-type (education/tuition) fee structure items. */
export function useDemandCategories() {
  return useQuery({
    queryKey: ["billing", "demand-categories"],
    queryFn: () => apiClient.get<DemandCategoryRow[]>("/demand-categories"),
  });
}

export interface HostelRoomTypeRow {
  id: number;
  name: string;
  fee_amount: number | null;
}

/** GET /hostel-room-types — Billing read-only (see gap note above). */
export function useHostelRoomTypes() {
  return useQuery({
    queryKey: ["billing", "hostel-room-types"],
    queryFn: () => apiClient.get<HostelRoomTypeRow[]>("/hostel-room-types"),
  });
}

export interface TransportRouteRow {
  id: number;
  name: string;
  distance_km: string | null;
  boarding_area: string | null;
}

/** GET /transport-routes — Billing read-only (see gap note above). */
export function useTransportRoutes() {
  return useQuery({
    queryKey: ["billing", "transport-routes"],
    queryFn: () => apiClient.get<TransportRouteRow[]>("/transport-routes"),
  });
}

export interface TransportStageRow {
  id: number;
  route_id: number;
  stage_name: string;
  sequence_no: number;
  fee_amount: string;
}

/** GET /transport-stages — Billing read-only (see gap note above). */
export function useTransportStages() {
  return useQuery({
    queryKey: ["billing", "transport-stages"],
    queryFn: () => apiClient.get<TransportStageRow[]>("/transport-stages"),
  });
}

export type FeeStructureAppliesTo = "quota" | "hostel" | "transport";

export interface FeeStructureItemRow {
  id: number;
  fee_structure_id: number;
  demand_category_id: number | null;
  hostel_room_type_id: number | null;
  transport_stage_id: number | null;
  amount: string;
}

export interface FeeConcessionRow {
  id: number;
  fee_structure_id: number;
  concession_amount: string;
  is_settled: boolean;
  settled_date: string | null;
}

export interface FeeStructureRow {
  id: number;
  name: string;
  applies_to: FeeStructureAppliesTo;
  quota_id: number | null;
  academic_year: string;
  created_at: string;
  fee_structure_items: FeeStructureItemRow[];
  fee_concessions: FeeConcessionRow[];
}

/** GET /fee-structures — real, each row includes its own items + concessions. */
export function useFeeStructures() {
  return useQuery({
    queryKey: ["billing", "fee-structures"],
    queryFn: () => apiClient.get<FeeStructureRow[]>("/fee-structures"),
  });
}

export interface CreateFeeStructureItemInput {
  demand_category_id?: number;
  hostel_room_type_id?: number;
  transport_stage_id?: number;
  amount: number;
}

export interface CreateFeeStructureInput {
  name: string;
  applies_to: FeeStructureAppliesTo;
  quota_id?: number;
  academic_year: string;
  items: CreateFeeStructureItemInput[];
}

/** POST /fee-structures */
export function useCreateFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeeStructureInput) => apiClient.post<FeeStructureRow>("/fee-structures", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] }),
  });
}

export interface UpdateFeeStructureInput {
  name: string;
  applies_to: FeeStructureAppliesTo;
  quota_id?: number;
  academic_year: string;
}

/** PUT /fee-structures/:id — simpler than Create: no items array (old-frontend-exact). */
export function useUpdateFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateFeeStructureInput }) =>
      apiClient.put<FeeStructureRow>(`/fee-structures/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] }),
  });
}

/** DELETE /fee-structures/:id — 409 FEE_STRUCTURE_IN_USE if referenced by student mappings. */
export function useDeleteFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/fee-structures/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] }),
  });
}

/** POST /fee-structures/:id/items — add one item to an existing structure. */
export function useCreateFeeStructureItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ feeStructureId, input }: { feeStructureId: number; input: CreateFeeStructureItemInput }) =>
      apiClient.post<FeeStructureItemRow>(`/fee-structures/${feeStructureId}/items`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] }),
  });
}

/** PUT /fee-structure-items/:id — feeStructureId is not editable/sendable on edit (old-frontend-exact). */
export function useUpdateFeeStructureItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => apiClient.put<FeeStructureItemRow>(`/fee-structure-items/${id}`, { amount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] }),
  });
}

/** DELETE /fee-structure-items/:id */
export function useDeleteFeeStructureItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/fee-structure-items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] }),
  });
}

/** GET /fee-concessions — real, bare flat list (no student — see gap note above). */
export function useFeeConcessions() {
  return useQuery({
    queryKey: ["billing", "fee-concessions"],
    queryFn: () => apiClient.get<FeeConcessionRow[]>("/fee-concessions"),
  });
}

/** GET /fee-structures/:id/concessions — real, scoped to one fee structure
 * (matches the old frontend's FeeConcessionsPanel — never the flat global
 * list for a per-student/per-structure view). */
export function useConcessionsByStructure(feeStructureId: number | undefined) {
  return useQuery({
    queryKey: ["billing", "fee-structures", feeStructureId, "concessions"],
    queryFn: () => apiClient.get<FeeConcessionRow[]>(`/fee-structures/${feeStructureId}/concessions`),
    enabled: feeStructureId !== undefined,
  });
}

export interface CreateConcessionInput {
  concession_amount: number;
}

/** POST /fee-structures/:id/concessions — concession_amount is the ONLY
 * body field Create accepts (is_settled/settled_date have no write path
 * here — old-frontend-exact). */
export function useCreateConcession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ feeStructureId, input }: { feeStructureId: number; input: CreateConcessionInput }) =>
      apiClient.post<FeeConcessionRow>(`/fee-structures/${feeStructureId}/concessions`, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures", vars.feeStructureId, "concessions"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "workspace"] });
    },
  });
}

export interface UpdateFeeConcessionInput {
  concession_amount: number;
  is_settled?: boolean;
  settled_date?: string | null;
}

/** PATCH /fee-concessions/:id */
export function useUpdateFeeConcession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateFeeConcessionInput }) =>
      apiClient.patch(`/fee-concessions/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-concessions"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] });
    },
  });
}

/** PUT /fee-concessions/:id — the real Edit/Settle flow: unlike Create,
 * accepts concession_amount + is_settled + settled_date together
 * (old-frontend-exact: "settling" a concession IS editing it with the
 * checkbox toggled — no separate settle endpoint exists). */
export function useUpdateConcession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, feeStructureId }: { id: number; input: UpdateFeeConcessionInput; feeStructureId?: number }) =>
      apiClient.put<FeeConcessionRow>(`/fee-concessions/${id}`, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-concessions"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "workspace"] });
      if (vars.feeStructureId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures", vars.feeStructureId, "concessions"] });
      }
    },
  });
}

/** DELETE /fee-concessions/:id */
export function useDeleteConcession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; feeStructureId?: number }) => apiClient.delete(`/fee-concessions/${id}`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-concessions"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "workspace"] });
      if (vars.feeStructureId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["billing", "fee-structures", vars.feeStructureId, "concessions"] });
      }
    },
  });
}

export type EducationLoanDdStatus = "received" | "cleared" | "bounced";

export interface EducationLoanDdRow {
  id: number;
  student_fee_demand_mapping_id: number;
  dd_reference_number: string;
  bank_name: string;
  amount: string;
  status: EducationLoanDdStatus;
  acknowledgement_receipt_no: string | null;
  received_by_user_id: number | null;
  created_at: string;
}

/** GET /education-loan-dds — real, bare flat list (no student — joined
 * client-side with useFeePaymentsDashboard by student_fee_demand_mapping_id). */
export function useEducationLoanDds() {
  return useQuery({
    queryKey: ["billing", "education-loan-dds"],
    queryFn: () => apiClient.get<EducationLoanDdRow[]>("/education-loan-dds"),
  });
}

/** GET /student-fee-demand-mappings/:id/education-loan-dds — real, scoped
 * to one demand mapping (matches the old frontend's EducationLoanDDPanel —
 * never the flat global list for a per-student view). */
export function useEducationLoanDDsByMapping(demandMappingId: number | undefined) {
  return useQuery({
    queryKey: ["billing", "student-fee-demand-mappings", demandMappingId, "education-loan-dds"],
    queryFn: () => apiClient.get<EducationLoanDdRow[]>(`/student-fee-demand-mappings/${demandMappingId}/education-loan-dds`),
    enabled: demandMappingId !== undefined,
  });
}

export interface CreateEducationLoanDdInput {
  dd_reference_number: string;
  bank_name: string;
  amount: number;
  acknowledgement_receipt_no?: string;
  received_by_user_id?: number;
}

/** POST /student-fee-demand-mappings/:id/education-loan-dds — status always
 * server-defaulted to "received", never accepted from the client. */
export function useCreateEducationLoanDd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ demandMappingId, input }: { demandMappingId: number; input: CreateEducationLoanDdInput }) =>
      apiClient.post<EducationLoanDdRow>(`/student-fee-demand-mappings/${demandMappingId}/education-loan-dds`, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["billing", "education-loan-dds"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "student-fee-demand-mappings", vars.demandMappingId, "education-loan-dds"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "workspace"] });
    },
  });
}

/** PATCH /education-loan-dds/:id — used here only to move status forward (e.g. to "cleared"). */
export function useUpdateEducationLoanDd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: EducationLoanDdStatus }) =>
      apiClient.patch(`/education-loan-dds/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "education-loan-dds"] }),
  });
}

export interface UpdateEducationLoanDdInput {
  dd_reference_number: string;
  bank_name: string;
  amount: number;
  acknowledgement_receipt_no?: string;
  status: EducationLoanDdStatus;
}

/** PUT /education-loan-dds/:id — the real Edit flow (old-frontend-exact):
 * unlike Create, DOES send status — this is the ONLY way to transition
 * status (e.g. mark cleared/bounced), there is no separate quick-action
 * endpoint. */
export function useUpdateEducationLoanDD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateEducationLoanDdInput; demandMappingId?: number }) =>
      apiClient.put<EducationLoanDdRow>(`/education-loan-dds/${id}`, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["billing", "education-loan-dds"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "workspace"] });
      if (vars.demandMappingId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["billing", "student-fee-demand-mappings", vars.demandMappingId, "education-loan-dds"] });
      }
    },
  });
}

/** DELETE /education-loan-dds/:id */
export function useDeleteEducationLoanDD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; demandMappingId?: number }) => apiClient.delete(`/education-loan-dds/${id}`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["billing", "education-loan-dds"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fee-payments", "workspace"] });
      if (vars.demandMappingId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["billing", "student-fee-demand-mappings", vars.demandMappingId, "education-loan-dds"] });
      }
    },
  });
}

export function groupDashboardByStudent(rows: FeePaymentDashboardRow[]): BillingStudentRow[] {
  const byStudent = new Map<number, BillingStudentRow>();
  for (const r of rows) {
    const demand = Number(r.total_demand);
    const paid = Number(r.paid_amount);
    const outstanding = Number(r.outstanding_amount);
    const existing = byStudent.get(r.student_id);
    if (!existing) {
      byStudent.set(r.student_id, {
        student_id: r.student_id,
        student_name: r.student_name ?? "—",
        register_number: r.register_number ?? "—",
        programme: r.programme,
        department: r.department,
        batch: r.batch,
        quota: r.quota,
        class_id: r.class_id,
        fee_structures: [r.fee_structure_name],
        total_demand: demand,
        paid_amount: paid,
        outstanding_amount: outstanding,
        due_status: r.due_status,
        last_payment_date: r.last_payment_date,
        demand_mapping_ids: [r.student_fee_demand_mapping_id],
      });
    } else {
      existing.fee_structures.push(r.fee_structure_name);
      existing.total_demand += demand;
      existing.paid_amount += paid;
      existing.outstanding_amount += outstanding;
      existing.demand_mapping_ids.push(r.student_fee_demand_mapping_id);
      if (r.last_payment_date && (!existing.last_payment_date || r.last_payment_date > existing.last_payment_date)) {
        existing.last_payment_date = r.last_payment_date;
      }
      existing.due_status = existing.outstanding_amount <= 0 ? "paid" : existing.paid_amount > 0 ? "partial" : "pending";
    }
  }
  return Array.from(byStudent.values());
}

// ── Reports ──────────────────────────────────────────────────────────────
// Backend reference: EOSbackend1/src/modules/fees-billing/reports/*.
// All 5 Reports-page cards are real (JSON preview + Excel/PDF export).

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}
export interface ReportTable {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export type BillingReportKey =
  | "demand-vs-collection"
  | "department-collection"
  | "concession-register"
  | "education-loan-dd-register"
  | "daily-collection-summary";

const REPORTS_BASE = "/reports/billing";

/** GET /reports/billing/:key — real on-screen preview table. */
export function useBillingReportPreview(key: BillingReportKey, enabled: boolean) {
  return useQuery({
    queryKey: ["billing", "reports", key],
    queryFn: () => apiClient.get<ReportTable>(`${REPORTS_BASE}/${key}`),
    enabled,
  });
}


/** Triggers a browser download for an already-fetched blob (matches the
 * convention in src/modules/library/lib/download-file.ts). */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** GET /reports/billing/:key/export?format=excel|pdf — real file download. */
export function useBillingReportDownload() {
  return useMutation({
    mutationFn: async ({ key, format }: { key: BillingReportKey; format: "excel" | "pdf" }) => {
      const { blob, filename } = await apiClient.downloadBlob(`${REPORTS_BASE}/${key}/export`, { format });
      saveBlob(blob, filename ?? `${key}.${format === "pdf" ? "pdf" : "xlsx"}`);
    },
  });
}

// ── Audit Log ────────────────────────────────────────────────────────────
// Backend reference: EOSbackend1/src/modules/fees-billing/audit-log/*.
// Real audit_logs rows written by every fees-billing mutation (payments,
// concessions, education loan DDs, demand categories, fee structures,
// fee structure items, quotas), scoped server-side to those entity types
// only — never other modules' audit rows (e.g. placement/drives).

export interface AuditLogRow {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  raw_action: string;
  detail: string;
  actor: string;
  time: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  action?: string;
  q?: string;
}

/** GET /audit-logs?entity_type=&action=&q= */
export function useBillingAuditLog(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["billing", "audit-logs", filters],
    queryFn: () =>
      apiClient.get<AuditLogRow[]>("/audit-logs", {
        entity_type: filters.entity_type,
        action: filters.action,
        q: filters.q,
      }),
  });
}
