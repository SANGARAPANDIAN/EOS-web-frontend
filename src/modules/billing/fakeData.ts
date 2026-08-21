// Exact port of the embedded demo dataset from
// "Billing Module - Web/Billing Admin.dc.html"'s own <script type="text/x-dc">
// block (Component.makeStudents(), state.structures/routes/items/
// concessions/dds/refunds/recon/audit/announcements, and the money()
// formatter) — not an approximation, the same names/amounts/ids as the
// design source itself. Pixel-exact frontend-first pass; real EOSbackend1
// wiring is a later pass, same process used for the Secretary/EDC modules.

export function money(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  let out: string;
  if (s.length <= 3) out = s;
  else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    out = rest + "," + last3;
  }
  return "₹" + (n < 0 ? "-" : "") + out;
}
export function crore(n: number): string {
  return "₹" + (n / 1e7).toFixed(2) + " Cr";
}

export interface BillingStudent {
  id: number;
  name: string;
  reg: string;
  prog: string;
  dept: string;
  batch: string;
  quota: string;
  structure: string;
  demand: number;
  paid: number;
  last: string;
  payments: { date: string; cat: string; receipt: string; mode: string; amount: number }[];
}

function makeStudents(): BillingStudent[] {
  const first = ["Aravind", "Divya", "Karthik", "Meenakshi", "Naveen", "Priya", "Rahul", "Sandhya", "Vignesh", "Yamini", "Bharath", "Charulatha", "Dinesh", "Gayathri", "Harish", "Ishwarya", "Jeeva", "Kavya", "Lokesh", "Mahalakshmi", "Nithish", "Oviya", "Pradeep", "Ramya", "Surya", "Tharun", "Uma", "Varun", "Wasim", "Zoya", "Akash", "Bhavani", "Chandru", "Deepika", "Elango", "Farhana"];
  const last = ["Kumar", "Rajan", "Subramanian", "Venkatesh", "Anand", "Murugan", "Iyer", "Balaji", "Nair", "Selvam"];
  const deps: [string, string, string][] = [
    ["B.Tech Computer Science and Engineering", "Computer Science and Engineering", "CS"],
    ["B.Tech Artificial Intelligence and Data Science", "AI and Data Science", "AD"],
    ["B.E Electronics and Communication", "Electronics and Communication", "EC"],
    ["B.E Mechanical Engineering", "Mechanical Engineering", "ME"],
    ["B.E Civil Engineering", "Civil Engineering", "CE"],
    ["B.Tech Information Technology", "Information Technology", "IT"],
  ];
  const quotas = ["Government Quota", "Management Quota", "NRI Quota", "Sports Quota"];
  const structures = ["Government Quota Tuition 2025-26", "Management Quota Tuition 2025-26", "NRI Tuition 2025-26", "Hostel Fee 2025-26", "Transport Fee 2025-26", "AIDS Hostel 2027-28"];
  const modes = ["UPI", "Card", "Net Banking", "DD", "Cash"];
  const cats = ["Tuition Fee", "Examination Fee", "Hostel Fee", "Transport Fee", "Lab Fee"];
  let s = 4711;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const list: BillingStudent[] = [];
  for (let i = 0; i < 36; i++) {
    const d = deps[i % deps.length];
    const name = first[i % first.length] + " " + last[(i * 3) % last.length];
    const demand = [67000, 87000, 128000, 74000, 96000][Math.floor(rnd() * 5)];
    const r = rnd();
    let paid: number;
    if (r < 0.22) paid = demand;
    else if (r < 0.34) paid = 0;
    else paid = Math.round((demand * (0.2 + rnd() * 0.6)) / 1000) * 1000 + 1;
    const batch = ["2022_2026", "2023_2027", "2024_2028", "2025_2029"][(i + Math.floor(i / 6)) % 4];
    const day = 4 + Math.floor(rnd() * 10);
    const payments: BillingStudent["payments"] = [];
    let rem = paid;
    const n = paid === 0 ? 0 : 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++) {
      const amt = k === n - 1 ? rem : Math.round(rem / 2 / 1000) * 1000;
      rem -= amt;
      payments.push({
        date: String(day - k).padStart(2, "0") + " Aug 2026",
        cat: cats[(i + k) % cats.length],
        receipt: "RCPT-" + String(1001 + i * 3 + k),
        mode: modes[(i + k) % modes.length],
        amount: amt,
      });
    }
    list.push({
      id: i + 1,
      name,
      reg: "REG22" + d[2] + String(i + 1).padStart(3, "0"),
      prog: d[0],
      dept: d[1],
      batch,
      quota: quotas[i % quotas.length],
      structure: structures[i % structures.length],
      demand,
      paid,
      last: paid === 0 ? "—" : String(day).padStart(2, "0") + " Aug 2026",
      payments,
    });
  }
  return list;
}

