// Literal sample data ported VERBATIM from the embedded script in
// "Secretary Module - Web/Secretary Dashboard.dc.html" (constructor state,
// lines ~2418-2517, plus the inline dashboard literals in renderVals lines
// ~3260-3280). Skeleton-first pass — same process as the EDC module: exact
// design fake data now, real EOSbackend1 wiring in a later pass. Nothing
// here is invented; every field/value is copied from the design source.

// POPS/SOPS — DELETED. pop/page.tsx and sop/page.tsx now read/write
// exclusively through EOSbackend1's real `/me/purchase-requests` and
// `/me/service-requests` modules (see src/modules/secretary/api/
// procurement.ts). Do not re-add fake POPS/SOPS constants here.

// MEDIA_REQUESTS — DELETED. media/page.tsx now reads/writes exclusively
// through EOSbackend1's real /media-requests module (see
// src/modules/secretary/api/mediaRequests.ts). Do not re-add a fake
// constant here.

// VENUE_BOOKINGS — DELETED. venue/page.tsx now reads/writes exclusively
// through EOSbackend1's real /venues + /venue-bookings modules (see
// src/modules/secretary/api/venues.ts). Do not re-add a fake constant here.

export const OUTPASSES = [
  { id: 1, ref: "OP-2026-318", name: "M. Divya", roll: "22CSIIIA118", section: "III-A", mentor: "Dr. K. Anitha", kind: "Medical", slot: "11:00 – 16:00", date: "13 Aug 2026", reason: "Dental appointment at Ganga Hospital; parent will pick her up at the gate.", parent: "+91 98••• ••214", status: "Pending" },
  { id: 2, ref: "OP-2026-319", name: "R. Vignesh", roll: "22CSIIIB104", section: "III-B", mentor: "Prof. S. Ravikumar", kind: "Placement drive", slot: "08:30 – 18:00", date: "13 Aug 2026", reason: "Off-campus interview at Zoho, Chennai. Call letter attached.", parent: "+91 96••• ••077", status: "Pending" },
  { id: 3, ref: "OP-2026-311", name: "A. Nithya", roll: "22CSIVA131", section: "IV-A", mentor: "Dr. R. Sundari", kind: "Home visit", slot: "14:00 – 20:00", date: "12 Aug 2026", reason: "Family function; hostel warden intimated in advance.", parent: "+91 90••• ••455", status: "Approved" },
  { id: 4, ref: "OP-2026-306", name: "K. Arun Prasad", roll: "22CSIIB126", section: "II-B", mentor: "Prof. V. Karthick", kind: "Personal", slot: "10:00 – 13:00", date: "11 Aug 2026", reason: "Reason not verifiable and no parent confirmation received.", parent: "+91 94••• ••832", status: "Rejected" },
];

// ISSUES — DELETED. students/page.tsx now reads exclusively from real
// EOSbackend1 data (see src/modules/secretary/api/overview.ts). No
// "escalation/issue" concept exists anywhere in the real schema — the
// design's Open Escalations panel was replaced with a real "students
// below 75% attendance" panel instead of faking this feature.

export const DOCS = [
  { id: 1, name: "CSE course files · odd semester 2026-27", category: "Course file", owner: "Secretary desk", size: "48 MB", status: "Verified", updated: "12 Aug", version: 4 },
  { id: 2, name: "DBMS lab record master copy", category: "Lab record", owner: "Dr. M. Latha", size: "12 MB", status: "Pending", updated: "11 Aug", version: 2 },
  { id: 3, name: "Department circulars · Aug 2026", category: "Circular", owner: "Secretary desk", size: "3 MB", status: "Verified", updated: "10 Aug", version: 7 },
  { id: 4, name: "NBA Criterion 4 attainment sheets", category: "Accreditation", owner: "NBA coordinator", size: "22 MB", status: "Pending", updated: "09 Aug", version: 3 },
  { id: 5, name: "Class committee MoM compilation", category: "Meeting", owner: "Secretary desk", size: "6 MB", status: "Verified", updated: "06 Aug", version: 5 },
  { id: 6, name: "Faculty duty allocation chart", category: "Circular", owner: "Secretary desk", size: "1 MB", status: "Missing", updated: "02 Aug", version: 1 },
];

// NOTICES — DELETED. announcements/page.tsx and dashboard/page.tsx now
// read exclusively through the real EOSbackend1 /announcements module
// (see src/modules/secretary/api/announcements.ts).

