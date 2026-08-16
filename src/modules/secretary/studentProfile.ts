import { seed, pick } from "./helpers";
import type { REPORT_STUDENTS } from "./fakeData";

// Ported verbatim from `studentProfile(rec)` (lines 2571-2693 of
// "Secretary Dashboard.dc.html") — a hash-seeded synthetic-detail generator.
// Same input record ALWAYS produces the same output (deterministic hash,
// not Math.random()) — do not replace with random generation.

type ReportStudent = (typeof REPORT_STUDENTS)[number];

export function studentProfile(rec: ReportStudent) {
  const h = seed(rec.roll);
  const year = rec.section.split("-")[0];
  const yearNum = ({ I: 1, II: 2, III: 3, IV: 4 } as Record<string, number>)[year] || 3;
  const sem = yearNum * 2;
  const batch = `${2026 - yearNum} – ${2030 - yearNum}`;
  const pct = (rec.cgpa * 9.5).toFixed(1);
  const dept = "Computer Science & Engineering";
  const first = rec.name.replace(/\s+[A-Z]\.$/, "");
  const father = pick(["B. Balasubramanian", "K. Murugesan", "S. Ramanathan", "M. Selvaraj", "T. Anbarasu"], rec.roll);
  const mother = pick(["Mangai Balasubramanian", "Kalaivani Murugesan", "Vasanthi Ramanathan", "Jeyanthi Selvaraj", "Amutha Anbarasu"], rec.roll, 1);
  const city = pick(["Namakkal", "Coimbatore", "Erode", "Tiruppur", "Salem"], rec.roll, 2);
  const gradeOf = (t: number) => (t >= 65 ? "A" : t >= 55 ? "B+" : t >= 50 ? "B" : "RA");
  const subjectSets: Record<number, [string, string][]> = {
    8: [["Cryptography & Network Security", "CS8792"], ["Machine Learning", "CS8082"], ["Big Data Analytics", "CS8091"], ["Total Quality Management", "GE8077"], ["Project Work Phase II", "CS8811"], ["Data Warehousing", "CS8075"]],
    6: [["Computer Networks", "CS8591"], ["Compiler Design", "CS8602"], ["Cloud Computing", "CS8791"], ["Mobile Computing", "CS8601"], ["Embedded Systems & IoT", "CS8691"], ["Professional Ethics", "GE8076"]],
    4: [["Operating Systems", "CS8451"], ["Database Management Systems", "CS8492"], ["Design & Analysis of Algorithms", "CS8461"], ["Probability & Statistics", "MA8402"], ["Java Programming", "CS8493"], ["Environmental Science", "GE8291"]],
  };
  const set = subjectSets[sem] || subjectSets[6];
  const subjects = set.map(([name, code], i) => {
    const internal = 28 + ((h + i * 7) % 21);
    const endSem = 48 + ((h + i * 13) % 50);
    const total = Math.round(internal * 0.6 + endSem * 0.35);
    const grade = gradeOf(total);
    return { name, code, internal: `${internal}/50`, endSem: `${endSem}/100`, total, grade, gradeFg: grade === "RA" ? "#1d4ed8" : "#0f172a", attendance: 62 + ((h + i * 11) % 34) };
  });
  const semesters: { label: string; gpa: string; bar: string; credits: string; status: string; stFg: string }[] = [];
  for (let i = 1; i < sem; i++) {
    const gpa = (6.2 + ((h + i * 37) % 290) / 100).toFixed(2);
    const arrear = (h + i) % 7 === 0;
    semesters.push({ label: `Sem ${i}`, gpa, bar: `${Math.round((parseFloat(gpa) / 10) * 100)}%`, credits: `${20 + ((h + i) % 5)} credits`, status: arrear ? "1 arrear" : "All clear", stFg: arrear ? "#b45309" : "#0f172a" });
  }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const months = monthNames.map((m, i) => {
    const p = 72 + ((h + i * 23) % 27);
    return { month: m, pct: p, bar: `${Math.round((p / 100) * 200)}px` };
  });
  return {
    name: rec.name.indexOf(".") > 0 ? `${first} ${father.split(" ").pop()}` : rec.name,
    metaLine: `${rec.roll} · CSE · Semester ${sem}`,
    subLine: `${dept} · Semester ${sem} · Section ${rec.section.split("-")[1]} · Batch ${batch}`,
    idIssued: `09 Aug ${2026 - yearNum}`,
    chips: [`Reg ${rec.roll}`, `Roll CSE${2024000 + (h % 900)}`, h % 2 ? "Day scholar" : "Hosteller", h % 3 ? "Fees: Paid" : "Fees: Part paid", rec.cgpa >= 8 ? "Placed" : "Not placed"],
    tiles: [
      { label: "Attendance", value: `${rec.attendance}%`, bar: `${rec.attendance}%`, foot: rec.attendance < 75 ? "below the 75% norm" : "above the 75% norm" },
      { label: "CGPA", value: rec.cgpa.toFixed(2), bar: "", foot: `${1 + (h % 12)} of 12 in section` },
      { label: "Percentage (CGPA × 9.5)", value: `${pct}%`, bar: "", foot: `${100 + (h % 60)} credits earned` },
      { label: "Arrears", value: String(rec.arrears), bar: "", foot: rec.arrears === 0 ? "no pending papers" : `${rec.arrears} paper(s) pending` },
    ],
    detailCards: [
      { title: "Personal details", rows: [
        { label: "Date of birth", value: `${10 + (h % 18)} Nov ${2026 - yearNum - 18}` },
        { label: "Gender", value: h % 2 ? "Female" : "Male" },
        { label: "Blood group", value: pick(["B+", "O+", "A+", "AB+", "O-"], rec.roll, 3) },
        { label: "Mother tongue", value: "Tamil" },
        { label: "Community", value: pick(["BC", "MBC", "OC", "SC"], rec.roll, 4) },
        { label: "Admission quota", value: h % 2 ? "Management quota" : "Government quota" },
        { label: "Date of admission", value: `09 Aug ${2026 - yearNum}` },
        { label: "Admission number", value: `ADM/${2026 - yearNum}/${300 + (h % 99)}` },
        { label: "Personal email", value: `${first.toLowerCase()}${h % 99}@gmail.com` },
        { label: "Aadhaar number", value: `XXXX XXXX ${1000 + (h % 8999)}` },
      ] },
      { title: "Contact, mentor & residence", rows: [
        { label: "Student mobile", value: `+91 ${98000 + (h % 1999)} ${10000 + (h % 89999)}` },
        { label: "Institute email", value: `${first.toLowerCase()}.${h % 999}cse@sece.ac.in` },
        { label: "Address", value: `${10 + (h % 80)}/C, Anna Nagar East, ${city}` },
        { label: "District", value: `${city} district, Tamil Nadu` },
        { label: "Class advisor", value: pick(["Dr. S. Bala Murugan", "Dr. M. Latha", "Prof. V. Karthick"], rec.roll, 5) },
        { label: "Faculty mentor", value: pick(["Prof. R. Vaishnavi", "Dr. K. Anitha", "Prof. S. Ravikumar"], rec.roll, 6) },
        { label: "Residence / transport", value: h % 2 ? `Day scholar · college bus route ${1 + (h % 9)}` : "Hosteller · Block B" },
      ] },
      { title: "Academic details", rows: [
        { label: "Department", value: dept },
        { label: "Programme", value: `B.E. ${dept}` },
        { label: "Batch / academic year", value: batch },
        { label: "Year · semester · section", value: `${year} Year · Semester ${sem} · Section ${rec.section.split("-")[1]}` },
        { label: "Admission type", value: "Regular" },
        { label: "Current CGPA · percentage", value: `${rec.cgpa.toFixed(2)} · ${pct}%` },
        { label: "Arrears / backlogs", value: rec.arrears === 0 ? "None" : `${rec.arrears} pending` },
      ] },
      { title: "Address details", rows: [
        { label: "Permanent address", value: `${10 + (h % 80)}/C, Anna Nagar East, ${city}` },
        { label: "Communication address", value: "Same as permanent" },
        { label: "City", value: city },
        { label: "District", value: `${city} district, Tamil Nadu` },
        { label: "State", value: "Tamil Nadu" },
        { label: "Pincode", value: String(637000 + (h % 900)) },
      ] },
    ],
    parents: [
      { role: "FATHER", photo: "father photo", name: father, occupation: pick(["Farmer", "Businessman", "Government employee", "Driver"], rec.roll, 7), phone: `+91 ${95000 + (h % 4999)} ${10000 + (h % 89999)}`, note: `${father.split(" ").pop()!.toLowerCase()}.${h % 99}@gmail.com`, primary: true },
      { role: "MOTHER", photo: "mother photo", name: mother, occupation: pick(["School teacher", "Homemaker", "Tailor", "Nurse"], rec.roll, 8), phone: `+91 ${95000 + (h % 3999)} ${10000 + (h % 79999)}`, note: `Annual family income · ₹${3 + (h % 8)},00,000 per annum`, primary: false },
    ],
    guardian: [
      { label: "Guardian", value: "Same as father" },
      { label: "Guardian mobile", value: `+91 ${95000 + (h % 4999)} ${10000 + (h % 89999)}` },
      { label: "Guardian email", value: `${father.split(" ").pop()!.toLowerCase()}.${h % 99}@gmail.com` },
    ],
    school: [
      { level: "CLASS X", school: pick(["St. Joseph's Hr. Sec. School", "Government Hr. Sec. School", "Vidhya Vikas Hr. Sec. School"], rec.roll, 9), board: "State Board", percent: `${68 + (h % 28)}.4%`, hasMarks: false, marks: [] as { subject: string; mark: string }[] },
      { level: "CLASS XII", school: pick(["Kongu Hr. Sec. School", "Sri Vidya Mandir", "Government Boys Hr. Sec. School"], rec.roll, 10), board: `State Board · engineering cutoff ${160 + (h % 39)}.2`, percent: `${66 + (h % 30)}.1%`, hasMarks: true, marks: [{ subject: "Maths", mark: `${80 + (h % 20)}/100` }, { subject: "Physics", mark: `${65 + (h % 30)}/100` }, { subject: "Chemistry", mark: `${70 + (h % 28)}/100` }] },
    ],
    semesters, months, subjects,
    fees: [
      { label: "Scholarship", value: h % 2 ? "First graduate concession" : "None" },
      { label: "Hostel / transport fee", value: `₹${18 + (h % 12)},000 · paid` },
      { label: "Fees status", value: "₹1,25,000 paid in full" },
      { label: "Placement", value: rec.cgpa >= 8 ? "Offer received" : "In process" },
      { label: "Discipline", value: "No incidents on record" },
    ],
    achievements: [`NPTEL Elite certificate · ${85 + (h % 14)}%`, `NSS volunteer · ${60 + (h % 50)} hours logged`, h % 2 ? "Inter-college hackathon finalist" : "Paper presented at a national symposium"],
    docsNote: `Admissions office file · Aadhaar XXXX XXXX ${1000 + (h % 8999)} · community ${pick(["BC", "MBC", "OC", "SC"], rec.roll, 4)}`,
    documents: [
      { name: "Passport-size photograph", status: "On file" },
      { name: "Class X mark sheet", status: "Original verified" },
      { name: "Class XII / Diploma mark sheet", status: "Original verified" },
      { name: "Transfer certificate", status: "Received" },
      { name: "Community certificate", status: "Received" },
      { name: "Aadhaar copy", status: "Received" },
      { name: "Migration certificate", status: h % 3 ? "Received" : "Pending" },
    ],
  };
}
