import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HostelRoom {
  id: number;
  hostel_id: number;
  room_number: string;
  room_type_id: number;
  capacity: number;
  block: { id: number; name: string } | null;
  floor: { id: number; name: string } | null;
  occupied: number;
  vacant: number;
}

/** GET /hostel-rooms — hostel_id scoping is enforced server-side for wardens. */
export function useHostelRooms() {
  return useQuery({
    queryKey: ["hostel-rooms"],
    queryFn: () => apiClient.get<HostelRoom[]>("/hostel-rooms"),
  });
}

export interface HostelRoomType {
  id: number;
  name: string;
}

/** GET /hostel-room-types — small shared lookup, not hostel-scoped. */
export function useHostelRoomTypes() {
  return useQuery({
    queryKey: ["hostel-room-types"],
    queryFn: () => apiClient.get<HostelRoomType[]>("/hostel-room-types"),
    staleTime: 10 * 60_000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be set well above staleTime — same reference-data reasoning.
    gcTime: 20 * 60_000,
  });
}
