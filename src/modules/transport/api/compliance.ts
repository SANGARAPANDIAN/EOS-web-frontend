import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type BusDocType = "insurance" | "fitness_certificate" | "permit" | "pollution_certificate" | "road_tax";
export type DocState = "expired" | "due_soon" | "valid" | "missing";

export interface BusDocumentEntry {
  doc_type: BusDocType;
  label: string;
  reference_no: string | null;
  valid_until: string | null;
  state: DocState;
}

export interface ComplianceBus {
  bus_id: number;
  bus_no: string;
  vehicle_number: string;
  documents: BusDocumentEntry[];
}

export interface ComplianceResponse {
  extended: { documents: boolean };
  buses: ComplianceBus[];
}

/** GET /me/compliance */
export function useCompliance() {
  return useQuery({
    queryKey: ["me", "compliance"],
    queryFn: () => apiClient.get<ComplianceResponse>("/me/compliance"),
  });
}

export interface UpsertBusDocumentInput {
  bus_id: number;
  doc_type: BusDocType;
  reference_no?: string;
  valid_until: string;
}

/** POST /me/compliance/documents */
export function useUpsertBusDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertBusDocumentInput) => apiClient.post<BusDocumentEntry>("/me/compliance/documents", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "compliance"] }),
  });
}
