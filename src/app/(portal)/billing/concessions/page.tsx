"use client";

// Real-data pass of the `isConcessions` screen from
// "Billing Module - Web/Billing Admin.dc.html", lines 1344-1413.
//
// GAP (see fees.ts's own comment for the full audit): a real fee_concession
// belongs to a fee_structure (shared by every student on that structure),
// not to one student — there is no per-student "reason", "category" or
// pending/approved/rejected workflow anywhere in the schema, only a real
// is_settled boolean + settled_date. This page reflects that real shape:
// it lists concessions per fee structure and lets Billing toggle
// settled/unsettled (PATCH /fee-concessions/:id), instead of the fake
// per-student approval queue.

import { useMemo, useState } from "react";
import { money } from "@/modules/billing/fakeData";
import { PageHeader, tableWrapSx, thSx, thRightSx, tdSx, monoSx, filterBarSx, inputSx, clearBtnSx } from "@/modules/billing/PageHeader";
import { useFeeConcessions, useFeeStructures, useUpdateFeeConcession } from "@/modules/billing/api/fees";

type SettleStatus = "unsettled" | "settled";

const tabDefs: { key: SettleStatus; label: string }[] = [
  { key: "unsettled", label: "Unsettled" },
  { key: "settled", label: "Settled" },
];

function tabBtnSx(active: boolean) {
  return {
    background: active ? "#1d4ed8" : "#fff",
    color: active ? "#fff" : "#0f172a",
    border: active ? "1px solid #1d4ed8" : "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}
function tabCountSx(active: boolean) {
  return {
    background: active ? "rgba(255,255,255,.22)" : "#f1f5f9",
    color: active ? "#fff" : "#475569",
    borderRadius: 20,
    padding: "2px 8px",
    fontSize: 11.5,
    fontWeight: 700,
    marginLeft: 4,
  } as const;
}

export default function ConcessionsPage() {
  const { data: concessions } = useFeeConcessions();
  const { data: structures } = useFeeStructures();
  const updateConcession = useUpdateFeeConcession();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<SettleStatus>("unsettled");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const enriched = useMemo(
    () =>
      (concessions ?? []).map((c) => ({
        ...c,
        structureName: structures?.find((s) => s.id === c.fee_structure_id)?.name ?? `Fee structure #${c.fee_structure_id}`,
        academicYear: structures?.find((s) => s.id === c.fee_structure_id)?.academic_year ?? "—",
      })),
    [concessions, structures],
  );

  const counts = useMemo(() => {
    const c: Record<SettleStatus, number> = { unsettled: 0, settled: 0 };
    enriched.forEach((r) => c[r.is_settled ? "settled" : "unsettled"]++);
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return enriched.filter((r) => {
      if ((tab === "settled") !== r.is_settled) return false;
      if (qq && !r.structureName.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [enriched, tab, q]);

  function toggleSettled(id: number, concessionAmount: number, toSettled: boolean) {
    updateConcession.mutate(
      { id, input: { concession_amount: concessionAmount, is_settled: toSettled, settled_date: toSettled ? new Date().toISOString().slice(0, 10) : undefined } },
      {
        onSuccess: () => showToast(toSettled ? "Concession marked settled" : "Concession marked unsettled"),
        onError: (err: unknown) => showToast(err instanceof Error ? err.message : "Could not update this concession"),
      },
    );
  }

  function clear() {
    setQ("");
  }

  return (
    <div>
      <PageHeader title="Concessions" sub="Fee-structure concessions and their settlement status" />

      <div style={filterBarSx}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fee structure name" style={inputSx} />
        <button onClick={clear} style={clearBtnSx}>Clear</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {tabDefs.map((t) => (
          <button key={t.key} data-bill-tab onClick={() => setTab(t.key)} style={tabBtnSx(tab === t.key)}>
            {t.label} <span style={tabCountSx(tab === t.key)}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div style={tableWrapSx}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "1px solid #eef1f6" }}>
              <th style={thSx}>Fee Structure</th>
              <th style={{ ...thSx, padding: "14px 10px" }}>Academic Year</th>
              <th style={{ ...thRightSx, padding: "14px 10px" }}>Amount</th>
              <th style={{ ...thSx, padding: "14px 10px" }}>Status</th>
              <th style={thRightSx}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} data-bill-rowtable style={{ borderTop: "1px solid #f1f5f9", position: "relative" }}>
                <td style={tdSx}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.structureName}</div>
                  <div style={{ ...monoSx, fontSize: 11.5, color: "#94a3b8" }}>Fee structure #{c.fee_structure_id}</div>
                </td>
                <td style={{ padding: "13px 10px", fontSize: 13, color: "#475569" }}>{c.academicYear}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", ...monoSx, fontSize: 13, fontWeight: 600 }}>{money(Number(c.concession_amount))}</td>
                <td style={{ padding: "13px 10px" }}>
                  {c.is_settled ? (
                    <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>settled{c.settled_date ? ` · ${c.settled_date}` : ""}</span>
                  ) : (
                    <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>unsettled</span>
                  )}
                </td>
                <td style={tdSx}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    {c.is_settled ? (
                      <button data-bill-soft onClick={() => toggleSettled(c.id, Number(c.concession_amount), false)} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "#0f2d6b" }}>Mark unsettled</button>
                    ) : (
                      <button data-bill-primary onClick={() => toggleSettled(c.id, Number(c.concession_amount), true)} style={{ background: "#1d4ed8", color: "#fff", border: 0, borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Mark settled</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 46, textAlign: "center" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>No concessions found</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Try adjusting the filters above.</div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, boxShadow: "0 10px 24px rgba(15,23,42,.25)", zIndex: 80 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
