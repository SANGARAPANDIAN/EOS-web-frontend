import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { BusStatus } from "@/modules/transport/api/buses";

export interface RouteBus {
  bus_no: string;
  vehicle_number: string;
  driver_name: string | null;
  status: BusStatus | null;
}

export interface RouteFee {
  /** A single figure only when every enrolled student pays the same amount (their own boarding-stage fare). */
  per_student: number | null;
  /** Set instead of per_student when enrolled students pay different amounts. */
  range: { min: number; max: number } | null;
  /** Sum of each enrolled student's own boarding-stage fee. */
  total_due: number;
}

export interface Route {
  id: number;
  name: string;
  distance_km: number | null;
  boarding_area: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  stops_count: number;
  fee: RouteFee;
  buses: RouteBus[];
  student_count: number;
}

export interface RoutesResponse {
  extended: { fleet_status: boolean; specs: boolean };
  meta: { total: number; filtered: number };
  routes: Route[];
}

export interface CreateRouteInput {
  name: string;
  boarding_area?: string;
  distance_km?: number;
  departure_time?: string;
  arrival_time?: string;
}

/** POST /me/routes — create a route. */
export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRouteInput) => apiClient.post<{ id: number }>("/me/routes", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "routes"] }),
  });
}

/**
 * DELETE /me/routes/:id — the server refuses while buses or students are
 * still assigned, and says which, so the message is worth surfacing verbatim.
 */
export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeId: number) => apiClient.delete<{ id: number }>(`/me/routes/${routeId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "routes"] }),
  });
}

/** DELETE /me/stages/:id — remove a boarding stage nothing depends on. */
export function useDeleteStage(routeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: number) => apiClient.delete<{ id: number }>(`/me/stages/${stageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "routes"] });
      queryClient.invalidateQueries({ queryKey: ["me", "routes", routeId] });
    },
  });
}

/** GET /me/routes?search= — route list for the transport office. */
export function useRoutes(search?: string) {
  return useQuery({
    queryKey: ["me", "routes", search],
    queryFn: () => apiClient.get<RoutesResponse>("/me/routes", { search }),
  });
}

export interface RouteStage {
  id: number;
  sequence_no: number;
  stage_name: string;
  fee_amount: number;
  pickup_time: string | null;
}

export interface RouteDetailResponse {
  extended: { specs: boolean; stage_times: boolean };
  route: {
    id: number;
    name: string;
    distance_km: number | null;
    boarding_area: string | null;
    departure_time: string | null;
    arrival_time: string | null;
  };
  stages: RouteStage[];
}

/** GET /me/routes/:id — one route + its full stage list, for editing. */
export function useRouteDetail(id: number | null) {
  return useQuery({
    queryKey: ["me", "routes", "detail", id],
    queryFn: () => apiClient.get<RouteDetailResponse>(`/me/routes/${id}`),
    enabled: id != null,
  });
}

export interface UpdateRouteInput {
  name?: string;
  boarding_area?: string;
  distance_km?: number;
  departure_time?: string;
  arrival_time?: string;
}

function invalidateRouteQueries(queryClient: ReturnType<typeof useQueryClient>, routeId: number) {
  queryClient.invalidateQueries({ queryKey: ["me", "routes"] });
  queryClient.invalidateQueries({ queryKey: ["me", "routes", "detail", routeId] });
  queryClient.invalidateQueries({ queryKey: ["me", "transport-dashboard"] });
}

/** PATCH /me/routes/:id */
export function useUpdateRoute(routeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRouteInput) => apiClient.patch<{ id: number }>(`/me/routes/${routeId}`, input),
    onSuccess: () => invalidateRouteQueries(queryClient, routeId),
  });
}

export interface UpdateStageInput {
  stage_name?: string;
  fee_amount?: number;
  pickup_time?: string;
  sequence_no?: number;
}

/** PATCH /me/stages/:id */
export function useUpdateStage(routeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, input }: { stageId: number; input: UpdateStageInput }) =>
      apiClient.patch<{ id: number }>(`/me/stages/${stageId}`, input),
    onSuccess: () => invalidateRouteQueries(queryClient, routeId),
  });
}

export interface CreateStageInput {
  stage_name: string;
  fee_amount: number;
  pickup_time?: string;
}

/** POST /me/routes/:id/stages */
export function useCreateStage(routeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStageInput) => apiClient.post<RouteStage>(`/me/routes/${routeId}/stages`, input),
    onSuccess: () => invalidateRouteQueries(queryClient, routeId),
  });
}

export interface RouteStudent {
  mapping_id: number;
  student_id_no: string;
  student_name: string;
  boarding_stage_id: number;
  boarding_stage_name: string;
  bus_id: number | null;
  bus_no: string | null;
  fee_amount: number;
}

/** GET /me/routes/:id/students — every student currently assigned to this route. */
export function useRouteStudents(routeId: number | null) {
  return useQuery({
    queryKey: ["me", "routes", "students", routeId],
    queryFn: () => apiClient.get<RouteStudent[]>(`/me/routes/${routeId}/students`),
    enabled: routeId != null,
  });
}

export interface AddRouteStudentInput {
  student_id_no: string;
  boarding_stage_id: number;
  bus_id?: number;
}

function invalidateRouteStudentQueries(queryClient: ReturnType<typeof useQueryClient>, routeId: number) {
  invalidateRouteQueries(queryClient, routeId);
  queryClient.invalidateQueries({ queryKey: ["me", "routes", "students", routeId] });
}

/** POST /me/routes/:id/students — add a student (by student ID), or move their existing assignment onto this route. */
export function useAddRouteStudent(routeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRouteStudentInput) =>
      apiClient.post<{ mapping_id: number }>(`/me/routes/${routeId}/students`, input),
    onSuccess: () => invalidateRouteStudentQueries(queryClient, routeId),
  });
}

/** DELETE /me/routes/:id/students/:mappingId — remove a student's transport assignment. */
export function useRemoveRouteStudent(routeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) => apiClient.delete<{ id: number }>(`/me/routes/${routeId}/students/${mappingId}`),
    onSuccess: () => invalidateRouteStudentQueries(queryClient, routeId),
  });
}
