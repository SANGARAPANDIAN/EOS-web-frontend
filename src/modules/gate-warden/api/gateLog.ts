import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type GateEntryType = "in" | "out";

export interface GateLogStudentRef {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
}

export interface GateLogHostelRef {
  id: number;
  name: string;
  code: string;
}

export interface GateLogEntry {
  id: number;
  student: GateLogStudentRef;
  hostel: GateLogHostelRef | null;
  room_number: string | null;
  entry_type: GateEntryType;
  outing_id: number | null;
  recorded_at: string;
  recorded_by: string | null;
}

export interface GateLogPage {
  page: number;
  page_size: number;
  total: number;
  data: GateLogEntry[];
}

export interface GateLogListParams {
  [key: string]: string | number | undefined;
  student_id?: number;
  entry_type?: GateEntryType;
  hostel_id?: number;
  page?: number;
  page_size?: number;
}

export interface CreateGateLogInput {
  student_id: number;
  entry_type: GateEntryType;
  outing_id?: number;
}

/** An outing the Hostel Warden has approved that hasn't been checked out through the gate yet. */
export interface PendingExit {
  outing_id: number;
  student: GateLogStudentRef;
  hostel: GateLogHostelRef | null;
  room_number: string | null;
  from_date: string;
  to_date: string;
  start_time: string;
  return_time: string | null;
  reason: string | null;
}

/** A student whose most recent gate movement is a check-out with no check-in since — currently off campus. */
export interface PendingReturn {
  student: GateLogStudentRef;
  hostel: GateLogHostelRef | null;
  room_number: string | null;
  outing_id: number | null;
  checked_out_at: string;
  expected_return: { to_date: string; return_time: string | null } | null;
}

export interface GateLookupResult {
  student: {
    id: number;
    name: string;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    admission_no: string | null;
    photo_url: string | null;
    gender: string | null;
    date_of_birth: string | null;
    blood_group: string | null;
    student_type: string;
    dayscholar_mode: string | null;
    vehicle_number: string | null;
    status: string;
    contact: string | null;
    whatsapp: string | null;
    email: string;
  };
  academics: { course: string; department: string; section: string; semester: number | null } | null;
  /** No parent photo exists in the schema — parents are bare user accounts with no profile of their own. */
  parent: { father_name: string | null; mother_name: string | null; contact: string | null; photo_url: null } | null;
  hostel: GateLogHostelRef | null;
  room_number: string | null;
  is_hosteller: boolean;
  /** Whether this student's own most recent gate movement is a check-out with no check-in since. */
  is_currently_out: boolean;
  pending_outing: {
    outing_id: number;
    from_date: string;
    to_date: string;
    start_time: string;
    return_time: string | null;
    reason: string | null;
  } | null;
}

const gateLogKeys = {
  all: ["gate-warden", "gate-log"] as const,
  list: (params: GateLogListParams = {}) => ["gate-warden", "gate-log", "list", params] as const,
  pendingExits: () => ["gate-warden", "gate-log", "pending-exits"] as const,
  pendingReturns: () => ["gate-warden", "gate-log", "pending-returns"] as const,
};

/** GET /hostel/gate-log?student_id=&entry_type=&hostel_id=&page=&page_size= — Admin/Gate Warden/Hostel Warden. */
export function useGateLog(params: GateLogListParams = {}) {
  return useQuery({
    queryKey: gateLogKeys.list(params),
    queryFn: () => apiClient.get<GateLogPage>("/hostel/gate-log", params),
  });
}

function useInvalidateGateLog() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: gateLogKeys.all });
}

/** POST /hostel/gate-log — a factual record that a student physically passed through the gate. */
export function useCreateGateLogEntry() {
  const invalidate = useInvalidateGateLog();
  return useMutation({
    mutationFn: (input: CreateGateLogInput) => apiClient.post<GateLogEntry>("/hostel/gate-log", input),
    onSuccess: invalidate,
  });
}

/**
 * GET /hostel/gate-log/pending-exits — the Gate Warden's queue: every outing
 * the Hostel Warden has approved that hasn't been checked out through the
 * gate yet. Short poll interval since new approvals should show up here
 * without the Gate Warden refreshing.
 */
export function usePendingExits() {
  return useQuery({
    queryKey: gateLogKeys.pendingExits(),
    queryFn: () => apiClient.get<PendingExit[]>("/hostel/gate-log/pending-exits"),
    refetchInterval: 15_000,
  });
}

/**
 * GET /hostel/gate-log/pending-returns — the mirror queue: every student
 * whose last recorded gate movement is a check-out with no check-in since,
 * i.e. currently off campus. Not limited to outing-linked exits.
 */
export function usePendingReturns() {
  return useQuery({
    queryKey: gateLogKeys.pendingReturns(),
    queryFn: () => apiClient.get<PendingReturn[]>("/hostel/gate-log/pending-returns"),
    refetchInterval: 15_000,
  });
}

/** GET /hostel/gate-log/lookup?roll_no= — roll-number search at the gate; modeled as a mutation since it's user-triggered, not keyed on every keystroke. */
export function useLookupStudent() {
  return useMutation({
    mutationFn: (rollNo: string) => apiClient.get<GateLookupResult>("/hostel/gate-log/lookup", { roll_no: rollNo }),
  });
}
