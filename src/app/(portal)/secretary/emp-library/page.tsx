"use client";

import { useState } from "react";
import { useMyStaffBorrowRecords, useBookCatalogueSearch } from "@/modules/secretary/api/selfService";

// Pixel-exact layout port of the `isEmpLibrary` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1096-1181.
//
// REAL BACKEND WIRING — ZERO fake data. VIEW-ONLY by explicit design: a
// real book can only be checked out, renewed and returned by library
// staff at the desk (a physical handover/scan), so there is no genuine
// self-service borrow/renew/return action for a Secretary account — the
// earlier self-checkout build was reverted per that call. Borrowed/
// History tabs read via EOSbackend1's `GET /me/library/staff-borrow-
// records`; Search is real via the pre-existing `/library/books`
// catalogue (already open to any authenticated role) but is browse-only
// here, no Borrow button. Honest gap: E-resources has zero backing
// anywhere in the schema (no such table) — shown as an explicit "not
// available" panel, not fabricated content.

const thSx = { fontSize: 11.3, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" as const, color: "#94a3b8" };
const TABS = ["Borrowed", "Search", "E-resources", "History"] as const;

export default function SecretaryEmpLibraryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Borrowed");
  const [query, setQuery] = useState("");

  const { data: records, isLoading, error } = useMyStaffBorrowRecords();
  const { data: catalogue, isLoading: catLoading } = useBookCatalogueSearch(query);

  const borrowed = (records ?? []).filter((r) => r.status === "borrowed");
  const history = (records ?? []).filter((r) => r.status !== "borrowed");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Library</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Central library · {borrowed.length} book(s) currently borrowed · view only, visit the desk to borrow/renew/return</p>
        </div>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 6, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ border: 0, background: tab === t ? "#1d4ed8" : "#ffffff", color: tab === t ? "#ffffff" : "#475569", fontSize: 13.5, fontWeight: tab === t ? 700 : 500, borderRadius: 10, padding: "16px 10px", cursor: "pointer" }}>{t}</button>
        ))}
      </div>

      {tab === "Borrowed" && (
        <div style={{ display: "grid", gap: 18 }}>
          {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading…</div>}
          {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load borrowed books."}</div>}
          {borrowed.map((b) => {
            const overdue = new Date(b.due_date) < new Date();
            return (
              <div key={b.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "20px 22px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ width: 52, height: 66, borderRadius: 8, background: "#f1f5f9", border: "1px solid #e5e9f2", flex: "0 0 auto" }} />
                <div style={{ flex: "1 1 200px", minWidth: 200 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{b.title}</div>
                  <div style={{ fontSize: 12.6, color: "#64748b", marginTop: 4 }}>{b.author}</div>
                  <div style={{ fontSize: 12.2, color: "#94a3b8", marginTop: 6 }}>Issued {b.borrowed_date.slice(0, 10)} · Due {b.due_date.slice(0, 10)}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: overdue ? "#fef2f7" : "#eef4ff", color: overdue ? "#b91c1c" : "#1d4ed8" }}>{overdue ? "OVERDUE" : "ON LOAN"}</span>
              </div>
            );
          })}
          {!isLoading && !error && borrowed.length === 0 && (
            <div style={{ padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No books currently borrowed.</div>
          )}
        </div>
      )}

      {tab === "Search" && (
        <div>
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 20, display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or author" style={{ height: 46, border: "1px solid #e5e9f2", borderRadius: 10, padding: "0 14px", fontSize: 13.1, color: "#0f172a", background: "#ffffff", boxSizing: "border-box", flex: "1 1 220px" }} />
          </div>
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1fr 0.9fr", gap: 12, padding: "16px 22px", borderBottom: "1px solid #eef2f7" }}>
              <span style={thSx}>Title</span><span style={thSx}>Author</span><span style={thSx}>Category</span><span style={thSx}>Availability</span>
            </div>
            {catLoading && <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>Loading…</div>}
            {(catalogue ?? []).map((c) => (
              <div key={c.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1fr 0.9fr", gap: 12, alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #f5f7fa" }}>
                <span style={{ fontSize: 13.1, fontWeight: 700 }}>{c.title}</span>
                <span style={{ fontSize: 12.6, color: "#475569" }}>{c.author ?? "—"}</span>
                <span style={{ fontSize: 12.2, color: "#94a3b8" }}>{c.category_name}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: c.available_copies > 0 ? "#eef4ff" : "#f1f5f9", color: c.available_copies > 0 ? "#1d4ed8" : "#475569", justifySelf: "start" }}>{c.available_copies > 0 ? "AVAILABLE" : "NOT AVAILABLE"}</span>
              </div>
            ))}
            {!catLoading && (catalogue ?? []).length === 0 && (
              <div style={{ padding: 20, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No matching books.</div>
            )}
          </div>
        </div>
      )}

      {tab === "E-resources" && (
        <div style={{ padding: 44, textAlign: "center", fontSize: 12.6, color: "#94a3b8", background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14 }}>
          No e-resources subscription list exists in the backend yet — this panel isn&apos;t backed by any real table (confirmed, not built here).
        </div>
      )}

      {tab === "History" && (
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 0.9fr", gap: 12, padding: "16px 22px", borderBottom: "1px solid #eef2f7" }}>
            <span style={thSx}>Title</span><span style={thSx}>Issued</span><span style={thSx}>Returned</span><span style={thSx}>Status</span>
          </div>
          {history.map((r) => (
            <div key={r.id} data-sec-row="" style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 0.9fr", gap: 12, alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #f5f7fa" }}>
              <span style={{ fontSize: 13.1, fontWeight: 700 }}>{r.title}</span>
              <span style={{ fontSize: 12.6, color: "#475569" }}>{r.borrowed_date.slice(0, 10)}</span>
              <span style={{ fontSize: 12.6, color: "#475569" }}>{r.returned_date?.slice(0, 10) ?? "—"}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: "#eef4ff", color: "#1d4ed8", justifySelf: "start" }}>{r.status.toUpperCase()}</span>
            </div>
          ))}
          {history.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No past borrow history yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
