// Types + cell/row builder helpers mirroring the design's own generic
// page-template helpers (`txt`, `pillCell`, `barCell`, `table`, `kpi`,
// `panelRow`, `tag`, `toneOf`) in "EDC Module - Web/EDC Portal.dc.html".
// Ported so the 9 Tier-B nav pages (Announcements, Startups, Startup Ideas,
// Incubation, Mentors, Funding, Events, Documents, Reports) can share ONE
// renderer (EdcGenericPage.tsx) fed by a data variant, exactly like the
// design's PAGE_DEFS — not duplicated markup per page.

export type Tone = "green" | "amber" | "red" | "blue" | "slate" | "violet";

const TONE_COLORS: Record<Tone, [string, string]> = {
  green: ["#1d4ed8", "#eff6ff"],
  amber: ["#3b6fd4", "#eff6ff"],
  red: ["#64748b", "#eff6ff"],
  blue: ["#1d4ed8", "#eff6ff"],
  slate: ["#475569", "#eef2f7"],
  violet: ["#1d4ed8", "#eff6ff"],
};

const GREEN_WORDS = ["Approved", "Active", "Verified", "Completed", "Available", "Selected", "Granted", "Won"];
const AMBER_WORDS = ["Pending", "Pending Review", "Documents Pending", "In Progress", "Ongoing", "Limited", "Under Review", "Registrations Open"];
const RED_WORDS = ["Rejected", "Overdue", "Booked", "Not Registered", "Withdrawn"];

export function toneOf(text: string): Tone {
  if (GREEN_WORDS.includes(text)) return "green";
  if (AMBER_WORDS.includes(text)) return "amber";
  if (RED_WORDS.includes(text)) return "red";
  return "slate";
}

export function pillSx(tone: Tone) {
  const [fg, bg] = TONE_COLORS[tone];
  return { display: "inline-block", fontSize: 11.5, fontWeight: 600, color: fg, background: bg, border: `1px solid ${bg === "#eff6ff" ? "#cfe0f7" : "#e6ebf2"}`, borderRadius: 99, padding: "3px 10px" } as const;
}

export function barSx(pct: number, color = "#1d4ed8") {
  return { height: 6, borderRadius: 99, width: `${pct}%`, background: color } as const;
}

export interface Cell {
  text: string;
  kind: "plain" | "pill";
  tone?: Tone;
  sub?: string | null;
  bold?: boolean;
  muted?: boolean;
  mono?: boolean;
  small?: boolean;
  right?: boolean;
  bar?: number;
  barColor?: string;
}

export function txt(text: string, o: { sub?: string; bold?: boolean; muted?: boolean; mono?: boolean; small?: boolean; right?: boolean } = {}): Cell {
  return { text, kind: "plain", sub: o.sub ?? null, bold: o.bold, muted: o.muted, mono: o.mono, small: o.small, right: o.right };
}

export function pillCell(text: string, tone?: Tone): Cell {
  return { text, kind: "pill", tone: tone ?? toneOf(text) };
}

export function barCell(pct: number, color = "#1d4ed8"): Cell {
  return { text: `${pct}%`, kind: "plain", muted: true, bar: pct, barColor: color };
}

export interface TableCol {
  label: string;
  w?: string;
  right?: boolean;
}

export interface TableRow {
  key?: string | number | null;
  tags?: string[];
  cells: Cell[];
}

export interface TableDef {
  title: string;
  badge: string;
  cols: TableCol[];
  rows: TableRow[];
}

export function table(title: string, badge: string, cols: TableCol[], rows: (TableRow | Cell[])[]): TableDef {
  return { title, badge, rows: rows.map((r) => (Array.isArray(r) ? { key: null, tags: [], cells: r } : { tags: [], ...r })), cols };
}

export interface Kpi {
  label: string;
  value: string;
  note: string;
  icon: string;
}

export function kpi(label: string, value: string, note: string, icon: string): Kpi {
  return { label, value, note, icon };
}

export interface PanelRow {
  label: string;
  value: string | number;
  pct: number;
  color: string;
}

export function panelRow(label: string, value: string | number, pct: number, color = "#1d4ed8"): PanelRow {
  return { label, value, pct, color };
}

export interface Panel {
  title: string;
  meta: string;
  note: string;
  rows: PanelRow[];
}

export interface FilterDef {
  label: string;
  options: string[];
}

export interface CardDef {
  tag: string;
  tagTone: Tone;
  status: string;
  statusTone: Tone;
  title: string;
  lines: { icon: string; text: string }[];
}

export interface FeedDef {
  tag: string;
  tagTone: Tone;
  meta: string;
  title: string;
  body: string;
}

export interface ModalFieldDef {
  label: string;
  placeholder: string;
}

export interface PageDef {
  title: string;
  subtitle: string;
  action?: string;
  newTitle?: string;
  newCta?: string;
  newFields?: ModalFieldDef[];
  kpis?: Kpi[];
  kpiGrid?: "3" | "4";
  controls?: boolean;
  chips?: string[];
  search?: string;
  filters?: FilterDef[];
  pipelineTitle?: string;
  pipeline?: { label: string; value: string }[];
  panels?: Panel[];
  cards?: CardDef[];
  feed?: FeedDef[];
  table?: TableDef;
  rowTarget?: "venture" | "idea" | "incubation";
}
