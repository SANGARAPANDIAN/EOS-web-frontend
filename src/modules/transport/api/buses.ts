import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type BusStatus = "on_route" | "at_campus" | "in_depot" | "maintenance";

export interface BusRoute {
  id: number;
  name: string | null;
  bus_count: number;
  stops_count: number;
  student_count: number;
  distance_km: number | null;
  boarding_area: string | null;
  departure_time: string | null;
  arrival_time: string | null;
}

export interface BusDocument {
  label: string;
  valid_until: string;
  state: "expired" | "due_soon" | "valid";
}

export interface BusRidership {
  count: number;
  /** true once counted from student_transport_mapping.bus_id directly; false when it's a route-wide total shared across this route's buses. */
  exact: boolean;
  seats_free: number | null;
}

export interface Bus {
  id: number;
  bus_no: string;
  vehicle_number: string;
  driver_name: string | null;
  driver_phone: string | null;
  gps_device_id: string | null;
  status: BusStatus | null;
  capacity: number | null;
  model: string | null;
  ridership: BusRidership;
  route: BusRoute | null;
  gps: { online: boolean; last_seen: string | null };
  odometer_km: number | null;
  next_service_due_km: number | null;
  service_due: boolean | null;
  document: BusDocument | null;
}

export interface BusesResponse {
  extended: { fleet_status: boolean; documents: boolean; specs: boolean; per_bus_ridership: boolean };
  meta: { total: number; filtered: number };
  status_counts: Record<BusStatus, number> | null;
  buses: Bus[];
}

export interface ListBusesParams {
  status?: BusStatus;
  search?: string;
}

/** GET /me/buses?status=&search= — fleet list for the transport office. */
export function useBuses(params: ListBusesParams = {}) {
  return useQuery({
    queryKey: ["me", "buses", params],
    queryFn: () => apiClient.get<BusesResponse>("/me/buses", { status: params.status, search: params.search }),
  });
}

export interface CreateBusInput {
  bus_no: string;
  vehicle_number: string;
  model?: string;
  year_of_manufacture?: number;
  chassis_no?: string;
  engine_no?: string;
  fuel_emission?: string;
  capacity?: number;
  route_id?: number;
  driver_name?: string;
  driver_phone?: string;
  driver_licence_no?: string;
  driver_licence_expiry?: string;
  attendant_name?: string;
  attendant_phone?: string;
  gps_device_id?: string;
  parking_bay?: string;
  insurance_valid_till?: string;
  fc_valid_till?: string;
  permit_valid_till?: string;
}

/** POST /me/buses — add a vehicle to the register. */
export function useCreateBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusInput) => apiClient.post<{ id: number }>("/me/buses", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "buses"] });
      queryClient.invalidateQueries({ queryKey: ["me", "transport-dashboard"] });
    },
  });
}