export const EVENTS = [
  { id: 1, title: "Workshop on Applied Machine Learning", kind: "Two-day workshop", when: "22-23 Aug", venue: "CSE Lab 3", owner: "Dr. R. Sundari", status: "Approved", regs: 124, cap: 180 },
  { id: 2, title: "Guest lecture · Cloud native systems", kind: "Guest lecture", when: "19 Aug", venue: "Seminar hall", owner: "Prof. S. Ravikumar", status: "Awaiting approval", regs: 86, cap: 150 },
  { id: 3, title: "Hackathon · Code Eshwar 4.0", kind: "Symposium", when: "05 Sep", venue: "Main auditorium", owner: "Prof. V. Karthick", status: "Planning", regs: 210, cap: 400 },
  { id: 4, title: "Industry connect · alumni panel", kind: "Panel", when: "29 Aug", venue: "Room 302", owner: "Dr. M. Latha", status: "Approved", regs: 58, cap: 90 },
];

// SECTIONS — DELETED. students/page.tsx now computes real per-section
// strength/attendance client-side from the real roster fetch (see
// src/modules/secretary/api/overview.ts). No real "class rep"/"mentor"
// directory exists anywhere in the schema — dropped, not faked.

export const ACTIVITIES = [
  { id: 1, title: "CAE-II · question paper upload", day: "14", month: "Aug", meta: "All 6 CSE courses · scheme of evaluation attached", status: "In progress", progress: 65 },
  { id: 2, title: "Project review phase 2", day: "15", month: "Aug", meta: "IV year · 3 panels · 42 batches", status: "Scheduled", progress: 20 },
  { id: 3, title: "CAE-II examination window", day: "18", month: "Aug", meta: "18-22 Aug · FN session · 4 halls", status: "Scheduled", progress: 10 },
  { id: 4, title: "DBMS lab record verification", day: "20", month: "Aug", meta: "III-A, III-B · 121 records", status: "In progress", progress: 48 },
  { id: 5, title: "Course file closure · even semester", day: "08", month: "Aug", meta: "24 files · attainment sheets included", status: "Completed", progress: 100 },
];

export const MEETINGS = [
  { id: 1, title: "Department academic review · August", when: "12 Aug, 03:00 pm", venue: "CSE seminar hall", attendees: 24, chair: "HoD · CSE", momStatus: "Recorded", mom: "Attainment for CAE-I reviewed. Slow learners list to be shared by 16 Aug. Lab manuals revised for III semester.", actions: [{ label: "Share slow learner list", done: false }, { label: "Revise lab manual", done: true }] },
  { id: 2, title: "NBA Criterion 4 preparation", when: "14 Aug, 11:00 am", venue: "HoD chamber", attendees: 8, chair: "NBA coordinator", momStatus: "Pending", mom: "", actions: [{ label: "Collect attainment sheets", done: false }, { label: "Draft Criterion 4 note", done: false }] },
  { id: 3, title: "Class committee meeting · III year", when: "16 Aug, 02:00 pm", venue: "Room 304", attendees: 18, chair: "Secretary desk", momStatus: "Scheduled", mom: "", actions: [{ label: "Invite class reps", done: true }] },
  { id: 4, title: "Placement readiness sync", when: "08 Aug, 10:00 am", venue: "Placement cell", attendees: 12, chair: "Placement officer", momStatus: "Recorded", mom: "148 students shortlisted for the Zoho drive. Mock interview slots scheduled 19-21 Aug.", actions: [{ label: "Publish mock slots", done: true }, { label: "Share shortlist to mentors", done: false }] },
];

export const REPORT_STUDENTS = [
  { roll: "22CSIIIB109", name: "Ishwar N.", section: "III-B", attendance: 62, cgpa: 6.4, arrears: 3 },
  { roll: "22CSIIIA104", name: "Divya K.", section: "III-A", attendance: 71, cgpa: 7.2, arrears: 1 },
  { roll: "22CSIIB126", name: "Arun Prasad K.", section: "II-B", attendance: 68, cgpa: 6.8, arrears: 2 },
  { roll: "22CSIVA121", name: "Vishnu D.", section: "IV-A", attendance: 74, cgpa: 8.1, arrears: 0 },
  { roll: "22CSIIIB102", name: "Bharath R.", section: "III-B", attendance: 73, cgpa: 6.1, arrears: 4 },
  { roll: "22CSIVA131", name: "Nithya A.", section: "IV-A", attendance: 94, cgpa: 9.1, arrears: 0 },
  { roll: "22CSIIA118", name: "Harini S.", section: "II-A", attendance: 96, cgpa: 8.9, arrears: 0 },
  { roll: "22CSIIIA118", name: "Divya M.", section: "III-A", attendance: 91, cgpa: 8.7, arrears: 0 },
  { roll: "22CSIVA106", name: "Fazil M.", section: "IV-A", attendance: 88, cgpa: 8.6, arrears: 0 },
  { roll: "22CSIIB114", name: "Nandhini V.", section: "II-B", attendance: 84, cgpa: 6.9, arrears: 2 },
  { roll: "22CSIIIA111", name: "Kavya P.", section: "III-A", attendance: 79, cgpa: 6.5, arrears: 3 },
];

