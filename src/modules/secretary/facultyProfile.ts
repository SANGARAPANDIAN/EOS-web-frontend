import { seed, pick } from "./helpers";
import type { FACULTY } from "./fakeData";

// Ported verbatim from `facultyProfile(f, idx, sem)` (lines 2695-2755 of
// "Secretary Dashboard.dc.html") — a hash-seeded synthetic-detail generator.

type Faculty = (typeof FACULTY)[number];

export function facultyProfile(f: Faculty, idx: number, sem: string) {
  const h = seed(f.name);
  const teaching = f.role.indexOf("Administrator") < 0;
  const subject = f.role.split(" · ")[1] || "Computer Science";
  const allSubjects = [
    { code: "CS8691", name: "Embedded Systems & IoT", semester: "Semester 5", sections: "III year · A & B" },
    { code: "CB8491", name: "Cryptography & Cyber Security", semester: "Semester 6", sections: "III year · A" },
    { code: "CS8591", name: "Computer Networks", semester: "Semester 5", sections: "III year · C" },
    { code: "CS8492", name: subject, semester: "Semester 4", sections: "II year · A & B" },
  ];
  const subjects = sem === "All semesters" ? allSubjects : allSubjects.filter((s) => s.semester === sem);
  const exp = 8 + (h % 16);
  return {
    name: f.name,
    metaLine: `FAC${1000 + idx + 1} · ${f.role.split(" · ")[0]} · CSE`,
    subLine: `${f.role.split(" · ")[0]} · Computer Science & Engineering · ${h % 2 ? "Ph.D. (Computer Science)" : "M.E. (Computer Science)"}`,
    chips: [`ID FAC${1000 + idx + 1}`, teaching ? "Teaching" : "Non-teaching", h % 2 ? "Ph.D." : "M.E. (CSE)", f.status === "On leave" ? "On approved leave" : "On campus", `Advisory class · ${pick(["III-A", "III-B", "II-A", "IV-A"], f.name)}`],
    tiles: [
      { label: "Attendance this term", value: `${90 + (h % 9)}%`, bar: `${90 + (h % 9)}%`, foot: "across working days" },
      { label: "Workload", value: `${f.load} hrs`, bar: "", foot: f.load > 22 ? "above the ceiling" : "full time" },
      { label: "Experience", value: `${exp} yrs`, bar: "", foot: `joined June ${2026 - exp}` },
      { label: "Publications", value: String(10 + (h % 9)), bar: "", foot: "journals & conferences" },
    ],
    detailCards: [
      { title: "Service record", rows: [
        { label: "Staff ID", value: `SECE/CSE/N${100 + idx + 1}` },
        { label: "Designation", value: f.role.split(" · ")[0] },
        { label: "Qualification", value: h % 2 ? "Ph.D. (Computer Science)" : "M.E. (Computer Science)" },
        { label: "Institute email", value: `${f.name.replace(/(Dr|Prof)\.?\s*/, "").replace(/\s|\./g, "").toLowerCase()}@sece.ac.in` },
        { label: "Contact number", value: `+91 ${90000 + (h % 9999)} ${10000 + (h % 89999)}` },
        { label: "Date of joining", value: `${5 + (h % 22)} July ${2026 - exp}` },
        { label: "Total experience", value: `${exp} yrs · ${exp - (h % 4)} in teaching` },
      ] },
      { title: "Research & doctorate", rows: [
        { label: "Specialisation", value: pick(["Data engineering", "Machine learning", "Network security", "Cloud systems"], f.name) },
        { label: "Doctorate", value: h % 2 ? "Awarded · Anna University" : "Pursuing · part time" },
        { label: "Research group", value: "Centre of Excellence in CSE" },
        { label: "Scholars guided", value: `${h % 5} ongoing` },
        { label: "Funded projects", value: `${1 + (h % 4)} · ₹${3 + (h % 9)} lakh sanctioned` },
        { label: "Consultancy", value: h % 3 ? "None currently" : "1 active engagement" },
      ] },
    ],
    periods: `${teaching ? f.load : 40} periods / week`,
    subjects: teaching ? subjects : [],
    noSubjects: !teaching || subjects.length === 0,
    publications: [
      { label: "Journals", value: 6 + (h % 8) },
      { label: "Conferences", value: 2 + (h % 6) },
      { label: "Books / chapters", value: h % 5 },
    ],
    citations: `Scopus h-index ${5 + (h % 12)} · ${40 + (h % 120)} total citations`,
    awards: [`Best Faculty Award · CSE department · ${2021 + (h % 5)}`, "AICTE-ISTE best teacher citation", `NPTEL discipline star mentor · ${2022 + (h % 4)}`],
    duties: ["Module coordinator · CSE", "Anti-ragging committee member", "NBA criteria coordinator", "Library advisory committee"],
    leave: [
      { label: "Casual leave", value: `${h % 12} of 12 used` },
      { label: "Earned leave", value: `${h % 15} of 15 used` },
      { label: "On duty this term", value: `${h % 8} days` },
      { label: "Appraisal 2025-26", value: h % 2 ? "Recommended to Principal" : "Under review" },
    ],
  };
}
