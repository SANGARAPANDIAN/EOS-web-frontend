"use client";

// Real-data pass of the `isLoans` screen and "Add DD" modal from
// "Billing Module - Web/Billing Admin.dc.html", lines 1415-1459 and
// 1880-1939.
//
// GAP: the real dd_status_enum is received/cleared/bounced (no
// "Deposited") — the status filter/badges/form below use the real values.
// GET /education-loan-dds returns bare rows (no student) — joined
// client-side with the real fee-payments dashboard by
// student_fee_demand_mapping_id, the same real key POST creates against.

import { useMemo, useState } from "react";
import { money } from "@/modules/billing/fakeData";
import { PageHeader, tableWrapSx, thSx, thRightSx, tdSx, monoSx, filterBarSx, inputSx, selectSx, clearBtnSx } from "@/modules/billing/PageHeader";
import { BillingModal, fieldLabelSx, fieldInputSx, fieldMonoSx, fieldRow2Sx } from "@/modules/billing/BillingModal";
import {
  useEducationLoanDds,
  useCreateEducationLoanDd,
  useUpdateEducationLoanDd,
  useFeePaymentsDashboard,
  type EducationLoanDdStatus,
  type FeePaymentDashboardRow,
} from "@/modules/billing/api/fees";

function statusColor(status: EducationLoanDdStatus) {
  if (status === "cleared") return "#1d4ed8";
  if (status === "bounced") return "#b91c1c";
  return "#475569";
}

