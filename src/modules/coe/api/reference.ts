import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Read-only master-data lookups. Every GET here requires no special role
// (subjects/classes/departments/batches expose an unguarded GET; exam-types
// GET has no @Roles at all) — confirmed against each controller directly.

export interface Department {
  id: number;
  name: string;
  code: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["coe", "departments"],
    queryFn: () => apiClient.get<Department[]>("/departments"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface Batch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

export function useBatches() {
  return useQuery({
    queryKey: ["coe", "batches"],
    queryFn: () => apiClient.get<Batch[]>("/batches"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface ClassRecord {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number;
}

export function useClasses() {
  return useQuery({
    queryKey: ["coe", "classes"],
    queryFn: () => apiClient.get<ClassRecord[]>("/classes"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface Subject {
  id: number;
  name: string;
  subject_code: string;
  department_id: number;
  credits: number;
}

export function useSubjects() {
  return useQuery({
    queryKey: ["coe", "subjects"],
    queryFn: () => apiClient.get<Subject[]>("/subjects"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface ExamType {
  id: number;
  name: string;
  category: string | null;
  code: string | null;
  is_university: boolean;
}

export function useExamTypes() {
  return useQuery({
    queryKey: ["coe", "exam-types"],
    queryFn: () => apiClient.get<ExamType[]>("/exam-types"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface Venue {
  id: number;
  name: string;
  location: string | null;
  capacity: number;
  is_available: boolean;
  booking: { purpose: string; booked_by: string; accommodating_strength: number; from_datetime: string; to_datetime: string } | null;
}

/**
 * GET /venues is really an availability CHECK for a booking window, not a
 * plain venue listing — `from`/`to` are required ISO datetimes (confirmed
 * against ListVenueQueryDto) and every venue is still returned (just
 * annotated with `is_available`/`booking`), paginated (max limit 100). We
 * don't have a specific exam-date window here, so this passes a
 * deliberately wide one just to get the full venue list with names.
 */
export function useVenues() {
  return useQuery({
    queryKey: ["coe", "venues"],
    queryFn: async () => {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const result = await apiClient.get<{ data: Venue[]; meta: { total: number } }>("/venues", { from, to, limit: 100 });
      return result.data;
    },
    staleTime: 60 * 1000,
  });
}
