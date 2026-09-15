"use client";

import { useState } from "react";
import {
  useFacultySearch,
  useAllotOrder,
  useUpdateAllotment,
  type Allotment,
  type OrderTracking,
} from "./api/finance";
import { FinanceModal, fieldLabelSx, fieldInputSx, fieldMonoSx, fieldRow2Sx } from "./FinanceModal";
import { BLUE, GREY, monoSx } from "./ui";
import { FinanceIcon } from "./icons";

// One allotment dialog, used from both the approval screens and the tracking
// screens so faculty allotment behaves identically wherever it is reached.
// Allotment is only legal once the order is delivered (the database enforces
// it), so the dialog states that plainly rather than letting the user submit
// into a rejection.

export function AllotmentDialog({
  order,
  editing,
  onClose,
  onDone,
}: {
  order: OrderTracking | null;
  editing?: Allotment | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [facultyId, setFacultyId] = useState<number | null>(editing?.faculty_id ?? null);
  const [qty, setQty] = useState(String(editing?.quantity ?? 1));
  const [remarks, setRemarks] = useState(editing?.remarks ?? "");
  const [err, setErr] = useState<string | null>(null);

  const { data: results, isFetching } = useFacultySearch(query);
  const allot = useAllotOrder();
  const update = useUpdateAllotment();

  const deliverable = order
    ? order.delivery_status === "delivered" || order.delivery_status === "partially_delivered"
    : false;
  const remaining = order
    ? order.quantity_delivered - order.quantity_allotted + (editing?.quantity ?? 0)
    : 0;

  function submit() {
    if (!order || !facultyId) return;
    setErr(null);
    const payload = { faculty_id: facultyId, quantity: Number(qty) || 1, remarks: remarks.trim() || undefined };

    const onError = (e: unknown) =>
      setErr(e instanceof Error ? e.message : "Could not save that allotment");

    if (editing) {
      update.mutate(
        { id: editing.id, input: payload },
        { onSuccess: () => onDone("Allotment updated"), onError },
      );
    } else {
      allot.mutate(
        { trackingId: order.id, input: payload },
        { onSuccess: () => onDone("Allotted to faculty"), onError },
      );
    }
  }

  return (
    <FinanceModal
      open={order !== null}
      title={editing ? "Edit allotment" : `Allot ${order?.order_number ?? ""}`}
      sub="Search for the faculty member taking custody of this."
      cta={editing ? "Save allotment" : "Allot"}
      busy={allot.isPending || update.isPending}
      disabled={!facultyId || !deliverable}
      onClose={onClose}
      onSubmit={submit}
      width={560}
    >
      {err && (
        <div style={{ background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 9, padding: "10px 13px", fontSize: 12.2, color: BLUE.strong, fontWeight: 600 }}>
          {err}
        </div>
      )}

      {order && !deliverable && (
        <div style={{ background: GREY.hair, borderRadius: 9, padding: "11px 14px", fontSize: 12.2, color: GREY.text }}>
          This order is not delivered yet, so it cannot be allotted. Advance it to delivered on the tracking
          screen first.
        </div>
      )}

      {order && deliverable && (
        <div style={{ background: BLUE.soft, borderRadius: 9, padding: "11px 14px", fontSize: 12.2, color: BLUE.strong, fontWeight: 600 }}>
          <span style={monoSx}>{remaining}</span> of <span style={monoSx}>{order.quantity_delivered}</span>{" "}
          delivered unit{order.quantity_delivered === 1 ? "" : "s"} still to allot
        </div>
      )}

      <div>
        <div style={fieldLabelSx}>
          Faculty member <span style={{ color: BLUE.primary }}>*</span>
        </div>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFacultyId(null);
          }}
          placeholder="Search by name, staff code or email…"
          style={fieldInputSx}
          disabled={!deliverable}
        />
        <div style={{ maxHeight: 208, overflowY: "auto", border: `1px solid ${GREY.hair}`, borderRadius: 10, marginTop: 8 }}>
          {isFetching && (results ?? []).length === 0 && (
            <div style={{ padding: "12px 14px", fontSize: 12.2, color: GREY.faint }}>Searching…</div>
          )}
          {!isFetching && (results ?? []).length === 0 && (
            <div style={{ padding: "12px 14px", fontSize: 12.2, color: GREY.faint }}>No matching faculty.</div>
          )}
          {(results ?? []).map((f) => {
            const picked = facultyId === f.id;
            return (
              <button
                key={f.id}
                data-fin-row=""
                onClick={() => setFacultyId(f.id)}
                disabled={!deliverable}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 13px",
                  border: 0,
                  borderBottom: `1px solid ${GREY.rule}`,
                  background: picked ? BLUE.soft : "#fff",
                  cursor: deliverable ? "pointer" : "not-allowed",
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 8, background: picked ? BLUE.strong : GREY.hair, color: picked ? "#fff" : GREY.muted, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 28px" }}>
                  <FinanceIcon name="faculty" size={14} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 12.6, fontWeight: 600, color: picked ? BLUE.strong : BLUE.ink }}>
                    {f.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11.3, color: GREY.muted, marginTop: 1 }}>
                    {f.designation ?? "—"}
                    {f.department ? ` · ${f.department}` : ""}
                    {f.staff_code ? ` · ${f.staff_code}` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={fieldRow2Sx}>
        <div>
          <div style={fieldLabelSx}>Quantity</div>
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1" style={fieldMonoSx} disabled={!deliverable} />
        </div>
        <div>
          <div style={fieldLabelSx}>Remarks</div>
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Lab use" style={fieldInputSx} disabled={!deliverable} />
        </div>
      </div>
    </FinanceModal>
  );
}

/** Read-only summary of who currently holds an order. */
export function AllotmentChips({
  allotments,
  onEdit,
  onRemove,
}: {
  allotments: Allotment[];
  onEdit?: (a: Allotment) => void;
  onRemove?: (a: Allotment) => void;
}) {
  if (allotments.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {allotments.map((a) => (
        <div
          key={a.id}
          className="fin-pop"
          style={{ display: "flex", alignItems: "center", gap: 8, background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 999, padding: "5px 8px 5px 11px" }}
        >
          <FinanceIcon name="faculty" size={12} />
          <span style={{ fontSize: 11.8, fontWeight: 600, color: BLUE.strong }}>{a.faculty_name}</span>
          <span style={{ ...monoSx, fontSize: 11, color: BLUE.primary }}>×{a.quantity}</span>
          {onEdit && (
            <button onClick={() => onEdit(a)} title="Edit" style={{ background: "transparent", border: 0, color: BLUE.primary, cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "0 2px" }}>
              Edit
            </button>
          )}
          {onRemove && (
            <button onClick={() => onRemove(a)} title="Remove" style={{ background: "transparent", border: 0, color: GREY.muted, cursor: "pointer", fontSize: 13, fontWeight: 700, lineHeight: 1, padding: "0 3px 0 0" }}>
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
