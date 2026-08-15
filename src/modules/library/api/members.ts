import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";
import type { Paginated } from "@/modules/library/api/books";

export interface MemberLastBorrowed {
  title: string;
  date: string;
}

export interface LibraryMember {
  id: number;
  student_id_no: string;
  register_no: string | null;
  name: string;
  department: { id: number; name: string; code: string };
  currently_borrowed: number;
  total_borrowed: number;
  last_borrowed: MemberLastBorrowed | null;
  library_status: "clear" | "overdue";
}

export interface MemberListParams {
  [key: string]: string | number | undefined;
  q?: string;
  department_id?: number;
  page?: number;
  page_size?: number;
}

export function useMembers(params: MemberListParams) {
  return useQuery({
    queryKey: libraryKeys.members.list(params),
    queryFn: () => apiClient.get<Paginated<LibraryMember>>("/library/members", params),
    placeholderData: keepPreviousData,
  });
}
