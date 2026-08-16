import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HostelSummary {
  blocks_count: number;
  rooms_count: number;
  capacity_total: number;
  occupied: number;
  vacant: number;
  occupancy_percentage: number | null;
  curfew_time: string | null;
}

/** GET /me/principal/hostel/summary — curfew_time is null until query.md #8 is run (no such field ever existed). */
export function useHostelSummary() {
  return useQuery({
    queryKey: ["me", "principal", "hostel", "summary"],
    queryFn: () => apiClient.get<HostelSummary>("/me/principal/hostel/summary"),
  });
}

export interface HostelBlock {
  id: number;
  name: string;
  hostel: { id: number; name: string };
  warden: { name: string; role: "super_warden" | "sub_warden" } | null;
  rooms_count: number;
  capacity: number;
  occupied: number;
  vacant: number;
  out_on_pass: number;
}

/** GET /me/principal/hostel/blocks */
export function useHostelBlocks() {
  return useQuery({
    queryKey: ["me", "principal", "hostel", "blocks"],
    queryFn: () => apiClient.get<HostelBlock[]>("/me/principal/hostel/blocks"),
  });
}

export interface HostelRoomTypeFee {
  room_type_id: number;
  room_type: string;
  total_per_year: number | null;
}

/** GET /me/principal/hostel/room-type-fees — real data from hostel_room_types.fee_amount. */
export function useHostelRoomTypeFees() {
  return useQuery({
    queryKey: ["me", "principal", "hostel", "room-type-fees"],
    queryFn: () => apiClient.get<HostelRoomTypeFee[]>("/me/principal/hostel/room-type-fees"),
  });
}
