import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ServiceCharge {
  name: string;
  rate: number;
  note: string;
}

/** GET /me/medical-centre-billing/services */
export function useServiceCharges() {
  return useQuery({
    queryKey: ["me", "medical-centre-billing", "services"],
    queryFn: () => apiClient.get<ServiceCharge[]>("/me/medical-centre-billing/services"),
  });
}

export interface Bill {
  id: string;
  billId: number;
  patient: string;
  condition: string;
  items: string;
  staff: string;
  total: number;
  mode: string;
  status: "Paid" | "Pending" | "Settled";
  when: string;
}

export interface BillHistory {
  bills: Bill[];
  collected: number;
  pending: number;
}

/** GET /me/medical-centre-billing/history */
export function useBillHistory() {
  return useQuery({
    queryKey: ["me", "medical-centre-billing", "history"],
    queryFn: () => apiClient.get<BillHistory>("/me/medical-centre-billing/history"),
  });
}

export interface BillItemInput {
  item_type: "medicine" | "service";
  stock_id?: number;
  description: string;
  quantity: number;
  rate: number;
}

export interface CreateBillInput {
  patient_name: string;
  patient_dept?: string;
  condition?: string;
  attended_by_staff_id?: number;
  payment_mode: "cash" | "upi" | "student_account" | "staff_welfare";
  status: "paid" | "pending" | "settled";
  items: BillItemInput[];
}

/** POST /me/medical-centre-billing */
export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillInput) => apiClient.post<{ id: number; total: number }>("/me/medical-centre-billing", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-billing"] });
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-pharmacy"] });
    },
  });
}

/** POST /me/medical-centre-billing/:id/collect */
export function useCollectBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/me/medical-centre-billing/${id}/collect`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-billing"] }),
  });
}
