import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/stationary/stationary-vendor.controller.ts
// (machines/print-rates/finishing-rates routes) + stationary.service.ts.
// stationary_machines / stationary_print_rates / stationary_finishing_rates
// are new tables, user-approved before creation — see the Operations page's
// own "Printers & Machines" / "Price Detail" tabs in "Stationery Portal.dc.html".

export type MachineStatus = "working" | "under_repair" | "maintenance";
export type MachineCategory = "printer" | "binding";

export interface Machine {
  id: number;
  name: string;
  model: string;
  category: MachineCategory;
  status: MachineStatus;
  note: string | null;
}

export function useMachines() {
  return useQuery({
    queryKey: ["stationary", "machines"],
    queryFn: () => apiClient.get<Machine[]>("/stationary-requests/machines"),
  });
}

export interface MachineInput {
  name: string;
  model: string;
  category?: MachineCategory;
  status?: MachineStatus;
  note?: string;
}

export function useCreateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MachineInput) => apiClient.post<Machine>("/stationary-requests/machines", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "machines"] }),
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<MachineInput> }) =>
      apiClient.patch<Machine>(`/stationary-requests/machines/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "machines"] }),
  });
}

export function useDeleteMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/stationary-requests/machines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "machines"] }),
  });
}

export interface PrintRate {
  id: number;
  service: string;
  paper_size: string;
  bw_price: number;
  bw_unit: string;
  colour_price: number;
  colour_unit: string;
  bulk_price: number;
  bulk_unit: string;
}

export function usePrintRates() {
  return useQuery({
    queryKey: ["stationary", "print-rates"],
    queryFn: () => apiClient.get<PrintRate[]>("/stationary-requests/print-rates"),
  });
}

export type PrintRateInput = Omit<PrintRate, "id">;

export function useCreatePrintRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PrintRateInput) => apiClient.post<PrintRate>("/stationary-requests/print-rates", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "print-rates"] }),
  });
}

export function useUpdatePrintRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<PrintRateInput> }) =>
      apiClient.patch<PrintRate>(`/stationary-requests/print-rates/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "print-rates"] }),
  });
}

export function useDeletePrintRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/stationary-requests/print-rates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "print-rates"] }),
  });
}

export interface FinishingRate {
  id: number;
  item_name: string;
  note: string | null;
  price: number;
}

export function useFinishingRates() {
  return useQuery({
    queryKey: ["stationary", "finishing-rates"],
    queryFn: () => apiClient.get<FinishingRate[]>("/stationary-requests/finishing-rates"),
  });
}

export type FinishingRateInput = { item_name: string; note?: string; price: number };

export function useCreateFinishingRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinishingRateInput) => apiClient.post<FinishingRate>("/stationary-requests/finishing-rates", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "finishing-rates"] }),
  });
}

export function useUpdateFinishingRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<FinishingRateInput> }) =>
      apiClient.patch<FinishingRate>(`/stationary-requests/finishing-rates/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "finishing-rates"] }),
  });
}

export function useDeleteFinishingRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/stationary-requests/finishing-rates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stationary", "finishing-rates"] }),
  });
}
