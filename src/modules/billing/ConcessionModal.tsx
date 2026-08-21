"use client";

// REAL backend wiring — old-frontend-exact logic (see
// EOSfrontendweb/src/modules/fees/components/fee-concessions/{FeeConcessionFormDialog,FeeConcessionsPanel}.tsx
// and services/fee-concessions.service.ts). Create sends ONLY
// concession_amount (POST /fee-structures/:id/concessions); Edit/Settle
// sends concession_amount + is_settled + settled_date together
// (PUT /fee-concessions/:id) — there is no separate settle endpoint.
// Reuses BillingModal chrome/fields, same as ReceivePaymentModal's
// "pick which fee structure if the student has more than one" pattern.

import { useEffect, useState } from "react";
import { BillingModal, fieldLabelSx, fieldInputSx, fieldRow2Sx } from "@/modules/billing/BillingModal";
import { useCreateConcession, useUpdateConcession, type StudentWorkspace } from "@/modules/billing/api/fees";

type EditableConcession = StudentWorkspace["fee_concessions"][number];

export function ConcessionModal({
  open,
  demandSummary,
  editing,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  demandSummary: StudentWorkspace["demand_summary"];
  editing: EditableConcession | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const isEdit = editing !== null;
  const [feeStructureId, setFeeStructureId] = useState<number | undefined>(demandSummary[0]?.fee_structure_id);
  const [concessionAmount, setConcessionAmount] = useState("");
  const [isSettled, setIsSettled] = useState(false);
  const [settledDate, setSettledDate] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFeeStructureId(editing ? editing.fee_structure_id : demandSummary[0]?.fee_structure_id);
    setConcessionAmount(editing ? String(editing.concession_amount) : "");
    setIsSettled(editing?.is_settled ?? false);
    setSettledDate(editing?.settled_date ?? "");
    setFormError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const createConcession = useCreateConcession();
  const updateConcession = useUpdateConcession();
  const isSubmitting = createConcession.isPending || updateConcession.isPending;

  if (!open) return null;

  async function handleSubmit() {
    const amt = Number(concessionAmount);
    if (!concessionAmount || amt < 0) {
      setFormError("Enter a valid concession amount.");
      return;
    }
    try {
      if (isEdit && editing) {
        await updateConcession.mutateAsync({
          id: editing.id,
          input: { concession_amount: amt, is_settled: isSettled, settled_date: settledDate ? settledDate : null },
          feeStructureId: editing.fee_structure_id,
        });
      } else {
        if (!feeStructureId) {
          setFormError("No fee structure is linked to this student yet.");
          return;
        }
        await createConcession.mutateAsync({ feeStructureId, input: { concession_amount: amt } });
      }
      onSubmitted();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : `Could not ${isEdit ? "update" : "create"} the concession.`);
    }
  }

  return (
    <BillingModal
      open={open}
      title={isEdit ? "Edit Fee Concession" : "Add Fee Concession"}
      sub="Sanction a concession against a student's fee demand."
      cta={isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Concession"}
      onClose={onClose}
      onSubmit={handleSubmit}
      error={formError}
    >
      {!isEdit && demandSummary.length > 1 && (
        <div>
          <div style={fieldLabelSx}>Fee Structure</div>
          <select value={feeStructureId ?? ""} onChange={(e) => setFeeStructureId(Number(e.target.value))} style={fieldInputSx}>
            {demandSummary.map((d) => (
              <option key={d.fee_structure_id} value={d.fee_structure_id}>{d.fee_structure_name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div style={fieldLabelSx}>Concession Amount</div>
        <input
          type="number"
          min={0}
          step="0.01"
          value={concessionAmount}
          onChange={(e) => setConcessionAmount(e.target.value)}
          placeholder="e.g. 5000"
          style={fieldInputSx}
        />
      </div>

      {isEdit && (
        <div style={fieldRow2Sx}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={isSettled} onChange={(e) => setIsSettled(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#1d4ed8" }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Settled</span>
          </label>
          <div>
            <div style={fieldLabelSx}>Settled Date</div>
            <input type="date" value={settledDate} onChange={(e) => setSettledDate(e.target.value)} style={fieldInputSx} />
          </div>
        </div>
      )}
    </BillingModal>
  );
}
