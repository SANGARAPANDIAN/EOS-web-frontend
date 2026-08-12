import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface PlacementsSummary {
  companies_count: number;
  offers_released: number;
  average_package: number | null;
  highest_package: { value: number; company_name: string; job_role: string | null } | null;
  multiple_offers_count: number;
  drives_this_month: number;
  next_drive: { company_name: string; scheduled_date: string } | null;
  overall: { placed: number; eligible: number; unplaced: number; percentage: number | null };
  leading_department: { department: { id: number; name: string; code: string }; placement_rate: number | null } | null;
}

/**
 * GET /me/principal/placements/summary — no "placement season"/"vs last
 * year"/"target" figures: none of those are real, bounded concepts in this
 * schema (no season/academic-year field on placement_drives, no historical
 * target table). Every number here is computed over all drives on file.
 */
export function usePlacementsSummary() {
  return useQuery({
    queryKey: ["me", "principal", "placements", "summary"],
    queryFn: () => apiClient.get<PlacementsSummary>("/me/principal/placements/summary"),
  });
}

export interface PlacementDepartmentCard {
  department: { id: number; name: string; code: string };
  eligible: number;
  placed: number;
  unplaced: number;
  placement_rate: number | null;
  average_package: number | null;
  highest_package: number | null;
  rank: number;
}

/** GET /me/principal/placements/departments — ordered by placement rate. */
export function usePlacementDepartments() {
  return useQuery({
    queryKey: ["me", "principal", "placements", "departments"],
    queryFn: () => apiClient.get<PlacementDepartmentCard[]>("/me/principal/placements/departments"),
  });
}

export interface PlacementDepartmentDetail {
  id: number;
  name: string;
  code: string;
  hod: { faculty_id: number; name: string; designation: string } | null;
  eligible: number;
  placed: number;
  unplaced: number;
  placement_rate: number | null;
  average_package: number | null;
  highest_package: number | null;
}

/** GET /me/principal/placements/departments/:id */
export function usePlacementDepartmentDetail(id: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "placements", "department", id],
    queryFn: () => apiClient.get<PlacementDepartmentDetail>(`/me/principal/placements/departments/${id}`),
    enabled: id != null,
  });
}

export interface PlacementSection {
  id: number;
  section: string;
  semester: number | null;
  advisor: { faculty_id: number; name: string } | null;
  strength: number;
  eligible: number;
  placed: number;
  unplaced: number;
  highest_package: number | null;
  average_package: number | null;
  top_recruiter: string | null;
}

/** GET /me/principal/placements/departments/:id/sections */
export function usePlacementSections(id: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "placements", "sections", id],
    queryFn: () => apiClient.get<PlacementSection[]>(`/me/principal/placements/departments/${id}/sections`),
    enabled: id != null,
  });
}
