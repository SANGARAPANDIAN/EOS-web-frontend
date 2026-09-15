import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Read-only mirrors of the Transport-admin role's own routes/crew/maintenance/
// compliance/dashboard endpoints — Principal's backend controller delegates
// to the exact same services (see PrincipalTransportController), so these
// response shapes match transport-admin's 1:1.

export interface TransportRoute {
  id: number;
  name: string;
  distance_km: number | null;
  boarding_area: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  stops_count: number;
  fee: { per_student: number | null; range: { min: number; max: number } | null; total_due: number };
  buses: { bus_no: string; vehicle_number: string; driver_name: string | null; status: string | null }[];
  student_count: number;
}

/** GET /me/principal/transport/routes?search= */
export function useTransportRoutes(search?: string) {
  return useQuery({
    queryKey: ["me", "principal", "transport", "routes", search ?? ""],
    queryFn: () =>
      apiClient.get<{ meta: { total: number; filtered: number }; routes: TransportRoute[] }>("/me/principal/transport/routes", {
        search: search || undefined,
      }),
  });
}

export interface TransportCrewMember {
  bus_id: number;
  bus_no: string;
  vehicle_number: string;
  route_name: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_licence_no: string | null;
  driver_licence_expiry: string | null;
  licence_state: "expired" | "due_soon" | "valid" | null;
  attendant_name: string | null;
  attendant_phone: string | null;
}

/** GET /me/principal/transport/crew?search= */
export function useTransportCrew(search?: string) {
  return useQuery({
    queryKey: ["me", "principal", "transport", "crew", search ?? ""],
    queryFn: () =>
      apiClient.get<{ meta: { total: number; filtered: number }; crew: TransportCrewMember[] }>("/me/principal/transport/crew", {
        search: search || undefined,
      }),
  });
}

export interface TransportServiceDue {
  bus_id: number;
  bus_no: string;
  vehicle_number: string;
  odometer_km: number;
  next_service_due_km: number;
  km_left: number;
  tag: "due" | "soon";
}
export interface TransportServiceLogEntry {
  id: number;
  bus_id: number;
  bus_no: string;
  service_date: string;
  work_description: string;
  garage: string | null;
  odometer_km: number | null;
  cost: number | null;
}

/** GET /me/principal/transport/maintenance */
export function useTransportMaintenance() {
  return useQuery({
    queryKey: ["me", "principal", "transport", "maintenance"],
    queryFn: () =>
      apiClient.get<{ service_due: TransportServiceDue[]; service_log: TransportServiceLogEntry[] }>("/me/principal/transport/maintenance"),
  });
}

export interface TransportBusDocument {
  doc_type: string;
  label: string;
  reference_no: string | null;
  valid_until: string | null;
  state: "expired" | "due_soon" | "valid" | "missing";
}
export interface TransportComplianceBus {
  bus_id: number;
  bus_no: string;
  vehicle_number: string;
  documents: TransportBusDocument[];
}

/** GET /me/principal/transport/compliance */
export function useTransportCompliance() {
  return useQuery({
    queryKey: ["me", "principal", "transport", "compliance"],
    queryFn: () => apiClient.get<{ buses: TransportComplianceBus[] }>("/me/principal/transport/compliance"),
  });
}

export type TransportDashboardPeriod = "today" | "term" | "year";

export interface TransportDashboard {
  fleet: { total_buses: number; buses_on_route: number; buses_at_campus: number; buses_in_depot: number; buses_maintenance: number };
  routes_count: number;
  ridership: {
    students_on_transport: number;
    total_capacity: number | null;
    occupancy_percent: number | null;
    routes: { route_id: number; route_name: string; student_count: number; capacity: number | null }[];
  };
  renewals: { documents_due: number; service_due: number };
  needs_attention: { title: string; description: string }[];
}

/** GET /me/principal/transport/dashboard?period=today|term|year */
export function useTransportDashboard(period: TransportDashboardPeriod = "today") {
  return useQuery({
    queryKey: ["me", "principal", "transport", "dashboard", period],
    queryFn: () => apiClient.get<TransportDashboard>("/me/principal/transport/dashboard", { period }),
  });
}
