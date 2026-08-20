// Ported verbatim from the `ic(name, size)` method in
// "Secretary Module - Web/Secretary Dashboard.dc.html" (line 2912) — hand-
// drawn stroke SVG paths, NOT a ligature icon font (unlike EDC's Material
// Symbols, this matches the Advisor module's approach). Every path array
// below is copied byte-for-byte from the design's own `P` dictionary.

const ICON_PATHS: Record<string, string[]> = {
  dashboard: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  megaphone: ["M3 11v2a1 1 0 001 1h1l3 5 2-1-2-4h3l7 4V5l-7 4H4a1 1 0 00-1 1z", "M19 9v6"],
  trending: ["M3 17l6-6 4 4 7-7", "M15 8h5v5"],
  receipt: ["M6 3h12v18l-3-2-3 2-3-2-3 2z", "M9 8h6M9 12h6"],
  clipboard: ["M9 4h6v3H9z", "M7 5H5v16h14V5h-2", "M9 12l2 2 4-4"],
  camera: ["M3 8h4l2-3h6l2 3h4v12H3z", "M12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"],
  pin: ["M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z", "M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"],
  exit: ["M14 4h5v16h-5", "M4 12h9", "M10 8l4 4-4 4"],
  calcheck: ["M4 6h16v15H4z", "M4 10h16M8 3v4M16 3v4", "M9 15l2 2 4-4"],
  calendarPage: ["M4 6h16v15H4z", "M4 10h16M8 3v4M16 3v4", "M8 14h3M8 17h8M13 14h3"],
  star: ["M12 4l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.8-5 2.8 1-5.6-4-3.9 5.5-.8z"],
  library: ["M5 4h14v16H5z", "M12 4v16"],
  rupee: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M9 8h6M9 11h6M13.5 8c0 3-4.5 3-4.5 3l4 5"],
  faculty: ["M12 11a4 4 0 100-8 4 4 0 000 8z", "M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"],
  students: ["M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z", "M2 20c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5", "M17 9.5a3 3 0 100-6", "M18 14.6c2.4.6 4 2.3 4 5.4"],
  folder: ["M3 6h6l2 3h10v11H3z"],
  building: ["M4 21V5l8-3 8 3v16", "M9 21v-5h6v5", "M8 9h2M14 9h2M8 13h2M14 13h2"],
  award: ["M12 15a5 5 0 100-10 5 5 0 000 10z", "M8.5 14.5L7 22l5-2.6L17 22l-1.5-7.5"],
  briefcase: ["M3 8h18v12H3z", "M9 8V5h6v3", "M3 13h18"],
  gear: [
    "M12 15a3 3 0 100-6 3 3 0 000 6z",
    "M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2v.2a2 2 0 01-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 01-2.8-2.8l.1-.1A1.7 1.7 0 002.6 15a2 2 0 010-4h.2a1.7 1.7 0 001.2-2.9l-.1-.1A2 2 0 016.7 5.2l.1.1A1.7 1.7 0 009.7 4.1V4a2 2 0 014 0v.2a1.7 1.7 0 002.9 1.1l.1-.1a2 2 0 012.8 2.8l-.1.1A1.7 1.7 0 0021.4 11h.2a2 2 0 010 4h-.2a1.7 1.7 0 00-2 0z",
  ],
  bell: ["M18 15V10a6 6 0 10-12 0v5l-2 3h16z", "M10 21h4"],
  search: ["M11 18a7 7 0 100-14 7 7 0 000 14z", "M20 20l-4-4"],
  menu: ["M4 7h16M4 12h16M4 17h16"],
  plus: ["M12 5v14M5 12h14"],
  shield: ["M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9z"],
};

export function SecretaryIcon({ name, size = 18 }: { name: string; size?: number }) {
  const d = ICON_PATHS[name] ?? ICON_PATHS.dashboard;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
