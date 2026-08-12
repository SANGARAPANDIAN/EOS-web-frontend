import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { BusStatus } from "@/modules/transport/api/buses";
import type { DocState } from "@/modules/transport/api/compliance";
import type { RouteFee } from "@/modules/transport/api/routes";

export interface BusDetailStop {
  sequence_no: number;
  stage_name: string;
  pickup_time: string | null;
  board_count: number;
}

export interface BusDetailDocument {
  doc_type: string;
  label: string;
  reference_no: string | null;
  valid_until: string | null;
  state: DocState;
}

export interface BusDetailMaintenance {
  id: number;
  service_date: string;
  work_description: string;
  garage: string | null;
  odometer_km: number | null;
  cost: number | null;
}

export interface BusDetailFuelEntry {
  id: number;
  fill_date: string;
  litres: number;
  rate_per_litre: number | null;
  station: string | null;
  odometer_km: number | null;
  cost: number | null;
}

export interface BusDetailSafetyItem {
  item_key: string;
  label: string;
  status_text: string;
  is_ok: boolean;
  checked_date: string | null;
}

export interface BusDetailResponse {
  extended: {
    fleet_status: boolean;
    specs: boolean;
    vehicle_specs: boolean;
    stage_times: boolean;
    documents: boolean;
    service_log: boolean;
    fuel_log: boolean;
    safety_checks: boolean;
  };
  bus: {
    id: number;
    bus_no: string;
    vehicle_number: string;
    status: BusStatus | null;
    model: string | null;
    gps_device_id: string | null;
    gps: { online: boolean; last_seen: string | null };
    registered_date: string | null;
  };
  route: {
    id: number;
    name: string | null;
    distance_km: number | null;
    boarding_area: string | null;
    departure_time: string | null;
    arrival_time: string | null;
    stops_count: number;
    stops: BusDetailStop[];
    term_fee: RouteFee;
  } | null;
  occupancy: { count: number; capacity: number | null; seats_free: number | null; percent: number | null };
  odometer: { odometer_km: number | null; next_service_due_km: number | null; last_service_date: string | null };
  crew: {
    driver_name: string | null;
    driver_phone: string | null;
    driver_licence_no: string | null;
    driver_licence_expiry: string | null;
    licence_state: DocState | null;
    driver_experience_years: number | null;
    driver_blood_group: string | null;
    attendant_name: string | null;
    attendant_phone: string | null;
  };
  spec: {
    body_type: string | null;
    year_of_manufacture: number | null;
    fuel_emission: string | null;
    chassis_no: string | null;
    engine_no: string | null;
    engine_spec: string | null;
    wheelbase_mm: number | null;
    tyre_spec: string | null;
    fuel_tank_litres: number | null;
    ownership: string | null;
    rto: string | null;
    parking_bay: string | null;
  } | null;
  documents: BusDetailDocument[];
  maintenance: BusDetailMaintenance[];
  fuel: { entries: BusDetailFuelEntry[]; avg_mileage_km_per_litre: number | null };
  safety: BusDetailSafetyItem[];
}

/** GET /me/buses/:id — full detail drill-down for one bus. */
export function useBusDetail(id: number) {
  return useQuery({
    queryKey: ["me", "buses", id],
    queryFn: () => apiClient.get<BusDetailResponse>(`/me/buses/${id}`),
  });
}

export interface UpdateBusInput {
  bus_no?: string;
  vehicle_number?: string;
  route_id?: number;
  driver_name?: string;
  gps_device_id?: string;
  status?: BusStatus;
  capacity?: number;
  driver_phone?: string;
  driver_licence_no?: string;
  driver_licence_expiry?: string;
  attendant_name?: string;
  attendant_phone?: string;
  odometer_km?: number;
  next_service_due_km?: number;
  last_service_date?: string;
  model?: string;
  body_type?: string;
  year_of_manufacture?: number;
  fuel_emission?: string;
  chassis_no?: string;
  engine_no?: string;
  engine_spec?: string;
  wheelbase_mm?: number;
  tyre_spec?: string;
  fuel_tank_litres?: number;
  ownership?: string;
  rto?: string;
  parking_bay?: string;
  registered_date?: string;
  driver_experience_years?: number;
  driver_blood_group?: string;
}

/** PATCH /me/buses/:id — edit a bus record. */
export function useUpdateBus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusInput) => apiClient.patch<{ id: number }>(`/me/buses/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "buses", id] });
      queryClient.invalidateQueries({ queryKey: ["me", "buses"] });
      queryClient.invalidateQueries({ queryKey: ["me", "transport-dashboard"] });
    },
  });
}
