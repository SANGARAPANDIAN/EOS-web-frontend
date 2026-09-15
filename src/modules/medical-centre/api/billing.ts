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
  /** Required by the API when payment_mode is "upi", rejected on other modes. */
  upi_transaction_id?: string;
  /** The OPD visit this bill settles, when the patient came from the queue. */
  visit_id?: number;
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

/**
 * GET /me/medical-centre-billing/:id/receipt
 *
 * Structured receipt data — the line items as real rows (description,
 * quantity, unit rate, amount), which the history list only carries as a
 * pre-joined summary string. Fetched on demand, when a receipt is actually
 * being printed.
 */
export interface MedicalReceiptItemDto {
  id: number;
  item_type: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface MedicalReceiptDto {
  receipt_no: string;
  bill_id: number;
  issued_at: string;
  patient: {
    name: string;
    department: string | null;
    /** Roll number (student) or staff code (faculty); null for a walk-in. */
    identifier: string | null;
    /** True when the details came from a linked OPD visit, not typed in. */
    is_linked: boolean;
  };
  reason: string | null;
  attended_by: { name: string; designation: string | null } | null;
  payment_mode: string;
  upi_transaction_id: string | null;
  status: string;
  items: MedicalReceiptItemDto[];
  totals: { medicine: number; service: number; total: number };
}

export function useBillReceipt(billId: number | null) {
  return useQuery({
    queryKey: ["me", "medical-centre-billing", "receipt", billId],
    queryFn: () => apiClient.get<MedicalReceiptDto>(`/me/medical-centre-billing/${billId}/receipt`),
    enabled: billId !== null,
  });
}
