"use client";

import { useState } from "react";
import { useMyBorrowRecords, useSearchBooks, useEResources } from "@/modules/advisor/api/library";

// Design-exact 4-tab layout, reordered per instruction: Search / E-resources
// / Borrowed / History (Search first, so the catalogue is the landing tab).
// Fully real: GET /library/borrow-records (self-scoped server-side to the
// caller's own faculty_id — confirmed via BorrowRecordsService.findAll),
// GET /library/books (open to any authenticated role — no @Roles decorator
// at all, confirmed via RolesGuard), GET /library/e-resources (a real
// Prisma model — title/url/format/license_type — but with NO concept of a
// named external vendor/database like "IEEE Xplore"/"Springer Link"; those
// specific names have zero backing anywhere in schema.prisma and are never
// hardcoded here — this renders whatever real rows a librarian entered).
// Faculty have no borrow/renew/return actions — read-only, per the real
// @Roles guards (those mutations are library-staff/admin only).
//
// Fixed bug: the Search tab previously only fired its query once the user
// typed something and pressed Enter (`enabled: q.length > 0` on the hook) —
// on first open, with real books sitting in the DB, it rendered nothing and
// read as broken. `useSearchBooks` now always fires (the real backend DTO's
// `q` param is optional — an empty q browses the whole catalogue), so the
// tab loads with real results immediately; typing narrows them further.

function statusPill(status: string | null | undefined) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    borrowed: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    returned: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
    overdue: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
    lost: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
    damaged: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
  };
  const t = map[(status ?? "borrowed").toLowerCase()] ?? map.borrowed;
  return { padding: "6px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11.5, fontWeight: 800 } as const;
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

const TABS = ["Search", "E-resources", "Borrowed", "History"] as const;

export default function AdvisorLibraryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Search");

  const borrowed = useMyBorrowRecords("borrowed");
  const history = useMyBorrowRecords(); // unfiltered — every status, filtered client-side below
  const borrowedRows = borrowed.data?.data ?? [];
  const historyRows = (history.data?.data ?? []).filter((r) => r.status !== "borrowed");

  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const search = useSearchBooks(query, availableOnly);
  const books = search.data?.data ?? [];

  const eResources = useEResources();

  const overdueCount = borrowedRows.filter((r) => r.is_overdue).length;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Library</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        Central library · {borrowedRows.length} title{borrowedRows.length === 1 ? "" : "s"} borrowed{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8, marginTop: 20, background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 6 }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <div
              key={t}
              data-advisor-lift=""
              onClick={() => setTab(t)}
              style={{ textAlign: "center", padding: "13px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", background: active ? "#1D4ED8" : "transparent", color: active ? "#fff" : "#0F172A" }}
            >
              {t}
            </div>
          );
        })}
      </div>

      {tab === "Search" && (
        <>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 18, marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or author — leave blank to browse the whole catalogue"
              style={{ flex: "1 1 280px", height: 46, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 500, background: "#F8FAFC" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#475569" }}>
              <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
              Available only
            </label>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#94A3B8" }}>
              {search.isLoading ? "Searching…" : `${books.length} book${books.length === 1 ? "" : "s"}`}
            </div>
          </div>

          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1.1fr 1fr", padding: "15px 22px", borderBottom: "1px solid #EEF1F6", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>
              <div>TITLE</div>
              <div>AUTHOR</div>
              <div>CATEGORY</div>
              <div>ISBN</div>
              <div>RACK</div>
              <div>AVAILABILITY</div>
            </div>
            {books.map((b) => (
              <div key={b.id} data-advisor-lift="" style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1.1fr 1fr", padding: "14px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                  {b.publisher && <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{b.publisher}{b.edition ? ` · ${b.edition}` : ""}</div>}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.author ?? "—"}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{b.category_name}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>{b.isbn ?? "—"}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{b.rack?.rack_code ?? "—"}</div>
                <div>
                  <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: b.available_copies > 0 ? "#EFF6FF" : "#F1F5F9", border: `1px solid ${b.available_copies > 0 ? "#DBEAFE" : "#CBD5E1"}`, color: b.available_copies > 0 ? "#1D4ED8" : "#94A3B8" }}>
                    {b.available_copies > 0 ? `${b.available_copies}/${b.total_copies}` : "NOT AVAILABLE"}
                  </span>
                </div>
              </div>
            ))}
            {books.length === 0 && !search.isLoading && (
              <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
                {query ? `No books match "${query}".` : "No books in the catalogue yet."}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "E-resources" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14, marginTop: 16 }}>
          {(eResources.data?.data ?? [])
            .filter((r) => r.publish_state === "published")
            .map((r) => (
              <div key={r.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, border: "2px solid #1D4ED8" }} />
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginTop: 12 }}>{r.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  {r.license_type && (
                    <span style={{ padding: "5px 11px", borderRadius: 20, background: "#EFF6FF", border: "1px solid #DBEAFE", color: "#1D4ED8", fontSize: 10.5, fontWeight: 800 }}>
                      {r.license_type.toUpperCase()}
                    </span>
                  )}
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>
                    Open →
                  </a>
                </div>
              </div>
            ))}
          {eResources.data && eResources.data.data.filter((r) => r.publish_state === "published").length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "40px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No e-resources published yet.</div>
          )}
        </div>
      )}

      {tab === "Borrowed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {borrowedRows.map((r) => (
            <div key={r.id} data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 58, borderRadius: 6, background: "#EFF6FF", border: "1px solid #DBEAFE", flex: "0 0 44px" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{r.book.title}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 4 }}>{r.book.qr_code ?? "—"}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>
                  Issued {fmtDate(r.borrowed_date)} · Due {fmtDate(r.due_date)}
                </div>
              </div>
              <span style={statusPill(r.is_overdue ? "overdue" : r.status)}>
                {r.is_overdue ? `${r.days_overdue} DAYS OVERDUE` : r.fine_amount ? `₹${r.fine_amount} DUE` : "ON TIME"}
              </span>
            </div>
          ))}
          {borrowedRows.length === 0 && !borrowed.isLoading && (
            <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 54, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>No books currently borrowed.</div>
          )}
        </div>
      )}

      {tab === "History" && (
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 1.1fr 0.8fr 1fr", padding: "15px 22px", borderBottom: "1px solid #EEF1F6", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", color: "#94A3B8" }}>
            <div>TITLE</div>
            <div>ISSUED</div>
            <div>RETURNED</div>
            <div>FINE</div>
            <div>STATUS</div>
          </div>
          {historyRows.map((r) => (
            <div key={r.id} data-advisor-lift="" style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 1.1fr 0.8fr 1fr", padding: "14px 22px", borderBottom: "1px solid #F4F6FA", alignItems: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.book.title}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{fmtDate(r.borrowed_date)}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{fmtDate(r.returned_date)}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: r.fine_paid_amount ? "#DC2626" : "#94A3B8" }}>{r.fine_paid_amount ? `₹${r.fine_paid_amount}` : "—"}</div>
              <div>
                <span style={statusPill(r.status)}>{(r.status ?? "—").toUpperCase()}</span>
              </div>
            </div>
          ))}
          {historyRows.length === 0 && !history.isLoading && (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No borrowing history yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