export const STUDENTS: BillingStudent[] = makeStudents();
export function byId(id: number): BillingStudent {
  return STUDENTS.find((s) => s.id === id) ?? STUDENTS[0];
}
export function initialsOf(name: string): string {
  return name.split(" ").map((x) => x[0]).join("").slice(0, 2);
}
export function statusOf(s: BillingStudent): "paid" | "partial" | "pending" {
  return s.paid >= s.demand ? "paid" : s.paid === 0 ? "pending" : "partial";
}

export const DEPARTMENTS = ["Computer Science and Engineering", "AI and Data Science", "Electronics and Communication", "Mechanical Engineering", "Civil Engineering", "Information Technology"];
export const DEPT_ROLL: Record<string, number> = { "Computer Science and Engineering": 2416, "AI and Data Science": 1874, "Electronics and Communication": 1958, "Mechanical Engineering": 1522, "Civil Engineering": 986, "Information Technology": 1492 };
export const BATCHES = ["2022_2026", "2023_2027", "2024_2028", "2025_2029"];
export const QUOTAS = [
  { id: 1, name: "Government Quota" },
  { id: 2, name: "Management Quota" },
  { id: 3, name: "NRI Quota" },
  { id: 4, name: "Sports Quota" },
];

export interface FeeStructure {
  id: number; name: string; group: "education" | "hostel" | "bus"; applies: string; quota: string; amount: number;
  basis?: string; gender?: string; room?: string; occ?: string; mess?: string; block?: string;
  year: string; study: string; created: string;
}
export const STRUCTURES: FeeStructure[] = [
  { id: 1, name: "Government Quota Tuition 2026-27", group: "education", applies: "Demand", quota: "Government Quota", amount: 76000, basis: "All government quota students", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 2, name: "Management Quota Tuition 2026-27", group: "education", applies: "Demand", quota: "Management Quota", amount: 146000, basis: "All management quota students", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 3, name: "Examination Fee 2026-27", group: "education", applies: "Examination", quota: "None", amount: 5400, basis: "Per semester, all programmes", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 4, name: "Laboratory Fee 2026-27", group: "education", applies: "Laboratory", quota: "None", amount: 11000, basis: "Engineering programmes", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 5, name: "Library and Digital Resources 2026-27", group: "education", applies: "Library", quota: "None", amount: 3650, basis: "All programmes", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 6, name: "Government Quota Tuition 2025-26", group: "education", applies: "Demand", quota: "Government Quota", amount: 73000, basis: "All government quota students", year: "2025-26", study: "II Year", created: "08 Aug 2026" },
  { id: 7, name: "Management Quota Tuition 2025-26", group: "education", applies: "Demand", quota: "Management Quota", amount: 140000, basis: "All management quota students", year: "2025-26", study: "II Year", created: "08 Aug 2026" },
  { id: 8, name: "Examination Fee 2025-26", group: "education", applies: "Examination", quota: "None", amount: 5200, basis: "Per semester, all programmes", year: "2025-26", study: "II Year", created: "08 Aug 2026" },
  { id: 9, name: "Laboratory Fee 2025-26", group: "education", applies: "Laboratory", quota: "None", amount: 10500, basis: "Engineering programmes", year: "2025-26", study: "II Year", created: "08 Aug 2026" },
  { id: 10, name: "Library and Digital Resources 2025-26", group: "education", applies: "Library", quota: "None", amount: 3500, basis: "All programmes", year: "2025-26", study: "II Year", created: "08 Aug 2026" },
  { id: 11, name: "Government Quota Tuition 2024-25", group: "education", applies: "Demand", quota: "Government Quota", amount: 70000, basis: "All government quota students", year: "2024-25", study: "III Year", created: "08 Aug 2026" },
  { id: 12, name: "Management Quota Tuition 2024-25", group: "education", applies: "Demand", quota: "Management Quota", amount: 134000, basis: "All management quota students", year: "2024-25", study: "III Year", created: "08 Aug 2026" },
  { id: 13, name: "Examination Fee 2024-25", group: "education", applies: "Examination", quota: "None", amount: 5000, basis: "Per semester, all programmes", year: "2024-25", study: "III Year", created: "08 Aug 2026" },
  { id: 14, name: "Laboratory Fee 2024-25", group: "education", applies: "Laboratory", quota: "None", amount: 10000, basis: "Engineering programmes", year: "2024-25", study: "III Year", created: "08 Aug 2026" },
  { id: 15, name: "Library and Digital Resources 2024-25", group: "education", applies: "Library", quota: "None", amount: 3350, basis: "All programmes", year: "2024-25", study: "III Year", created: "08 Aug 2026" },
  { id: 16, name: "Government Quota Tuition 2023-24", group: "education", applies: "Demand", quota: "Government Quota", amount: 67000, basis: "All government quota students", year: "2023-24", study: "IV Year", created: "08 Aug 2026" },
  { id: 17, name: "Management Quota Tuition 2023-24", group: "education", applies: "Demand", quota: "Management Quota", amount: 128000, basis: "All management quota students", year: "2023-24", study: "IV Year", created: "08 Aug 2026" },
  { id: 18, name: "Examination Fee 2023-24", group: "education", applies: "Examination", quota: "None", amount: 4800, basis: "Per semester, all programmes", year: "2023-24", study: "IV Year", created: "08 Aug 2026" },
  { id: 19, name: "Laboratory Fee 2023-24", group: "education", applies: "Laboratory", quota: "None", amount: 9500, basis: "Engineering programmes", year: "2023-24", study: "IV Year", created: "08 Aug 2026" },
  { id: 20, name: "Library and Digital Resources 2023-24", group: "education", applies: "Library", quota: "None", amount: 3200, basis: "All programmes", year: "2023-24", study: "IV Year", created: "08 Aug 2026" },
  { id: 21, name: "Boys Hostel AC 2-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 148000, gender: "Boys", room: "AC", occ: "2 per room", mess: "Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 22, name: "Boys Hostel AC 2-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 157000, gender: "Boys", room: "AC", occ: "2 per room", mess: "Non-Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 23, name: "Boys Hostel AC 3-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 126000, gender: "Boys", room: "AC", occ: "3 per room", mess: "Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 24, name: "Boys Hostel AC 3-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 135000, gender: "Boys", room: "AC", occ: "3 per room", mess: "Non-Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 25, name: "Boys Hostel Non-AC 4-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 86000, gender: "Boys", room: "Non-AC", occ: "4 per room", mess: "Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 26, name: "Boys Hostel Non-AC 4-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 95000, gender: "Boys", room: "Non-AC", occ: "4 per room", mess: "Non-Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 27, name: "Boys Hostel Non-AC 6-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 68000, gender: "Boys", room: "Non-AC", occ: "6 per room", mess: "Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 28, name: "Boys Hostel Non-AC 6-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 77000, gender: "Boys", room: "Non-AC", occ: "6 per room", mess: "Non-Veg mess", block: "Bharathi Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 29, name: "Girls Hostel AC 2-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 148000, gender: "Girls", room: "AC", occ: "2 per room", mess: "Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 30, name: "Girls Hostel AC 2-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 157000, gender: "Girls", room: "AC", occ: "2 per room", mess: "Non-Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 31, name: "Girls Hostel AC 3-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 126000, gender: "Girls", room: "AC", occ: "3 per room", mess: "Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 32, name: "Girls Hostel AC 3-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 135000, gender: "Girls", room: "AC", occ: "3 per room", mess: "Non-Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 33, name: "Girls Hostel Non-AC 4-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 86000, gender: "Girls", room: "Non-AC", occ: "4 per room", mess: "Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 34, name: "Girls Hostel Non-AC 4-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 95000, gender: "Girls", room: "Non-AC", occ: "4 per room", mess: "Non-Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 35, name: "Girls Hostel Non-AC 6-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 68000, gender: "Girls", room: "Non-AC", occ: "6 per room", mess: "Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
  { id: 36, name: "Girls Hostel Non-AC 6-Share", group: "hostel", applies: "Hostel", quota: "None", amount: 77000, gender: "Girls", room: "Non-AC", occ: "6 per room", mess: "Non-Veg mess", block: "Kaveri Block", year: "2026-27", study: "I Year", created: "08 Aug 2026" },
];

export interface BusRoute { id: number; name: string; from: string; to: string; km: string; stops: { n: number; name: string; km: string; fare: number }[] }
export const ROUTES: BusRoute[] = [
  { id: 1, name: "Route 1", from: "College", to: "Ukkadam", km: "24 km", stops: [
    { n: 1, name: "Kinathukadavu", km: "8 km", fare: 6000 },
    { n: 2, name: "Karpagam Stop", km: "15 km", fare: 14000 },
    { n: 3, name: "Ukkadam", km: "24 km", fare: 20000 },
  ] },
  { id: 2, name: "Route 2", from: "College", to: "Gandhipuram", km: "31 km", stops: [
    { n: 1, name: "Malumichampatti", km: "10 km", fare: 7000 },
    { n: 2, name: "Sundarapuram", km: "18 km", fare: 13000 },
    { n: 3, name: "Ramanathapuram", km: "25 km", fare: 19000 },
    { n: 4, name: "Gandhipuram", km: "31 km", fare: 24000 },
  ] },
  { id: 3, name: "Route 3", from: "College", to: "Pollachi", km: "38 km", stops: [
    { n: 1, name: "Kottampatti", km: "12 km", fare: 8000 },
    { n: 2, name: "Zamin Uthukuli", km: "26 km", fare: 18000 },
    { n: 3, name: "Pollachi", km: "38 km", fare: 27000 },
  ] },
  { id: 4, name: "Route 4", from: "College", to: "Mettupalayam", km: "52 km", stops: [
    { n: 1, name: "Chettipalayam", km: "9 km", fare: 7000 },
    { n: 2, name: "Peelamedu", km: "27 km", fare: 20000 },
    { n: 3, name: "Saravanampatti", km: "38 km", fare: 27000 },
    { n: 4, name: "Mettupalayam", km: "52 km", fare: 34000 },
  ] },
];

export const ITEMS = [
  { id: 1, structure: "Government Quota Tuition 2025-26", cat: "Tuition Fee", amount: 60000, conc: 0 },
  { id: 2, structure: "Government Quota Tuition 2025-26", cat: "Examination Fee", amount: 4000, conc: 0 },
  { id: 3, structure: "Government Quota Tuition 2025-26", cat: "Lab Fee", amount: 3000, conc: 0 },
  { id: 4, structure: "Management Quota Tuition 2025-26", cat: "Tuition Fee", amount: 118000, conc: 5000 },
  { id: 5, structure: "Management Quota Tuition 2025-26", cat: "Examination Fee", amount: 6000, conc: 0 },
  { id: 6, structure: "Hostel Fee 2025-26", cat: "Hostel Fee", amount: 78000, conc: 0 },
  { id: 7, structure: "Hostel Fee 2025-26", cat: "Mess Advance", amount: 8000, conc: 0 },
  { id: 8, structure: "Transport Fee 2025-26", cat: "Transport Fee", amount: 24000, conc: 2000 },
];

export const CONCESSIONS = [
  { id: 1, sid: 3, reason: "Merit scholarship", cat: "Tuition Fee", amount: 15000, status: "pending" as const },
  { id: 2, sid: 7, reason: "Sports achievement", cat: "Tuition Fee", amount: 20000, status: "approved" as const },
  { id: 3, sid: 12, reason: "Staff ward", cat: "Tuition Fee", amount: 33500, status: "pending" as const },
  { id: 4, sid: 18, reason: "Sibling concession", cat: "Hostel Fee", amount: 8000, status: "approved" as const },
  { id: 5, sid: 21, reason: "Financial hardship", cat: "Tuition Fee", amount: 12000, status: "pending" as const },
  { id: 6, sid: 26, reason: "Merit scholarship", cat: "Examination Fee", amount: 4000, status: "rejected" as const },
];

export const DDS = [
  { id: 1, sid: 2, ref: "DD2025000441", bank: "Canara Bank", amount: 67000, status: "Received", ack: "ACK25080012" },
  { id: 2, sid: 9, ref: "DD2025000512", bank: "State Bank of India", amount: 128000, status: "Deposited", ack: "ACK25080031" },
  { id: 3, sid: 14, ref: "DD2025000618", bank: "Indian Bank", amount: 74000, status: "Realised", ack: "ACK25080044" },
  { id: 4, sid: 23, ref: "DD2025000703", bank: "Union Bank", amount: 96000, status: "Received", ack: "—" },
];

export const REFUNDS = [
  { id: 1, sid: 5, no: "RFD-2026-014", reason: "Withdrawal before term start", amount: 42000, status: "pending" as const, settled: null as string | null },
  { id: 2, sid: 11, no: "RFD-2026-015", reason: "Duplicate online payment", amount: 25000, status: "pending" as const, settled: null },
  { id: 3, sid: 19, no: "RFD-2026-016", reason: "Transport opt-out", amount: 12000, status: "approved" as const, settled: "11 Aug 2026" },
  { id: 4, sid: 28, no: "RFD-2026-017", reason: "Hostel vacated mid-term", amount: 31000, status: "rejected" as const, settled: "09 Aug 2026" },
];

export const RECON = [
  { id: 1, bankRef: "HDFC/NEFT/889210", date: "13 Aug 2026", order: "order_TOAXhxzzB8CoB2", amount: 40000, matched: false },
  { id: 2, bankRef: "HDFC/UPI/771204", date: "13 Aug 2026", order: "order_QLM31ZzaTr90", amount: 25001, matched: true },
  { id: 3, bankRef: "ICICI/NEFT/442118", date: "12 Aug 2026", order: "—", amount: 128000, matched: false },
  { id: 4, bankRef: "HDFC/UPI/771788", date: "12 Aug 2026", order: "order_BB19dkwMz2", amount: 67000, matched: true },
  { id: 5, bankRef: "SBI/DD/000441", date: "11 Aug 2026", order: "—", amount: 74000, matched: false },
];

export const AUDIT = [
  { time: "14 Aug 2026 10:24", action: "Payment received", detail: "RCPT-1042 · ₹25,000 · UPI", actor: "S. Meenakshi" },
  { time: "14 Aug 2026 09:58", action: "Concession approved", detail: "Sports achievement · ₹20,000", actor: "S. Meenakshi" },
  { time: "13 Aug 2026 17:05", action: "Reconciliation closed", detail: "42 entries matched, 3 pending", actor: "System" },
  { time: "13 Aug 2026 15:12", action: "Fee structure created", detail: "Transport Route B 2027-28", actor: "R. Prakash" },
  { time: "13 Aug 2026 11:40", action: "DD marked deposited", detail: "DD2025000512 · State Bank of India", actor: "S. Meenakshi" },
  { time: "12 Aug 2026 16:30", action: "Refund rejected", detail: "RFD-2026-017 · ₹31,000", actor: "Principal's office" },
];

export const ANNOUNCEMENTS = [
  { id: 1, tag: "URGENT", time: "Today · 08:10", title: "Last date for odd semester tuition fee is 20 Aug", body: "Students with outstanding tuition demand must clear the balance at the billing counter or through the portal before 20 Aug. Hall tickets will not be released against unpaid demand.", audience: "Students with dues", author: "Billing office", status: "PUBLISHED" },
  { id: 2, tag: "FEES", time: "Today · 07:40", title: "Counter timings revised to 09:00 – 16:30", body: "The fee counter will close at 16:30 from this week onward to allow same-day reconciliation. Online payments remain available until midnight.", audience: "All students", author: "Billing office", status: "PUBLISHED" },
  { id: 3, tag: "SCHOLARSHIP", time: "Yesterday", title: "Post-matric scholarship claims open until 28 Aug", body: "Eligible students must submit the income certificate and bank mandate at the billing office. Concession will reflect on the demand within three working days of verification.", audience: "All students", author: "Scholarship cell", status: "PUBLISHED" },
  { id: 4, tag: "GENERAL", time: "04 Aug", title: "Education loan DD acknowledgement process", body: "DDs handed over at the counter now receive a printed acknowledgement with the DD reference number. Retain it until the amount reflects against your demand.", audience: "All students", author: "Billing office", status: "PUBLISHED" },
  { id: 5, tag: "FEES", time: "02 Aug · scheduled", title: "Transport fee instalment two due 30 Aug", body: "Route-wise instalment details are on the transport notice board. Late payment attracts a fine of ₹250 per week.", audience: "All students", author: "Transport office", status: "SCHEDULED" },
];
export function tagColors(t: string): { bg: string; fg: string } {
  const c: Record<string, [string, string]> = { URGENT: ["#f1f5f9", "#0f2d6b"], FEES: ["#eef3ff", "#1d4ed8"], SCHOLARSHIP: ["#eef3ff", "#1d4ed8"], GENERAL: ["#f1f5f9", "#334155"] };
  const [bg, fg] = c[t] ?? ["#f1f5f9", "#334155"];
  return { bg, fg };
}

export const DASHBOARD = {
  collectedToday: money(842500),
  pendingDD: String(DDS.filter((d) => d.status !== "Realised").length),
  structureCount: String(STRUCTURES.length),
  unmatchedCount: String(RECON.filter((r) => !r.matched).length),
};
