"use client";

// Shared print styling + letterhead for the Student/Faculty profile pages'
// real "Print profile" action. Previously this button only called
// `flash(...)` — a placeholder toast with no actual print — per user
// report. Real fix: `window.print()` plus a dedicated `@media print`
// stylesheet that (a) hides the app shell (header/sidebar/buttons/toasts —
// all marked `data-no-print` in SecretaryShell.tsx and each profile page's
// own action row), (b) turns the on-screen card grid into a clean,
// single-column paginated document with a proper institution letterhead,
// and (c) keeps section cards from splitting across a page break.
//
// No data is re-fetched or duplicated for print — the same real DOM
// already rendered from live `useStudentProfile`/`useFacultyProfile` data
// is simply re-styled for the print media, so whatever is accurate on
// screen is exactly what prints.

export function PrintProfileStyles() {
  return (
    <style jsx global>{`
      @media print {
        @page {
          margin: 16mm 14mm;
        }
        html,
        body {
          background: #ffffff !important;
        }
        [data-no-print] {
          display: none !important;
        }
        [data-print-root] {
          display: block !important;
          padding: 0 !important;
          gap: 0 !important;
        }
        [data-print-root] > * {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        [data-sec-lift],
        [data-print-root] div {
          box-shadow: none !important;
        }
        [data-print-root] [data-print-card] {
          border: 1px solid #d7dce4 !important;
          border-radius: 6px !important;
          margin-bottom: 12px !important;
        }
      }
      @media screen {
        [data-print-letterhead] {
          display: none;
        }
      }
    `}</style>
  );
}

export function PrintLetterhead({ title, subtitle }: { title: string; subtitle: string }) {
  const printedAt = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div data-print-letterhead="" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #1e3a8a", paddingBottom: 14, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 48, borderRadius: "6px 6px 20px 20px", background: "#1e3a8a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 700, letterSpacing: 0.5 }}>SE</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>Sri Eshwar College of Engineering</div>
          <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>{title}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "#64748b" }}>{subtitle}</div>
        <div style={{ fontSize: 10.3, color: "#94a3b8" }}>Printed {printedAt}</div>
      </div>
    </div>
  );
}
