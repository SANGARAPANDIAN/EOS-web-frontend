import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ExamSessionCode } from "@/modules/coe/api/shared";

// src/modules/exams/seating-plans/ — new, coe-only. Built entirely over
// tables that already existed (seating_plan_versions, .._version_venues,
// .._venue_departments, seating_arrangements) with zero controllers
// referencing them before this — the schema was clearly designed for
// exactly this feature (seating_pattern_enum's 6 values,
// seating_allocation_mode_enum's automatic/manual, match the design 1:1).
// No schema change.

export type SeatingAllocationMode = "automatic" | "manual";
export type SeatingPattern = "sequential" | "alternate_seat" | "rowwise_mixed" | "columnwise_mixed" | "checkerboard" | "snake_order";
export type SeatingVersionStatus = "draft" | "ready_to_publish" | "published" | "superseded" | "withdrawn";

export interface VenueOverview {
  venue_id: number;
  hall_plan_id: number;
  name: string;
  location: string | null;
  capacity: number;
  seated: number;
  allocation_mode: SeatingAllocationMode | null;
  pattern: SeatingPattern | null;
  departments: { id: number; code: string; name: string }[];
}

export interface SeatingOverview {
  version: { id: number; version_number: number; status: SeatingVersionStatus };
  exam: { id: number; academic_year: string; semester: number; exam_type_name: string; batch_name: string };
  total_seats: number;
  total_seated: number;
  venues: VenueOverview[];
}

export function useSeatingOverview(params: { exam_id: number | null; exam_date: string; session: ExamSessionCode }) {
  return useQuery({
    queryKey: ["coe", "seating-overview", params.exam_id, params.exam_date, params.session],
    queryFn: () =>
      apiClient.get<SeatingOverview>("/seating-plans/overview", {
        exam_id: params.exam_id ?? undefined,
        exam_date: params.exam_date,
        session: params.session,
      }),
    enabled: params.exam_id != null && !!params.exam_date,
  });
}

export interface SeatChartEntry {
  seat_number: string;
  student_id: number;
  register_no: string;
  name: string | null;
  is_special_accommodation: boolean;
}

export interface DepartmentSeatingBreakdown {
  id: number;
  code: string;
  name: string;
  seated_here: number;
  pool_at_this_venue: number;
  carried_forward: number;
}

export interface VenueDetail {
  version: { id: number; status: SeatingVersionStatus };
  version_venue_id: number;
  venue: { id: number; name: string; location: string | null; capacity: number };
  allocation_mode: SeatingAllocationMode | null;
  pattern: SeatingPattern | null;
  departments: { id: number; code: string; name: string }[];
  department_breakdown: DepartmentSeatingBreakdown[];
  candidates_waiting: number;
  seats: SeatChartEntry[];
}

interface TargetVenueParams {
  exam_id: number;
  exam_date: string;
  session: ExamSessionCode;
  venue_id: number;
}

export function useVenueDetail(params: TargetVenueParams | null) {
  return useQuery({
    queryKey: ["coe", "seating-venue-detail", params?.exam_id, params?.exam_date, params?.session, params?.venue_id],
    queryFn: () =>
      apiClient.get<VenueDetail>("/seating-plans/venue-detail", {
        exam_id: params!.exam_id,
        exam_date: params!.exam_date,
        session: params!.session,
        venue_id: params!.venue_id,
      }),
    enabled: params != null,
  });
}

function useInvalidateSeating() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["coe", "seating-overview"] });
    queryClient.invalidateQueries({ queryKey: ["coe", "seating-venue-detail"] });
    queryClient.invalidateQueries({ queryKey: ["coe", "seating-versions"] });
  };
}

export function useConfigureVenue() {
  const invalidate = useInvalidateSeating();
  return useMutation({
    mutationFn: (
      input: TargetVenueParams & { allocation_mode?: SeatingAllocationMode; pattern?: SeatingPattern; department_ids?: number[] },
    ) => apiClient.post<VenueDetail>("/seating-plans/venue-config", input),
    onSuccess: invalidate,
  });
}

export function useAllocateAutomatic() {
  const invalidate = useInvalidateSeating();
  return useMutation({
    mutationFn: (input: TargetVenueParams) =>
      apiClient.post<{ seated: number; capacity: number; carried_forward: number }>("/seating-plans/allocate-automatic", input),
    onSuccess: invalidate,
  });
}

export function useAllocateManual() {
  const invalidate = useInvalidateSeating();
  return useMutation({
    mutationFn: (input: TargetVenueParams & { entries: string[] }) =>
      apiClient.post<{ seated: number; capacity: number; carried_forward: number; not_found: string[] }>(
        "/seating-plans/allocate-manual",
        input,
      ),
    onSuccess: invalidate,
  });
}

export function useClearVenue() {
  const invalidate = useInvalidateSeating();
  return useMutation({
    mutationFn: (input: TargetVenueParams) => apiClient.post<{ deleted: number }>("/seating-plans/clear-venue", input),
    onSuccess: invalidate,
  });
}

export interface SeatingVersion {
  id: number;
  exam_id: number;
  exam_date: string;
  session: ExamSessionCode;
  version_number: number;
  status: SeatingVersionStatus;
  published_at: string | null;
  exams: { id: number; academic_year: string; semester: number; exam_types: { name: string } };
  seating_plan_version_venues: {
    venues: { name: string; location: string | null };
    seating_plan_venue_departments: { departments: { code: string } }[];
  }[];
  _count: { seating_arrangements: number };
}

export function useSeatingVersions(status?: SeatingVersionStatus) {
  return useQuery({
    queryKey: ["coe", "seating-versions", status ?? "all"],
    queryFn: () => apiClient.get<SeatingVersion[]>("/seating-plans/versions", { status }),
  });
}

export function useSubmitSeatingVersion() {
  const invalidate = useInvalidateSeating();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<SeatingVersion>(`/seating-plans/versions/${id}/submit`),
    onSuccess: invalidate,
  });
}

export function usePublishSeatingVersion() {
  const invalidate = useInvalidateSeating();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<SeatingVersion>(`/seating-plans/versions/${id}/publish`),
    onSuccess: invalidate,
  });
}

export function useDeleteSeatingVersion() {
  const invalidate = useInvalidateSeating();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/seating-plans/versions/${id}`),
    onSuccess: invalidate,
  });
}

export interface SeatingVersionDetail {
  id: number;
  exam_id: number;
  exam_date: string;
  session: ExamSessionCode;
  version_number: number;
  status: SeatingVersionStatus;
  exam: { academic_year: string; semester: number; exam_type_name: string };
  venues: {
    venue_id: number;
    name: string;
    location: string | null;
    capacity: number;
    allocation_mode: SeatingAllocationMode;
    pattern: SeatingPattern | null;
    departments: { id: number; code: string; name: string }[];
    seated: number;
  }[];
}

export function useSeatingVersionDetail(id: number | null) {
  return useQuery({
    queryKey: ["coe", "seating-version-detail", id],
    queryFn: () => apiClient.get<SeatingVersionDetail>(`/seating-plans/versions/${id}`),
    enabled: id != null,
  });
}

export interface CoeProfile {
  id: number;
  user_id: number;
  is_senior: boolean;
}

export function useMyCoeProfile() {
  return useQuery({
    queryKey: ["coe", "coe-profile-me"],
    queryFn: () => apiClient.get<CoeProfile>("/coe-profile/me"),
    staleTime: 5 * 60 * 1000,
  });
}
