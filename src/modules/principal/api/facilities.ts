import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface FacilitiesHubSummary {
  classrooms: { tracked: boolean; rooms_count: number; blocks_count: number };
  laboratories: { tracked: boolean; labs_count: number };
  medical: { equipment_types: number; equipment_total_quantity: number };
  sports: { disciplines_count: number };
  library: { distinct_titles: number };
  venue_bookings: { this_month_count: number };
}

/** GET /me/principal/facilities/hub */
export function useFacilitiesHub() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "hub"],
    queryFn: () => apiClient.get<FacilitiesHubSummary>("/me/principal/facilities/hub"),
  });
}

export interface ClassroomRow {
  id: number;
  block: string | null;
  room_number: string;
  capacity: number | null;
  class_held: string | null;
  class_advisor: string | null;
  contact: string | null;
  facility: string | null;
}

/** GET /me/principal/facilities/classrooms — tracked:false until query.md #1 is run. */
export function useClassrooms() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "classrooms"],
    queryFn: () => apiClient.get<{ tracked: boolean; total: number; blocks_count: number; rooms: ClassroomRow[] }>("/me/principal/facilities/classrooms"),
  });
}

export interface LabRow {
  id: number;
  block: string | null;
  room_number: string;
  capacity: number | null;
  department_in_charge: string | null;
}

/** GET /me/principal/facilities/laboratories — tracked:false until query.md #1 is run. */
export function useLaboratories() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "laboratories"],
    queryFn: () => apiClient.get<{ tracked: boolean; total: number; labs: LabRow[] }>("/me/principal/facilities/laboratories"),
  });
}

export interface MedicalSummary {
  students_treated_this_year: number;
  visits_this_month: number;
  staff_count: number;
  staff_by_designation: { designation: string; count: number }[];
  equipment_types: number;
  equipment_total_quantity: number;
}

export function useMedicalSummary() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "medical", "summary"],
    queryFn: () => apiClient.get<MedicalSummary>("/me/principal/facilities/medical/summary"),
  });
}

export interface MedicalStaffMember {
  id: number;
  name: string;
  designation: string | null;
  shift_time: string | null;
  phone: string | null;
}

export function useMedicalTeam() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "medical", "team"],
    queryFn: () => apiClient.get<MedicalStaffMember[]>("/me/principal/facilities/medical/team"),
  });
}

export interface TreatmentLogEntry {
  id: number;
  person_name: string;
  context: string | null;
  visit_date: string;
  reason: string | null;
  diagnosis: string | null;
  treatment_given: string | null;
  attended_by: string | null;
}

export function useTreatmentLog() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "medical", "treatment-log"],
    queryFn: () => apiClient.get<TreatmentLogEntry[]>("/me/principal/facilities/medical/treatment-log"),
  });
}

export interface MedicalEquipmentRow {
  id: number;
  name: string;
  quantity: number;
  location: string | null;
  condition: string;
}

/** GET /me/principal/facilities/medical/equipment — empty until query.md #10 is run. */
export function useMedicalEquipment() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "medical", "equipment"],
    queryFn: () => apiClient.get<MedicalEquipmentRow[]>("/me/principal/facilities/medical/equipment"),
  });
}

export interface SportsSummary {
  sports_students: number;
  disciplines_count: number;
  sports_faculty_count: number;
  achievements_this_semester: number;
  equipment_types: number;
  equipment_total_quantity: number;
}

export function useSportsSummary() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "sports", "summary"],
    queryFn: () => apiClient.get<SportsSummary>("/me/principal/facilities/sports/summary"),
  });
}

export interface SportsFacultyRow {
  team_id: number;
  discipline: string;
  coach_name: string | null;
  coach_role: string | null;
  coach_phone: string | null;
}

/** GET /me/principal/facilities/sports/faculty — coach_role/coach_phone null until query.md #11 is run. */
export function useSportsFaculty() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "sports", "faculty"],
    queryFn: () => apiClient.get<SportsFacultyRow[]>("/me/principal/facilities/sports/faculty"),
  });
}

export interface SportsAchievementRow {
  id: number;
  event_name: string;
  discipline: string | null;
  participant_name: string | null;
  result: string;
  achievement_date: string;
}

/** GET /me/principal/facilities/sports/achievements — empty until query.md #11 is run. */
export function useSportsAchievements() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "sports", "achievements"],
    queryFn: () => apiClient.get<SportsAchievementRow[]>("/me/principal/facilities/sports/achievements"),
  });
}

export interface LibrarySummary {
  distinct_titles: number;
  total_copies: number;
  borrowed: number;
  e_resources_count: number;
}

export function useLibrarySummary() {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "library", "summary"],
    queryFn: () => apiClient.get<LibrarySummary>("/me/principal/facilities/library/summary"),
  });
}

export type LibraryStatusFilter = "all" | "available" | "partial" | "out";

export interface LibraryBookRow {
  id: number;
  title: string;
  author: string | null;
  accession: string;
  category: string;
  total_copies: number;
  borrowed: number;
  available: number;
  status: "available" | "partial" | "out";
}

export function useLibraryBooks(status: LibraryStatusFilter, q?: string) {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "library", "books", status, q],
    queryFn: () =>
      apiClient.get<{ total: number; books: LibraryBookRow[] }>("/me/principal/facilities/library/books", {
        status,
        q: q || undefined,
      }),
  });
}

export interface VenueBookingRow {
  id: number;
  venue: { id: number; name: string };
  date: string;
  time: string;
  faculty_in_charge: string;
  purpose: string;
  status: "pending" | "approved" | "rejected";
}

export function useVenueBookings(range: "week" | "month") {
  return useQuery({
    queryKey: ["me", "principal", "facilities", "venue-bookings", range],
    queryFn: () => apiClient.get<{ total: number; bookings: VenueBookingRow[] }>("/me/principal/facilities/venue-bookings", { range }),
  });
}
