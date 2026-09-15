import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/fees-billing/hostel-rooms/*
// and hostel-room-types/*. Both already had full CRUD (Admin/Warden), just
// no Admin frontend ever called them — Warden's own "Rooms & allotment"
// page is read-only. `block_id` was also write-orphaned (a real column with
// no DTO field) until this session's fix.

export interface AdminHostelRoom {
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

/** GET /hostel-rooms?hostel_id=&block_id= */
export function useAdminHostelRooms(params: { hostelId?: number | null; blockId?: number | null }) {
  return useQuery({
    queryKey: ["admin", "hostel-rooms", params.hostelId ?? null, params.blockId ?? null],
    queryFn: () => apiClient.get<AdminHostelRoom[]>("/hostel-rooms", { hostel_id: params.hostelId ?? undefined, block_id: params.blockId ?? undefined }),
    enabled: params.hostelId != null || params.blockId != null,
  });
}

export interface CreateHostelRoomInput {
  hostel_id: number;
  room_number: string;
  room_type_id: number;
  capacity: number;
  block_id?: number;
  /** Nullable so an edit can explicitly clear it back to "no floor" — omitting the field leaves it unchanged. */
  floor_id?: number | null;
}

export type UpdateHostelRoomInput = Partial<CreateHostelRoomInput>;

function invalidateRooms(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin", "hostel-rooms"] });
  // rooms_count/capacity/occupied/vacant on a block (and, separately, on a
  // floor) are both derived from this same table.
  queryClient.invalidateQueries({ queryKey: ["admin", "hostel-blocks"] });
  queryClient.invalidateQueries({ queryKey: ["admin", "hostel-floors"] });
}

/** POST /hostel-rooms (Admin/Warden). */
export function useCreateHostelRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHostelRoomInput) => apiClient.post<AdminHostelRoom>("/hostel-rooms", input),
    onSuccess: () => invalidateRooms(queryClient),
  });
}

/** PATCH /hostel-rooms/:id (Admin/Warden). */
export function useUpdateHostelRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateHostelRoomInput }) => apiClient.patch<AdminHostelRoom>(`/hostel-rooms/${id}`, input),
    onSuccess: () => invalidateRooms(queryClient),
  });
}

/** DELETE /hostel-rooms/:id (Admin/Warden) — server-side blocked (409 HOSTEL_ROOM_IN_USE) while a student is assigned to this room. */
export function useDeleteHostelRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/hostel-rooms/${id}`),
    onSuccess: () => invalidateRooms(queryClient),
  });
}

export interface HostelRoomType {
  id: number;
  name: string;
  fee_amount: number | null;
}

/** GET /hostel-room-types (Admin/Warden/Billing read; Admin/Warden write). Real room types (e.g. "2 Sharing", "4 Sharing") — reused as-is, not duplicated. */
export function useHostelRoomTypes() {
  return useQuery({
    queryKey: ["admin", "hostel-room-types"],
    queryFn: () => apiClient.get<HostelRoomType[]>("/hostel-room-types"),
  });
}
