import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AmbulanceVehicle {
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  oxygenStatus: string;
  status: "On call" | "Dispatched";
  tripsThisMonth: number;
}

export interface AmbulanceContact {
  name: string;
  role: string;
  phone: string;
}

export interface AmbulanceTrip {
  when: string;
  caseText: string;
  detail: string;
  outcome: "Referred" | "Returned";
}

export interface AmbulanceData {
  vehicle: AmbulanceVehicle | null;
  contacts: AmbulanceContact[];
  trips: AmbulanceTrip[];
}

/** GET /me/medical-centre-ambulance */
export function useAmbulance() {
  return useQuery({
    queryKey: ["me", "medical-centre-ambulance"],
    queryFn: () => apiClient.get<AmbulanceData>("/me/medical-centre-ambulance"),
  });
}

/** POST /me/medical-centre-ambulance/dispatch | recall */
export function useSetAmbulanceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: "dispatch" | "recall") => apiClient.post(`/me/medical-centre-ambulance/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-ambulance"] }),
  });
}
