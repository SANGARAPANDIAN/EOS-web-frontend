import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface FeeDemand {
  id: number;
  fee_structure_name: string;
  academic_year: string;
  semester: number;
  total: number;
  paid: number;
  due: number;
  status: "paid" | "partial" | "pending";
}

export interface FeePayment {
  id: number;
  demand_id: number;
  fee_structure_name: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string | null;
  receipt_no: string;
  is_partial: boolean;
}

export interface MyFees {
  demands: FeeDemand[];
  payments: FeePayment[];
}

/** GET /me/fees */
export function useMyFees() {
  return useQuery({
    queryKey: ["me", "fees"],
    queryFn: () => apiClient.get<MyFees>("/me/fees"),
  });
}
