"use client";

// REAL backend wiring — no fake data. Real "Receive Payment" flow against
// EOSbackend1's real `POST /student-fee-demand-mappings/:id/payments`
// (category-wise: against one real fee_structure_item_id, not a lump sum
// against the whole demand — see CreateFeePaymentDto's own doc comment).
// Shared by the Fee Payments page, the Students roster page, and the
// Student detail page.

import { useEffect, useMemo, useState } from "react";
import { BillingModal, fieldLabelSx, fieldInputSx, fieldRow2Sx } from "@/modules/billing/BillingModal";
import { useCategoryBreakdown, useCreateFeePayment, useStudentWorkspace, type CreateFeePaymentInput } from "@/modules/billing/api/fees";

export function ReceivePaymentModal({
  open,
  onClose,
  onSubmitted,
  fixedStudentId,
  demandMappingIds,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  fixedStudentId?: number;
  demandMappingIds: number[];
}) {
  const [selectedMappingId, setSelectedMappingId] = useState<number | undefined>(demandMappingIds[0]);
  const [itemId, setItemId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<CreateFeePaymentInput["payment_mode"]>("upi");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedMappingId(demandMappingIds[0]);
      setItemId("");
      setAmount("");
      setMode("upi");
      setFormError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedStudentId]);

  const { data: workspace } = useStudentWorkspace(fixedStudentId);
  const { data: breakdown } = useCategoryBreakdown(selectedMappingId);
  const createPayment = useCreateFeePayment();

  const picked = workspace?.student_profile;
  const outstanding = workspace?.fee_summary.total_outstanding;

  const selectedItem = useMemo(() => (breakdown ?? []).find((b) => String(b.fee_structure_item_id) === itemId), [breakdown, itemId]);

  function reset() {
    setSelectedMappingId(demandMappingIds[0]);
    setItemId("");
    setAmount("");
    setMode("upi");
    setFormError("");
  }
  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!selectedMappingId) {
      setFormError("No fee structure found for this student.");
      return;
    }
    if (!itemId) {
      setFormError("Select a demand category to receive against.");
      return;
    }
    const amt = Number(amount);
    if (!amount || amt <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    try {
      await createPayment.mutateAsync({ demandMappingId: selectedMappingId, input: { fee_structure_item_id: Number(itemId), amount_paid: amt, payment_mode: mode } });
      reset();
      onSubmitted();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not record the payment.");
    }
  }

  if (!open) return null;

  return (
    <BillingModal open={open} title="Receive Payment" sub="Record a real fee payment against a student's demand." cta="Record Payment" onClose={handleClose} onSubmit={handleSubmit} error={formError}>
      {picked && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#f8fafc", border: "1px solid #e6e9ef", borderRadius: 9, padding: "10px 13px" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{picked.student_name}</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
              {picked.register_number} <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>· {picked.department}</span>
            </div>
          </div>
          {outstanding && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>Outstanding</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600 }}>{`₹${Math.round(Number(outstanding)).toLocaleString("en-IN")}`}</div>
            </div>
          )}
        </div>
      )}

      {demandMappingIds.length > 1 && (
        <div>
          <div style={fieldLabelSx}>Fee Structure</div>
          <select value={selectedMappingId ?? ""} onChange={(e) => { setSelectedMappingId(Number(e.target.value)); setItemId(""); }} style={fieldInputSx}>
            {(workspace?.demand_summary ?? []).map((d) => (
              <option key={d.student_fee_demand_mapping_id} value={d.student_fee_demand_mapping_id}>{d.fee_structure_name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div style={fieldLabelSx}>Demand Category</div>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} style={fieldInputSx}>
          <option value="">Select a category</option>
          {(breakdown ?? []).map((b) => (
            <option key={b.fee_structure_item_id} value={b.fee_structure_item_id} disabled={b.status === "paid"}>
              {b.demand_category_name ?? "Category"} — outstanding ₹{Math.round(Number(b.outstanding_amount)).toLocaleString("en-IN")}{b.status === "paid" ? " (paid)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldRow2Sx}>
        <div>
          <div style={fieldLabelSx}>Amount</div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={selectedItem ? selectedItem.outstanding_amount : "e.g. 25000"} style={fieldInputSx} />
        </div>
        <div>
          <div style={fieldLabelSx}>Mode</div>
          <select value={mode} onChange={(e) => setMode(e.target.value as CreateFeePaymentInput["payment_mode"])} style={fieldInputSx}>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="netbanking">Net Banking</option>
            <option value="dd">DD</option>
            <option value="cash">Cash</option>
          </select>
        </div>
      </div>
    </BillingModal>
  );
}

export const toastSx = {
  position: "fixed",
  bottom: 26,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#0f172a",
  color: "#fff",
  borderRadius: 10,
  padding: "13px 20px",
  fontSize: 13.5,
  fontWeight: 600,
  boxShadow: "0 16px 40px rgba(15,23,42,.35)",
  zIndex: 80,
} as const;
