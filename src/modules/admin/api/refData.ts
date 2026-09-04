import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Department {
  id: number;
  name: string;
  code: string;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  department_id: number;
  duration_years: number;
}

export interface Batch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

export interface SchoolClass {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number | null;
}

export interface Quota {
  id: number;
  name: string;
}

/**
 * These reference lists are small and fixed (courses, batches, classes,
 * quotas) — the old repo fetches each in full and filters client-side
 * rather than passing server-side filter params, so these hooks mirror that
 * exactly rather than inventing query params the backend may not support.
 * (departments moved to the shared `useDepartments` in
 * `@/modules/shared/api/departments` — the `Department` type above stays
 * here since other modules still import it for annotation purposes.)
 */
export function useCourses() {
  return useQuery({
    queryKey: ["courses", "list"],
    queryFn: () => apiClient.get<Course[]>("/courses"),
    staleTime: 5 * 60 * 1000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be set well above staleTime — same reference-data reasoning.
    gcTime: 10 * 60 * 1000,
  });
}

export function useBatches() {
  return useQuery({
    queryKey: ["batches", "list"],
    queryFn: () => apiClient.get<Batch[]>("/batches"),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useClasses() {
  return useQuery({
    queryKey: ["classes", "list"],
    queryFn: () => apiClient.get<SchoolClass[]>("/classes"),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useQuotas() {
  return useQuery({
    queryKey: ["quotas", "list"],
    queryFn: () => apiClient.get<Quota[]>("/quotas"),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export interface BonafideReasonRef {
  id: number;
  reason_text: string;
}

export function useBonafideReasons() {
  return useQuery({
    queryKey: ["bonafide-reasons", "list"],
    queryFn: () => apiClient.get<BonafideReasonRef[]>("/bonafide-reasons"),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
