// Ported verbatim from `studentsFor(cls)` (line 2769), `markKey`/`markOf`
// (lines 2778-2779), and the `dateLabel`/`markLabel` closures inside
// `renderVals()` (lines 3026-3033) in
// "Secretary Module - Web/Secretary Dashboard.dc.html".

const FIRST_NAMES = ["Aarthi", "Bharath", "Charan", "Divya", "Elakiya", "Fazil", "Gokul", "Harini", "Ishwar", "Jeeva", "Kavya", "Lokesh", "Mahima", "Nandhini", "Oviya", "Pranav", "Rithika", "Sanjay", "Tharun", "Uma", "Vishnu", "Yazhini", "Kiruthika", "Barath"];
const LAST_INITIALS = ["S", "R", "M", "K", "P", "V", "T", "A", "N", "D", "G", "B"];

export interface RosterStudent {
  roll: string;
  name: string;
  pct: number;
}

/** Deterministic 24-student roster per class, same formula as the source —
 * NOT a stored array, generated identically every time for a given class
 * label (e.g. "III-A" always yields the same 24 rows). */
export function studentsFor(cls: string): RosterStudent[] {
  return FIRST_NAMES.map((f, i) => ({
    roll: "22CS" + cls.replace(/[^A-Z]/g, "") + String(101 + i),
    name: f + " " + LAST_INITIALS[i % LAST_INITIALS.length] + ".",
    pct: 72 + ((i * 7 + cls.length * 5) % 26),
  }));
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = String(iso).split("-");
  return p.length === 3 ? `${Number(p[2])} ${MONTH_NAMES[Number(p[1]) - 1].slice(0, 3)} ${p[0]}` : iso;
}

export function markLabel(m: string): string {
  return m === "P" ? "Present" : m === "A" ? "Absent" : "OD";
}
