// Ported verbatim from the design reference's `ico(kind)` function in
// "Advisor (Final) - Web/Faculty Portal.dc.html" — same path data, same
// viewBox/stroke settings. Do not "clean up" or swap for a different icon
// set; this file exists specifically so the sidebar glyphs are pixel-exact
// rather than an approximated Material Symbols substitute.
import type { SVGProps } from "react";

export type AdvisorIconKind =
  | "dashboard"
  | "reports"
  | "announcements"
  | "attendance"
  | "leave"
  | "od"
  | "assignment"
  | "subject"
  | "cia"
  | "results"
  | "venue"
  | "payroll"
  | "payslip"
  | "appraisal"
  | "library";

const PATHS: Record<AdvisorIconKind, React.ReactNode> = {
  dashboard: (
    <>
      <rect x={3} y={3} width={7} height={7} rx={1.6} />
      <rect x={14} y={3} width={7} height={7} rx={1.6} />
      <rect x={3} y={14} width={7} height={7} rx={1.6} />
      <rect x={14} y={14} width={7} height={7} rx={1.6} />
    </>
  ),
  reports: (
    <>
      <path d="M3 17l5-5 3.5 3.5L21 7" />
      <path d="M16 7h5v5" />
    </>
  ),
  announcements: (
    <>
      <path d="M4 10v4h3l6 4V6L7 10H4z" />
      <path d="M17 9.5a4 4 0 010 5" />
    </>
  ),
  attendance: (
    <>
      <rect x={3} y={5} width={18} height={16} rx={2.5} />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M9 15.5l2 2 4-4" />
    </>
  ),
  leave: (
    <>
      <rect x={4} y={4} width={16} height={17} rx={2.5} />
      <path d="M8 3v3M16 3v3M8 12h8M8 16h5" />
    </>
  ),
  od: (
    <>
      <circle cx={12} cy={8} r={3.6} />
      <path d="M5.5 20a6.5 6.5 0 0113 0" />
    </>
  ),
  assignment: (
    <>
      <rect x={5} y={4} width={14} height={17} rx={2.5} />
      <path d="M9 3h6v3H9zM9 11h6M9 15h4" />
    </>
  ),
  subject: (
    <>
      <path d="M5 4h9a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" />
      <path d="M8 8h7M8 12h7" />
    </>
  ),
  cia: (
    <>
      <path d="M5 20V11M12 20V5M19 20v-6" />
      <path d="M3 20h18" />
    </>
  ),
  results: (
    <>
      <circle cx={12} cy={9} r={5.2} />
      <path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5" />
    </>
  ),
  venue: (
    <>
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M9 21v-6h6v6M9 11h.01M15 11h.01" />
    </>
  ),
  payroll: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M9.5 8.5h5M9.5 11h5M13.5 8.5c1.5 0 2 1 2 2s-.5 2-2.5 2h-2l3.5 3.5" />
    </>
  ),
  payslip: (
    <>
      <rect x={5} y={3} width={14} height={18} rx={2.5} />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  appraisal: <path d="M12 3.5l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8z" />,
  library: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H11v18H6.5A2.5 2.5 0 014 18.5v-13z" />
      <path d="M20 5.5A2.5 2.5 0 0017.5 3H13v18h4.5a2.5 2.5 0 002.5-2.5v-13z" />
    </>
  ),
};

export function AdvisorIcon({ kind, ...props }: { kind: AdvisorIconKind } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={19}
      height={19}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {PATHS[kind]}
    </svg>
  );
}
