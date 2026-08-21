"use client";

import { useMemo, useState } from "react";
import { useBillingAuditLog } from "@/modules/billing/api/fees";
import { PageHeader, filterBarSx, inputSx, clearBtnSx, monoSx } from "@/modules/billing/PageHeader";

// Pixel-exact port of the `isAudit` screen from
// "Billing Module - Web/Billing Admin.dc.html", lines 1565-1582.
//
// Backend reference: EOSbackend1/src/modules/fees-billing/audit-log/*.
// Real audit_logs rows, written by every fees-billing mutation this
// session (payments, concessions, education loan DDs, demand categories,
// fee structures, fee structure items, quotas) and scoped server-side to
// those entity types only. No more fake AUDIT array / sample-data banner.

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function AuditPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useBillingAuditLog();
  const rows = data ?? [];

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter(
      (a) =>
        a.action.toLowerCase().includes(qq) ||
        a.detail.toLowerCase().includes(qq) ||
        a.actor.toLowerCase().includes(qq),
    );
  }, [q, rows]);

  function clear() {
    setQ("");
  }

  return (
    <div>
      <PageHeader title="Audit Log" sub="Every billing action recorded with actor and time" />

      <div style={filterBarSx}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, detail or actor" style={inputSx} />
        <button onClick={clear} style={clearBtnSx}>Clear</button>
      </div>

      <div style={{ transition: "transform .16s ease,border-color .16s ease,box-shadow .16s ease", background: "#fff", border: "1px solid #e6e9ef", borderRadius: 12, padding: "8px 22px 18px" }}>
        {isLoading && (
          <div style={{ padding: 46, textAlign: "center", color: "#64748b", fontSize: 13.5 }}>Loading audit log…</div>
        )}
        {isError && (
          <div style={{ padding: 46, textAlign: "center", color: "#b91c1c", fontSize: 13.5 }}>
            Could not load the audit log. Please try again.
          </div>
        )}
        {!isLoading && !isError && filtered.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 14, padding: "15px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ ...monoSx, fontSize: 12.5, color: "#64748b", width: 130, flex: "0 0 130px" }}>{formatTime(a.time)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.action}</div>
              <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{a.detail}</div>
            </div>
            <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>{a.actor}</div>
          </div>
        ))}
        {!isLoading && !isError && filtered.length === 0 && (
          <div style={{ padding: 46, textAlign: "center" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>No audit entries found</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Try adjusting the search above.</div>
          </div>
        )}
      </div>
    </div>
  );
}
