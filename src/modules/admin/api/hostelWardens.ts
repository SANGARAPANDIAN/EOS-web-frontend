import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/hostel/hostel-wardens/*.
// `hostel_wardens` is a real block-scoped roster (distinct from
// hostels.warden_user_id's single-warden-per-hostel auth scoping) that
// existed already but had zero create/update/delete anywhere in the app —
// every reader (Principal's block report, hostel announcement authorship,
// the class-mentor hostel-warden-name lookup) only ever displayed whatever
// someone had inserted directly via SQL.

export type HostelWardenRole = "super_warden" | "sub_warden";

export interface AdminHostelWarden {
  id: number;
  block_id: number;
  name: string;
  emp_id: string;
  role: HostelWardenRole;
  user_id: number | null;
  gender: string | null;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  joined_date: string | null;
  quarters: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /hostel/wardens?block_id= */
export function useAdminHostelWardens(blockId: number | null) {
  return useQuery({
    queryKey: ["admin", "hostel-wardens", blockId],
    queryFn: () => apiClient.get<AdminHostelWarden[]>("/hostel/wardens", { block_id: blockId ?? undefined }),
    enabled: blockId != null,
  });
}

export interface CreateHostelWardenInput {
  block_id: number;
  name: string;
  emp_id: string;
  role: HostelWardenRole;
  gender?: string;
  designation?: string;
  mobile?: string;
  email?: string;
  joined_date?: string;
  quarters?: string;
}

export type UpdateHostelWardenInput = Partial<CreateHostelWardenInput>;

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin", "hostel-wardens"] });
  // A block's `warden`/`wardens` fields are resolved server-side from this same table, so any change here must also refresh the blocks list/detail.
  queryClient.invalidateQueries({ queryKey: ["admin", "hostel-blocks"] });
}

/** POST /hostel/wardens (Admin only). */
export function useCreateHostelWarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHostelWardenInput) => apiClient.post<AdminHostelWarden>("/hostel/wardens", input),
    onSuccess: () => invalidate(queryClient),
  });
}

/** PATCH /hostel/wardens/:id (Admin only) — block_id IS updatable (real transfers happen; no history is lost by allowing it). */
export function useUpdateHostelWarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateHostelWardenInput }) => apiClient.patch<AdminHostelWarden>(`/hostel/wardens/${id}`, input),
    onSuccess: () => invalidate(queryClient),
  });
}

/** DELETE /hostel/wardens/:id (Admin only) — server-side blocked (409 HOSTEL_WARDEN_IN_USE) while a goods request still references this warden. */
export function useDeleteHostelWarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/hostel/wardens/${id}`),
    onSuccess: () => invalidate(queryClient),
  });
}
