import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type TransportDashboardPeriod = "today" | "term" | "year";

export interface TransportDashboard {
  period: TransportDashboardPeriod;
  extended: {
    fleet_status: boolean;
    documents: boolean;
    notices: boolean;
    fuel_tracking: boolean;
  };
  fleet: {
    total_buses: number;
    buses_on_route: number;
    buses_at_campus: number;
    buses_in_depot: number;
    buses_maintenance: number;
  };
  routes_count: number;
  ridership: {
    students_on_transport: number;
    total_capacity: number | null;
    occupancy_percent: number | null;
    routes: { route_id: number; route_name: string; student_count: number; capacity: number | null }[];
  };
  renewals: {
    documents_due: number;
    service_due: number;
  };
  fleet_command: {
    buses_reporting: number;
    gps_online_now: number;
    diesel_cost: number;
    transport_fee_collected: number;
    passes_issued: number;
  };
  needs_attention: { title: string; description: string }[];
  notices: { id: number; tag: string; title: string; created_at: string }[];
}

/** GET /me/transport-dashboard?period= — fleet, ridership, renewals and notices for the transport office. */
export function useTransportDashboard(period: TransportDashboardPeriod = "today") {
  return useQuery({
    queryKey: ["me", "transport-dashboard", period],
    queryFn: () => apiClient.get<TransportDashboard>("/me/transport-dashboard", { period }),
  });
}
