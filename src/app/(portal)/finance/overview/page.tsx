"use client";

import { useMemo, useState } from "react";
import {
  useCurrentFund,
  useFunds,
  useFundLedger,
  useCreateFund,
  useUpdateFund,
  money,
  moneyCompact,
  statusLabel,
  formatDateTime,
  type FinanceFund,
} from "@/modules/finance/api/finance";
import {
  BLUE,
  GREY,
  cardSx,
  monoSx,
  panelTitleSx,
  filterBarSx,
  inputSx,
  selectSx,
  clearBtnSx,
  primaryBtnSx,
  softBtnSx,
  PageHead,
  StatCard,
  Panel,
  Chip,
  Empty,
  Donut,
} from "@/modules/finance/ui";
import { FinanceModal, fieldLabelSx, fieldInputSx, fieldMonoSx, fieldRow2Sx } from "@/modules/finance/FinanceModal";
import { FinanceIcon } from "@/modules/finance/icons";

// The money itself: set/edit the total amount and read the append-only ledger.
// The balance shown is always the one the database maintains — this screen
// never computes it locally.

export default function FinanceOverviewPage() {
  const { data: current } = useCurrentFund();
  const { data: funds } = useFunds();
  const createFund = useCreateFund();
  const updateFund = useUpdateFund();

  const [selectedFundId, setSelectedFundId] = useState<number | null>(null);
  const activeFundId = selectedFundId ?? current?.id ?? null;
  const activeFund = useMemo(
    () => (funds ?? []).find((f) => f.id === activeFundId) ?? current ?? null,
    [funds, activeFundId, current],
  );

  const { data: ledger, isLoading: ledgerLoading } = useFundLedger(activeFundId);

  const [modal, setModal] = useState<null | { mode: "create" | "edit"; fund?: FinanceFund }>(null);
  const [year, setYear] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function openCreate() {
    const now = new Date();
    // Indian academic year runs July→June.
    const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    setYear(`${start}-${String((start + 1) % 100).padStart(2, "0")}`);
    setAmount("");
    setNotes("");
    setReason("");
    setLocked(false);
    setErr(null);
    setModal({ mode: "create" });
  }

  function openEdit(fund: FinanceFund) {
    setYear(fund.academic_year);
    setAmount(String(fund.total_amount));
    setNotes(fund.notes ?? "");
    setReason("");
    setLocked(fund.is_locked);
    setErr(null);
    setModal({ mode: "edit", fund });
  }

  const parsed = Number(amount);
  const amountChanged = modal?.mode === "edit" && parsed !== (modal.fund?.total_amount ?? 0);
  const canSubmit =
    /^\d{4}-\d{2}$/.test(year.trim()) &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    (!amountChanged || reason.trim().length > 0);

  function submit() {
    setErr(null);
    const input = {
      academic_year: year.trim(),
      total_amount: Math.round(parsed),
      notes: notes.trim() || undefined,
      is_locked: locked,
      reason: reason.trim() || undefined,
    };
    if (modal?.mode === "create") {
      createFund.mutate(input, {
        onSuccess: () => { setModal(null); showToast("Finance fund created"); },
        onError: (e) => setErr(e instanceof Error ? e.message : "Could not create the fund"),
      });
    } else if (modal?.fund) {
      updateFund.mutate(
        { id: modal.fund.id, input },
        {
          onSuccess: () => { setModal(null); showToast("Total amount updated"); },
          onError: (e) => setErr(e instanceof Error ? e.message : "Could not update the fund"),
        },
      );
    }
  }

  const rows = useMemo(() => {
    let list = ledger ?? [];
    if (typeFilter) list = list.filter((l) => l.entry_type === typeFilter);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter((l) => l.narration.toLowerCase().includes(n) || l.source.toLowerCase().includes(n));
    }
    return list;
  }, [ledger, typeFilter, q]);

  const inflow = (ledger ?? [])
    .filter((l) => ["credit", "adjustment_increase", "reversal"].includes(l.entry_type))
    .reduce((s, l) => s + l.amount, 0);
  const outflow = (ledger ?? [])
    .filter((l) => ["debit", "adjustment_decrease"].includes(l.entry_type))
    .reduce((s, l) => s + l.amount, 0);

  return (
    <div>
      <PageHead
        title="Finance Overview"
        sub="The institution's fund, and every movement of money in and out of it"
        actionLabel="Add fund year"
        onAction={openCreate}
      />

      {!activeFund ? (
        <div data-fin-lift="" style={{ ...cardSx, textAlign: "center", padding: "56px 24px" }}>
          <div style={{ display: "flex", justifyContent: "center", color: GREY.border, marginBottom: 14 }}>
            <FinanceIcon name="wallet" size={40} />
          </div>
          <h2 style={panelTitleSx}>No finance fund yet</h2>
          <p style={{ fontSize: 12.6, color: GREY.muted, margin: "8px auto 0", maxWidth: 440, lineHeight: 1.6 }}>
            Create the fund for this academic year and set its total amount. POP and SOP approvals are paid out of it,
            so nothing can be approved until it exists.
          </p>
          <button onClick={openCreate} style={{ ...primaryBtnSx, marginTop: 18, fontSize: 12.6, padding: "12px 22px" }}>
            Set total amount
          </button>
        </div>
      ) : (
        <>
          {(funds ?? []).length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
              {(funds ?? []).map((f) => (
                <button
                  key={f.id}
                  data-fin-soft=""
                  onClick={() => setSelectedFundId(f.id)}
                  style={{
                    ...monoSx,
                    borderRadius: 10,
                    padding: "9px 15px",
                    fontSize: 12.2,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: f.id === activeFundId ? `1px solid ${BLUE.primary}` : `1px solid ${GREY.border}`,
                    background: f.id === activeFundId ? BLUE.soft : "#fff",
                    color: f.id === activeFundId ? BLUE.strong : GREY.text,
                  }}
                >
                  {f.academic_year}
                  {f.is_locked ? " · locked" : ""}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 22 }}>
            <StatCard label="Total fund" value={moneyCompact(activeFund.total_amount)} icon="wallet" hi={activeFund.academic_year} sub="academic year" pct={100} foot={money(activeFund.total_amount)} delay={0} onClick={() => openEdit(activeFund)} />
            <StatCard label="Available" value={moneyCompact(activeFund.available_amount)} icon="overview" hi={`${(100 - activeFund.utilisation_pct).toFixed(1)}%`} sub="unspent" pct={100 - activeFund.utilisation_pct} foot={money(activeFund.available_amount)} delay={55} />
            <StatCard label="Committed" value={moneyCompact(activeFund.committed_amount)} icon="ledger" hi={`${activeFund.utilisation_pct}%`} sub="utilised" pct={activeFund.utilisation_pct} foot={money(activeFund.committed_amount)} delay={110} />
            <StatCard label="Ledger entries" value={String((ledger ?? []).length)} icon="history" hi={moneyCompact(inflow)} sub="total inflow" pct={inflow > 0 ? (outflow / inflow) * 100 : 0} foot={`${moneyCompact(outflow)} outflow`} delay={165} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 22, marginTop: 22 }}>
            <Panel
              title={`Fund position · ${activeFund.academic_year}`}
              action={
                <button data-fin-soft="" onClick={() => openEdit(activeFund)} style={softBtnSx}>
                  Edit total amount
                </button>
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <Donut pct={activeFund.utilisation_pct} label={`${activeFund.utilisation_pct}%`} caption="committed" />
                <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 13 }}>
                  {[
                    { label: "Total sanctioned", value: activeFund.total_amount, strong: true },
                    { label: "Committed", value: activeFund.committed_amount, strong: false },
                    { label: "Available", value: activeFund.available_amount, strong: false },
                  ].map((r) => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, borderBottom: `1px solid ${GREY.rule}`, paddingBottom: 9 }}>
                      <span style={{ fontSize: 12.2, color: GREY.muted }}>{r.label}</span>
                      <span style={{ ...monoSx, fontSize: r.strong ? 15 : 13.5, fontWeight: 700, color: r.strong ? BLUE.primary : BLUE.ink }}>
                        {money(r.value)}
                      </span>
                    </div>
                  ))}
                  {activeFund.notes && (
                    <div style={{ fontSize: 11.8, color: GREY.muted, lineHeight: 1.6 }}>{activeFund.notes}</div>
                  )}
                  {activeFund.is_locked && <Chip variant="quiet">Locked — no further movement accepted</Chip>}
                </div>
              </div>
            </Panel>

            <Panel title="How the ledger works">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "ledger", title: "Append-only", text: "Entries can never be edited or deleted — releasing a commitment adds a reversal instead." },
                  { icon: "shield", title: "No overdraft", text: "A debit that would take the fund below zero is refused by the database itself." },
                  { icon: "approve", title: "No double-spend", text: "One proposal can be debited at most once, even if two approvals race." },
                ].map((t) => (
                  <div key={t.title} data-fin-row="" style={{ display: "flex", gap: 12, padding: "10px 8px" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, background: BLUE.soft, color: BLUE.primary, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 30px" }}>
                      <FinanceIcon name={t.icon} size={15} />
                    </span>
                    <div>
                      <div style={{ fontSize: 12.6, fontWeight: 600, color: BLUE.ink }}>{t.title}</div>
                      <div style={{ fontSize: 11.6, color: GREY.muted, marginTop: 2, lineHeight: 1.55 }}>{t.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div style={{ ...filterBarSx, marginTop: 22 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the ledger by narration or source…" style={inputSx} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectSx}>
              <option value="">All movement types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="adjustment_increase">Adjustment (increase)</option>
              <option value="adjustment_decrease">Adjustment (decrease)</option>
              <option value="reversal">Reversal</option>
            </select>
            {(q || typeFilter) && (
              <button onClick={() => { setQ(""); setTypeFilter(""); }} style={clearBtnSx}>Clear</button>
            )}
          </div>

          <div style={{ ...cardSx, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", gap: 12 }}>
              <div>
                <h2 style={panelTitleSx}>Transaction ledger</h2>
                <p style={{ fontSize: 12.2, color: GREY.muted, margin: "5px 0 0" }}>
                  Every movement, oldest preserved forever.
                </p>
              </div>
              <span style={{ fontSize: 11.8, fontWeight: 600, background: BLUE.soft, color: BLUE.strong, borderRadius: 999, padding: "5px 11px" }}>
                {rows.length} of {(ledger ?? []).length}
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: BLUE.wash, borderTop: `1px solid ${GREY.border}`, borderBottom: `1px solid ${GREY.border}` }}>
                  {["WHEN", "TYPE", "SOURCE", "NARRATION", "BY"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 18px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>{h}</th>
                  ))}
                  {["AMOUNT", "BALANCE"].map((h) => (
                    <th key={h} style={{ textAlign: "right", padding: "12px 18px", fontSize: 10.8, fontWeight: 600, color: GREY.muted, letterSpacing: 0.3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const out = ["debit", "adjustment_decrease"].includes(l.entry_type);
                  return (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${GREY.rule}` }}>
                      <td style={{ padding: "12px 18px", fontSize: 11.8, color: GREY.muted, whiteSpace: "nowrap" }}>{formatDateTime(l.created_at)}</td>
                      <td style={{ padding: "12px 18px" }}>
                        <Chip variant={out ? "outline" : "soft"}>{statusLabel(l.entry_type)}</Chip>
                      </td>
                      <td style={{ padding: "12px 18px", fontSize: 12.2, fontWeight: 600, color: BLUE.ink }}>{statusLabel(l.source)}</td>
                      <td style={{ padding: "12px 18px", fontSize: 12.2, color: GREY.text, maxWidth: 320 }}>{l.narration}</td>
                      <td style={{ padding: "12px 18px", fontSize: 11.6, color: GREY.muted }}>{l.created_by ?? "—"}</td>
                      <td style={{ ...monoSx, padding: "12px 18px", textAlign: "right", fontSize: 12.6, fontWeight: 700, color: out ? BLUE.ink : BLUE.primary }}>
                        {out ? "−" : "+"}
                        {money(l.amount)}
                      </td>
                      <td style={{ ...monoSx, padding: "12px 18px", textAlign: "right", fontSize: 12.2, color: GREY.text }}>{money(l.balance_after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ledgerLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: GREY.faint }}>Loading ledger…</div>}
            {!ledgerLoading && rows.length === 0 && (
              <Empty
                title={(ledger ?? []).length === 0 ? "No movements yet" : "No entries match those filters"}
                hint={(ledger ?? []).length === 0 ? "Approving a POP or SOP records a debit here." : undefined}
              />
            )}
          </div>
        </>
      )}

      <FinanceModal
        open={modal !== null}
        title={modal?.mode === "create" ? "Add fund year" : "Edit total amount"}
        sub={
          modal?.mode === "create"
            ? "Create the fund an academic year's approvals are paid from"
            : "Changing the total posts an adjustment to the ledger — it never overwrites history"
        }
        cta={modal?.mode === "create" ? "Create fund" : "Save changes"}
        busy={createFund.isPending || updateFund.isPending}
        disabled={!canSubmit}
        onClose={() => setModal(null)}
        onSubmit={submit}
      >
        {err && (
          <div style={{ background: BLUE.soft, border: `1px solid ${BLUE.line}`, borderRadius: 9, padding: "10px 13px", fontSize: 12.2, color: BLUE.strong, fontWeight: 600 }}>{err}</div>
        )}
        <div style={fieldRow2Sx}>
          <div>
            <div style={fieldLabelSx}>Academic year</div>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026-27"
              disabled={modal?.mode === "edit"}
              style={{ ...fieldMonoSx, background: modal?.mode === "edit" ? GREY.hair : "#fff" }}
            />
          </div>
          <div>
            <div style={fieldLabelSx}>Total amount (₹)</div>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000000" style={fieldMonoSx} />
          </div>
        </div>
        {amount && Number.isFinite(parsed) && (
          <div style={{ fontSize: 12.2, color: BLUE.primary, fontWeight: 600, marginTop: -6 }}>= {money(Math.round(parsed))}</div>
        )}
        <div>
          <div style={fieldLabelSx}>Notes</div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Annual operational fund" style={fieldInputSx} />
        </div>
        {amountChanged && (
          <div>
            <div style={fieldLabelSx}>
              Reason for the change <span style={{ color: BLUE.primary }}>*</span>
            </div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the total being revised?" style={fieldInputSx} />
            <div style={{ fontSize: 11.3, color: GREY.muted, marginTop: 5 }}>
              Recorded permanently against the ledger adjustment.
            </div>
          </div>
        )}
        {modal?.mode === "edit" && (
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} style={{ width: 15, height: 15 }} />
            <span style={{ fontSize: 12.6, fontWeight: 500, color: GREY.text }}>
              Lock this year — freezes all further movement
            </span>
          </label>
        )}
      </FinanceModal>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: BLUE.ink, color: "#fff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
