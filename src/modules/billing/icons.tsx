// Hand-drawn stroke SVG paths, ported verbatim from the sidebar icons in
// "Billing Module - Web/Billing Admin.dc.html" (lines 100-177) — same
// convention as the Secretary module's icons.tsx (NOT a ligature font).

const ICON_PATHS: Record<string, string[]> = {
  dashboard: ["M3 3h7v9H3zM14 3h7v5H14zM3 16h7v5H3zM14 12h7v9H14z"],
  megaphone: ["M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z", "M16 9a4 4 0 0 1 0 6"],
  students: ["M9 8a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 8z", "M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5", "M16 11a3 3 0 0 0 0-6", "M18 20c0-2.4-.9-4.2-2.4-5.2"],
  overview: ["M3 3h7v7H3zM14 3h7v7H14zM3 14h7v7H3zM14 14h7v7H14z"],
  payments: ["M2 5h20v14H2z", "M2 10h20"],
  demand: ["M5 3h14v18l-3-2-2 2-2-2-2 2-3-2z", "M9 8h6M9 12h6"],
  receipts: ["M5 3h14v18l-3-2-2 2-2-2-2 2-3-2z", "M9 8h6M9 12h6"],
  quota: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5"],
  structures: ["M3 4h18v16H3z", "M3 9h18M9 9v11"],
  items: ["M6 3h9l4 4v14H6z", "M10 12h6M10 16h6"],
  concessions: ["M20 12l-8 8-8-8 8-8h8z", "M15 9a1.4 1.4 0 1 0 0 .01"],
  loans: ["M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z", "M9 12l2 2 4-4"],
  refunds: ["M4 9h11a5 5 0 0 1 0 10H9", "M8 5L4 9l4 4"],
  recon: ["M3 7h13l-3-3", "M21 17H8l3 3"],
  reports: ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  audit: ["M12 12a9 9 0 1 0 0 .01", "M12 7v5l4 2"],
  bell: ["M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-3.5-3.5"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  plus: ["M12 5v14M5 12h14"],
  shield: ["M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z"],
  gear: ["M12 12a3 3 0 1 0 0 .01", "M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.4 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.2 1z"],
};

export function BillingIcon({ name, size = 16 }: { name: string; size?: number }) {
  const d = ICON_PATHS[name] ?? ICON_PATHS.dashboard;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
