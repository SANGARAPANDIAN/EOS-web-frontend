import { useState } from "react";
import { Button, Input, Modal } from "@/modules/admin/components/ui";
import { DEFAULT_FEE_ROWS, type FeeParticularRow } from "./BonafideBankDocument";

// Shown only for the "Bank Loan Purpose" reason, right before printing —
// lets the admin fill in the II/III/IV year amount for each of the six
// particulars the bank-format certificate prints in its expenditure table.
// These values are entered fresh every time (not persisted) since
// fee_structures in the DB has no multi-year projection to auto-populate
// from.
export function BonafidePrintDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (rows: FeeParticularRow[]) => void;
  isSubmitting: boolean;
}) {
  const [rows, setRows] = useState<FeeParticularRow[]>(DEFAULT_FEE_ROWS);

  function updateRow(index: number, patch: Partial<FeeParticularRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setRows(DEFAULT_FEE_ROWS);
        onClose();
      }}
      title="Fee particulars for bank loan certificate"
      widthClassName="max-w-2xl"
    >
      <p className="text-sm text-admin-subtle">
        Enter the year-wise amount for each particular — printed on the certificate&apos;s expenditure table exactly as
        entered.
      </p>
      <div className="mt-4 overflow-hidden rounded-admin-sm border border-admin-border">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-2 bg-admin-tint px-3 py-2 text-xs font-bold text-admin-subtle uppercase">
          <span>Particulars</span>
          <span className="text-right">II Year</span>
          <span className="text-right">III Year</span>
          <span className="text-right">IV Year</span>
        </div>
        <div className="divide-y divide-admin-border">
          {rows.map((row, i) => (
            <div key={row.label} className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-2 px-3 py-2">
              <span className="text-sm font-semibold text-admin-ink">{row.label}{row.footnote ? " *" : ""}</span>
              <Input
                inputMode="numeric"
                placeholder="0"
                value={row.yearII}
                onChange={(e) => updateRow(i, { yearII: e.target.value })}
                className="text-right"
              />
              <Input
                inputMode="numeric"
                placeholder="0"
                value={row.yearIII}
                onChange={(e) => updateRow(i, { yearIII: e.target.value })}
                className="text-right"
              />
              <Input
                inputMode="numeric"
                placeholder="0"
                value={row.yearIV}
                onChange={(e) => updateRow(i, { yearIV: e.target.value })}
                className="text-right"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={isSubmitting}
          onClick={() => {
            onConfirm(rows);
            setRows(DEFAULT_FEE_ROWS);
          }}
        >
          {isSubmitting ? "Preparing…" : "Print certificate"}
        </Button>
      </div>
    </Modal>
  );
}