export const ATT_HISTORY = [
  { date: "2026-08-12", cls: "III-A", hour: "Hour 1 · 08:45", by: "Ms. R. Kavitha", at: "09:12 am", present: 21, absent: 2, od: 1, changes: [{ roll: "22CSIIIA104", name: "Divya K.", from: "P", to: "A" }, { roll: "22CSIIIA111", name: "Kavya P.", from: "P", to: "A" }, { roll: "22CSIIIA117", name: "Rithika T.", from: "P", to: "OD" }] },
  { date: "2026-08-12", cls: "III-B", hour: "Hour 3 · 10:50", by: "Ms. R. Kavitha", at: "11:40 am", present: 19, absent: 5, od: 0, changes: [{ roll: "22CSIIIB102", name: "Bharath R.", from: "P", to: "A" }, { roll: "22CSIIIB109", name: "Ishwar N.", from: "P", to: "A" }] },
  { date: "2026-08-11", cls: "II-A", hour: "Hour 2 · 09:40", by: "Ms. R. Kavitha", at: "10:05 am", present: 24, absent: 0, od: 0, changes: [] },
  { date: "2026-08-10", cls: "IV-A", hour: "Hour 5 · 01:30", by: "Ms. R. Kavitha", at: "02:20 pm", present: 20, absent: 1, od: 3, changes: [{ roll: "22CSIVA106", name: "Fazil M.", from: "P", to: "OD" }, { roll: "22CSIVA118", name: "Sanjay A.", from: "P", to: "OD" }, { roll: "22CSIVA121", name: "Vishnu D.", from: "P", to: "A" }] },
  { date: "2026-08-08", cls: "III-A", hour: "Hour 4 · 11:45", by: "Ms. R. Kavitha", at: "12:30 pm", present: 22, absent: 2, od: 0, changes: [{ roll: "22CSIIIA104", name: "Divya K.", from: "P", to: "A" }, { roll: "22CSIIIA120", name: "Uma G.", from: "P", to: "A" }] },
  { date: "2026-08-06", cls: "III-B", hour: "Hour 1 · 08:45", by: "Ms. R. Kavitha", at: "09:05 am", present: 23, absent: 1, od: 0, changes: [{ roll: "22CSIIIB109", name: "Ishwar N.", from: "P", to: "A" }] },
];

export const FACULTY = [
  { name: "Dr. K. Anitha", role: "Professor · Data Structures", load: 18, duties: 4, mentees: 32, status: "Available", next: "CAE-II invigilation, 18 Aug FN" },
  { name: "Prof. S. Ravikumar", role: "AP (SG) · Networks", load: 22, duties: 6, mentees: 30, status: "On duty", next: "Lab audit walkthrough, 14 Aug" },
  { name: "Dr. M. Latha", role: "Professor · DBMS", load: 16, duties: 3, mentees: 28, status: "Available", next: "NBA Criterion 4 review, 16 Aug" },
  { name: "Prof. J. Deepak", role: "AP · Operating Systems", load: 24, duties: 7, mentees: 34, status: "Overloaded", next: "Project review panel 2, 15 Aug" },
  { name: "Dr. R. Sundari", role: "Associate Professor · AI", load: 19, duties: 5, mentees: 31, status: "On leave", next: "Returns 18 Aug" },
  { name: "Prof. V. Karthick", role: "AP · Web Technologies", load: 20, duties: 4, mentees: 29, status: "Available", next: "Workshop hall setup, 20 Aug" },
];

// Dashboard-only literals from the design's own renderVals() (lines
// ~3258-3280) — DELETED. The dashboard now reads exclusively from real
// EOSbackend1 data (see src/modules/secretary/api/overview.ts and
// dashboard/page.tsx) per explicit instruction to remove every fake value
// from that screen. Do not re-add fake DASHBOARD_* constants here.

// REPORT_STUDENTS below is still used by attendance/page.tsx and
// students/page.tsx, which remain fake pending a later conversion pass
// (out of scope for the dashboard/reports rewiring).
