import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/hostel/hostel-blocks/*.
// `hostel_blocks` is a real table (FK-linked from hostel_rooms.block_id,
// hostel_wardens.block_id, hostel_goods.block_id) that existed already, but
// had zero create/update/delete anywhere in the app before this session —
// every prior reader (Principal's occupancy report) only ever listed
// whatever someone had inserted directly via SQL. This is the first real
// CRUD surface for it, deliberately Admin-only (Warden can still read
// blocks — e.g. to place a room — via GET, but can't create/edit/delete).

export interface HostelBlockWarden {
  id: number;
  name: string;
  role: "super_warden" | "sub_warden";
}

export interface AdminHostelBlock {
  id: number;
  hostel: { id: number; name: string; code: string };
  name: string;
  floors: number;
  /** Single preferred warden (super_warden wins over sub_warden) — for compact list display. */
  warden: HostelBlockWarden | null;
  /** Full roster for this block (both super_warden and sub_warden rows), for the detail page. */
  wardens: HostelBlockWarden[];
  rooms_count: number;
  capacity: number;
  occupied: number;
  vacant: number;
  created_at: string;
}

/** GET /hostel/blocks?hostel_id= */
export function useAdminHostelBlocks(hostelId?: number | null) {
  return useQuery({
    queryKey: ["admin", "hostel-blocks", hostelId ?? "all"],
    queryFn: () => apiClient.get<AdminHostelBlock[]>("/hostel/blocks", { hostel_id: hostelId ?? undefined }),
  });
}

/** GET /hostel/blocks/:id */
export function useAdminHostelBlock(id: number | null) {
  return useQuery({
    queryKey: ["admin", "hostel-blocks", "detail", id],
    queryFn: () => apiClient.get<AdminHostelBlock>(`/hostel/blocks/${id}`),
    enabled: id != null,
  });
}

export interface CreateHostelBlockInput {
  hostel_id: number;
  name: string;
  floors: number;
}

export type UpdateHostelBlockInput = Partial<Omit<CreateHostelBlockInput, "hostel_id">>;

/** POST /hostel/blocks (Admin only). */
export function useCreateHostelBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHostelBlockInput) => apiClient.post<AdminHostelBlock>("/hostel/blocks", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "hostel-blocks"] }),
  });
}

/** PATCH /hostel/blocks/:id (Admin only) — hostel_id can't be reassigned (delete + re-create for that). */
export function useUpdateHostelBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateHostelBlockInput }) => apiClient.patch<AdminHostelBlock>(`/hostel/blocks/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "hostel-blocks"] }),
  });
}

/** DELETE /hostel/blocks/:id (Admin only) — server-side blocked (409 HOSTEL_BLOCK_IN_USE) while any room is still assigned to this block. */
export function useDeleteHostelBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/hostel/blocks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "hostel-blocks"] }),
  });
}