export default function LoansPage() {
  const { data: dds } = useEducationLoanDds();
  const { data: dashboardRows } = useFeePaymentsDashboard();
  const createDd = useCreateEducationLoanDd();
  const updateDd = useUpdateEducationLoanDd();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | EducationLoanDdStatus>("All");
  const [toast, setToast] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [stuQ, setStuQ] = useState("");
  const [demandMappingId, setDemandMappingId] = useState<number | null>(null);
  const [bank, setBank] = useState("");
  const [amount, setAmount] = useState("");
  const [ack, setAck] = useState("");
  const [error, setError] = useState("");

  const mappingById = useMemo(() => {
    const m = new Map<number, FeePaymentDashboardRow>();
    (dashboardRows ?? []).forEach((r) => m.set(r.student_fee_demand_mapping_id, r));
    return m;
  }, [dashboardRows]);

  const enriched = useMemo(
    () =>
      (dds ?? []).map((d) => {
        const mapping = mappingById.get(d.student_fee_demand_mapping_id);
        return {
          ...d,
          studentName: mapping?.student_name ?? "—",
          registerNumber: mapping?.register_number ?? "—",
          department: mapping?.department ?? "—",
        };
      }),
    [dds, mappingById],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return enriched.filter((d) => {
      if (status !== "All" && d.status !== status) return false;
      if (qq && !(d.dd_reference_number.toLowerCase().includes(qq) || d.studentName.toLowerCase().includes(qq) || d.registerNumber.toLowerCase().includes(qq) || d.bank_name.toLowerCase().includes(qq))) return false;
      return true;
    });
  }, [enriched, status, q]);

  function markCleared(id: number) {
    updateDd.mutate(
      { id, status: "cleared" },
      {
        onSuccess: () => showToast("DD marked cleared"),
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not update this DD"),
      },
    );
  }

  function clear() {
    setQ("");
    setStatus("All");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const studentOptions = useMemo(() => {
    const qq = stuQ.trim().toLowerCase();
    const rows = dashboardRows ?? [];
    if (!qq) return rows.slice(0, 20);
    return rows.filter((s) => (s.student_name ?? "").toLowerCase().includes(qq) || (s.register_number ?? "").toLowerCase().includes(qq));
  }, [dashboardRows, stuQ]);

  const picked = demandMappingId ? mappingById.get(demandMappingId) ?? null : null;

  function openModal() {
    setRef("");
    setStuQ("");
    setDemandMappingId(null);
    setBank("");
    setAmount("");
    setAck("");
    setError("");
    setOpen(true);
  }

  function submit() {
    const amt = Number(amount);
    if (!ref.trim() || !demandMappingId || !bank.trim() || !amt) {
      setError("Please fill in all required fields.");
      return;
    }
    createDd.mutate(
      { demandMappingId, input: { dd_reference_number: ref.trim(), bank_name: bank.trim(), amount: amt, acknowledgement_receipt_no: ack.trim() || undefined } },
      {
        onSuccess: () => {
          setOpen(false);
          showToast("DD added");
        },
        onError: (err: unknown) => setError(err instanceof Error ? err.message : "Could not add this DD"),
      },
    );
  }

  return (
    <div>
      <PageHeader title="Education Loan DD" sub="Demand drafts received against education loans" actionLabel="Add DD" onAction={openModal} />

      <div style={filterBarSx}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search DD reference, student, register no. or bank" style={inputSx} />
        <select value={status} onChange={(e) => setStatus(e.target.value as "All" | EducationLoanDdStatus)} style={selectSx}>
          <option value="All">Status: All</option>
          <option value="received">Received</option>
          <option value="cleared">Cleared</option>
          <option value="bounced">Bounced</option>
        </select>
        <button onClick={clear} style={clearBtnSx}>Clear</button>
      </div>

      <div style={tableWrapSx}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
              <th style={thSx}>DD Reference No.</th>
              <th style={{ ...thSx, padding: "14px 10px" }}>Student</th>
              <th style={{ ...thSx, padding: "14px 10px" }}>Bank</th>
              <th style={{ ...thRightSx, padding: "14px 10px" }}>Amount</th>
              <th style={{ ...thSx, padding: "14px 10px" }}>Status</th>
              <th style={{ ...thSx, padding: "14px 10px" }}>Ack. Receipt</th>
              <th style={thRightSx}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} data-bill-rowtable style={{ borderTop: "1px solid #f1f5f9", position: "relative" }}>
                <td style={{ padding: "13px 18px", ...monoSx, fontSize: 12.5 }}>{d.dd_reference_number}</td>
                <td style={{ padding: "13px 10px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.studentName}</div>
                  <div style={{ ...monoSx, fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                    {d.registerNumber} <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>&middot; {d.department}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 10px", fontSize: 13 }}>{d.bank_name}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", ...monoSx, fontSize: 13, fontWeight: 600 }}>{money(Number(d.amount))}</td>
                <td style={{ padding: "13px 10px", fontSize: 13, fontWeight: 600, color: statusColor(d.status) }}>{d.status}</td>
                <td style={{ padding: "13px 10px", ...monoSx, fontSize: 12.5, color: "#64748b" }}>{d.acknowledgement_receipt_no ?? "—"}</td>
                <td style={tdSx}>
                  {d.status === "received" && (
                    <button data-bill-soft onClick={() => markCleared(d.id)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>Mark cleared</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 46, textAlign: "center" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>No education loan DDs found</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Add a DD to get started.</div>
          </div>
        )}
      </div>

      <BillingModal open={open} title="Add DD" sub="Record an education loan demand draft" cta="Add DD" onClose={() => setOpen(false)} onSubmit={submit} error={error}>
        <div>
          <div style={fieldLabelSx}>DD Reference Number</div>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. DD2025000441" style={fieldMonoSx} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Student (fee demand)</div>
            <span style={{ fontSize: 12, color: "#64748b" }}>{studentOptions.length} matches</span>
          </div>
          <input value={stuQ} onChange={(e) => setStuQ(e.target.value)} placeholder="Search by name or register number" style={{ ...fieldInputSx, fontSize: 13, marginBottom: 8 }} />
          <select value={demandMappingId ?? ""} onChange={(e) => setDemandMappingId(e.target.value ? Number(e.target.value) : null)} size={5} style={{ width: "100%", padding: 6, border: "1px solid #dfe4ec", borderRadius: 9, fontSize: 13.5, background: "#fff" }}>
            <option value="">Select a student fee demand</option>
            {studentOptions.map((o) => (
              <option key={o.student_fee_demand_mapping_id} value={o.student_fee_demand_mapping_id}>{o.student_name} · {o.register_number} · {o.fee_structure_name}</option>
            ))}
          </select>
          {picked && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#f8fafc", border: "1px solid #e6e9ef", borderRadius: 9, padding: "10px 13px", marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{picked.student_name}</div>
                <div style={{ ...monoSx, fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                  {picked.register_number} <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>&middot; {picked.department}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>Outstanding</div>
                <div style={{ ...monoSx, fontSize: 14, fontWeight: 600 }}>{money(Number(picked.outstanding_amount))}</div>
              </div>
            </div>
          )}
        </div>
        <div style={fieldRow2Sx}>
          <div>
            <div style={fieldLabelSx}>Bank Name</div>
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. Canara Bank" style={fieldInputSx} />
          </div>
          <div>
            <div style={fieldLabelSx}>Amount</div>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" style={fieldMonoSx} />
          </div>
        </div>
        <div>
          <div style={fieldLabelSx}>Ack. Receipt No.</div>
          <input value={ack} onChange={(e) => setAck(e.target.value)} placeholder="e.g. ACK25080012" style={fieldMonoSx} />
        </div>
      </BillingModal>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", borderRadius: 9, padding: "12px 18px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 12px 26px rgba(15,23,42,.28)", zIndex: 80 }}>{toast}</div>
      )}
    </div>
  );
}
