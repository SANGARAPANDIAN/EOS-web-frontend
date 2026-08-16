import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ServiceDueEntry {
  bus_id: number;
  bus_no: string;
  vehicle_number: string;
  odometer_km: number;
  next_service_due_km: number;
  km_left: number;
  tag: "due" | "soon";
}

export interface ServiceLogEntry {
  id: number;
  bus_id: number;
  bus_no: string;
  service_date: string;
  work_description: string;
  garage: string | null;
  odometer_km: number | null;
  cost: number | null;
}

export interface MaintenanceResponse {
  extended: { fleet_status: boolean; service_log: boolean };
  service_due: ServiceDueEntry[];
  service_log: ServiceLogEntry[];
}

/** GET /me/maintenance */
export function useMaintenance() {
  return useQuery({
    queryKey: ["me", "maintenance"],
    queryFn: () => apiClient.get<MaintenanceResponse>("/me/maintenance"),
  });
}

export interface CreateServiceLogInput {
  bus_id: number;
  work_description: string;
  garage?: string;
  odometer_km?: number;
  cost?: number;
  service_date?: string;
}

/** POST /me/maintenance/service-log */
export function useCreateServiceLogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceLogInput) => apiClient.post<ServiceLogEntry>("/me/maintenance/service-log", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "maintenance"] }),
  });
}
