import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/hostel/hostel-floors/*
// (added this session, query.md #10 — a genuinely new `hostel_floors`
// table; hostel_blocks.floors was only ever a count, never individual
// floor records).

export interface AdminHostelFloor {
  id: number;
  block: { id: number; name: string; hostel: { id: number; name: string; code: string } };
  name: string;
  rooms_count: number;
  capacity: number;
  occupied: number;
  vacant: number;
  created_at: string;
}

/** GET /hostel/floors?block_id= */
export function useAdminHostelFloors(blockId: number | null) {
  return useQuery({
    queryKey: ["admin", "hostel-floors", blockId],
    queryFn: () => apiClient.get<AdminHostelFloor[]>("/hostel/floors", { block_id: blockId ?? undefined }),
    enabled: blockId != null,
  });
}

export interface CreateHostelFloorInput {
  block_id: number;
  name: string;
}

export type UpdateHostelFloorInput = Partial<Omit<CreateHostelFloorInput, "block_id">>;

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin", "hostel-floors"] });
  // rooms_count/capacity on a block don't change from a floor edit, but keeping this here matches the same "any structural edit refreshes the block view" convention as blocks/wardens/rooms.
  queryClient.invalidateQueries({ queryKey: ["admin", "hostel-blocks"] });
}

/** POST /hostel/floors (Admin only). */
export function useCreateHostelFloor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHostelFloorInput) => apiClient.post<AdminHostelFloor>("/hostel/floors", input),
    onSuccess: () => invalidate(queryClient),
  });
}

/** PATCH /hostel/floors/:id (Admin only) — block_id can't be reassigned (delete + re-create for that). */
export function useUpdateHostelFloor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateHostelFloorInput }) => apiClient.patch<AdminHostelFloor>(`/hostel/floors/${id}`, input),
    onSuccess: () => invalidate(queryClient),
  });
}

/** DELETE /hostel/floors/:id (Admin only) — server-side blocked (409 HOSTEL_FLOOR_IN_USE) while a room is still assigned to this floor. */
export function useDeleteHostelFloor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/hostel/floors/${id}`),
    onSuccess: () => invalidate(queryClient),
  });
}
