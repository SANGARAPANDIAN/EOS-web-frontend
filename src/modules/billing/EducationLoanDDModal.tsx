"use client";

// REAL backend wiring — old-frontend-exact logic (see
// EOSfrontendweb/src/modules/fees/components/education-loan-dd/{EducationLoanDDFormDialog,EducationLoanDDPanel}.tsx
// and services/education-loan-dd.service.ts). Create sends
// dd_reference_number/bank_name/amount/acknowledgement_receipt_no? — status
// is shown defaulted to "received" but NEVER sent on create (server
// defaults it). Edit (PUT /education-loan-dds/:id) DOES send status — the
// ONLY way to transition status (e.g. mark cleared/bounced).

import { useEffect, useState } from "react";
import { BillingModal, fieldLabelSx, fieldInputSx, fieldRow2Sx } from "@/modules/billing/BillingModal";
import {
  useCreateEducationLoanDd,
  useUpdateEducationLoanDD,
  type StudentWorkspace,
  type EducationLoanDdStatus,
} from "@/modules/billing/api/fees";

const STATUS_OPTIONS: EducationLoanDdStatus[] = ["received", "cleared", "bounced"];
const STATUS_LABELS: Record<EducationLoanDdStatus, string> = { received: "Received", cleared: "Cleared", bounced: "Bounced" };

type EditableEducationLoanDD = StudentWorkspace["education_loan_dd"][number];

export function EducationLoanDDModal({
  open,
  demandSummary,
  editing,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  demandSummary: StudentWorkspace["demand_summary"];
  editing: EditableEducationLoanDD | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const isEdit = editing !== null;
  const [demandMappingId, setDemandMappingId] = useState<number | undefined>(demandSummary[0]?.student_fee_demand_mapping_id);
  const [ddReferenceNumber, setDdReferenceNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<EducationLoanDdStatus>("received");
  const [acknowledgementReceiptNo, setAcknowledgementReceiptNo] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDemandMappingId(editing ? editing.student_fee_demand_mapping_id : demandSummary[0]?.student_fee_demand_mapping_id);
    setDdReferenceNumber(editing?.dd_reference_number ?? "");
    setBankName(editing?.bank_name ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setStatus((editing?.status as EducationLoanDdStatus) ?? "received");
    setAcknowledgementReceiptNo(editing?.acknowledgement_receipt_no ?? "");
    setFormError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const createDD = useCreateEducationLoanDd();
  const updateDD = useUpdateEducationLoanDD();
  const isSubmitting = createDD.isPending || updateDD.isPending;

  if (!open) return null;

  async function handleSubmit() {
    const refNo = ddReferenceNumber.trim();
    const bank = bankName.trim();
    const amt = Number(amount);
    const ackNo = acknowledgementReceiptNo.trim();
    if (!refNo) {
      setFormError("Enter the DD reference number.");
      return;
    }
    if (!bank) {
      setFormError("Enter the bank name.");
      return;
    }
    if (!amount || amt < 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    try {
      if (isEdit && editing) {
        await updateDD.mutateAsync({
          id: editing.id,
          input: {
            dd_reference_number: refNo,
            bank_name: bank,
            amount: amt,
            acknowledgement_receipt_no: ackNo ? ackNo : undefined,
            status,
          },
          demandMappingId: editing.student_fee_demand_mapping_id,
        });
      } else {
        if (!demandMappingId) {
          setFormError("No fee structure is linked to this student yet.");
          return;
        }
        await createDD.mutateAsync({
          demandMappingId,
          input: {
            dd_reference_number: refNo,
            bank_name: bank,
            amount: amt,
            ...(ackNo ? { acknowledgement_receipt_no: ackNo } : {}),
          },
        });
      }
      onSubmitted();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : `Could not ${isEdit ? "update" : "create"} the education loan DD.`);
    }
  }

  return (
    <BillingModal
      open={open}
      title={isEdit ? "Edit Education Loan DD" : "Add Education Loan DD"}
      sub="Record a demand draft against a student's education loan."
      cta={isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add DD"}
      onClose={onClose}
      onSubmit={handleSubmit}
      error={formError}
    >
      {!isEdit && demandSummary.length > 1 && (
        <div>
          <div style={fieldLabelSx}>Fee Structure</div>
          <select value={demandMappingId ?? ""} onChange={(e) => setDemandMappingId(Number(e.target.value))} style={fieldInputSx}>
            {demandSummary.map((d) => (
              <option key={d.student_fee_demand_mapping_id} value={d.student_fee_demand_mapping_id}>{d.fee_structure_name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div style={fieldLabelSx}>DD Reference Number</div>
        <input type="text" maxLength={50} value={ddReferenceNumber} onChange={(e) => setDdReferenceNumber(e.target.value)} placeholder="e.g. DD2025000441" style={fieldInputSx} />
      </div>

      <div style={fieldRow2Sx}>
        <div>
          <div style={fieldLabelSx}>Bank Name</div>
          <input type="text" maxLength={150} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Canara Bank" style={fieldInputSx} />
        </div>
        <div>
          <div style={fieldLabelSx}>Amount</div>
          <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" style={fieldInputSx} />
        </div>
      </div>

      <div style={fieldRow2Sx}>
        {isEdit ? (
          <div>
            <div style={fieldLabelSx}>Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value as EducationLoanDdStatus)} style={fieldInputSx}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{STATUS_LABELS[option]}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <div style={fieldLabelSx}>Status</div>
            <select value="received" disabled style={{ ...fieldInputSx, background: "#f8fafc", color: "#94a3b8" }}>
              <option value="received">Received</option>
            </select>
          </div>
        )}
        <div>
          <div style={fieldLabelSx}>Ack. Receipt No.</div>
          <input type="text" maxLength={50} value={acknowledgementReceiptNo} onChange={(e) => setAcknowledgementReceiptNo(e.target.value)} placeholder="e.g. ACK25080012" style={fieldInputSx} />
        </div>
      </div>
    </BillingModal>
  );
}
