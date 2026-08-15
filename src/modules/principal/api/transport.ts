import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface TransportBus {
  id: number;
  bus_no: string;
  vehicle_number: string;
  status: string;
  route: {
    id: number;
    name: string;
    stops_count: number;
    first_stop: string | null;
    last_stop: string | null;
    departure_time: string | null;
    arrival_time: string | null;
  } | null;
  driver_name: string | null;
  driver_phone: string | null;
  capacity: number | null;
  riders_count: number;
  seats_free: number | null;
  last_seen: string | null;
}

/** GET /me/principal/transport */
export function useTransportList() {
  return useQuery({
    queryKey: ["me", "principal", "transport", "list"],
    queryFn: () => apiClient.get<{ total: number; buses: TransportBus[] }>("/me/principal/transport"),
  });
}

export interface TransportStop {
  id: number;
  sequence_no: number;
  stage_name: string;
  fee_amount: number;
  pickup_time: string | null;
}

export interface TransportBusDetail extends TransportBus {
  stops: TransportStop[];
}

/** GET /me/principal/transport/:id */
export function useTransportBusDetail(id: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "transport", "detail", id],
    queryFn: () => apiClient.get<TransportBusDetail>(`/me/principal/transport/${id}`),
    enabled: id != null,
  });
}
