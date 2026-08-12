import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CrewMember {
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
  driver_experience_years: number | null;
  driver_blood_group: string | null;
}

export interface CrewResponse {
  extended: { fleet_status: boolean; vehicle_specs: boolean };
  meta: { total: number; filtered: number };
  crew: CrewMember[];
}

/** GET /me/crew?search= — drivers & attendants assigned to each bus. */
export function useCrew(search?: string) {
  return useQuery({
    queryKey: ["me", "crew", search],
    queryFn: () => apiClient.get<CrewResponse>("/me/crew", { search }),
  });
}
