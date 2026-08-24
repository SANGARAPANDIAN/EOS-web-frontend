import type { ModuleConfig } from "@/modules/types";

const BASE = "/coe";

/**
 * Restructured to match the new, larger design (COE Module.dc.html) — 24
 * pages across Overview/Exam Cycle/Conduct/Evaluation/Services/
 * Administration/Setup, replacing the old 12-page design's flatter
 * structure. Old-design pages that have a real new-design replacement
 * already built (Marks entry, Mark records, Results, Revaluation, Settings)
 * are dropped here to avoid two versions of the same concept in the sidebar.
 * Reports & Analytics and Notifications have both since landed their
 * new-design rebuilds (analytics dashboard; compose + sent/scheduled). Timetables and
 * Halls & seating are unchanged per instruction — both have a real place in
 * the new design too (Exam Timetable / Hall & Seating), just not
 * re-skinned. "Lateral entry & transfers" has no design origin at all —
 * kept as a real, fully-built feature regardless.
 */
export const coeModuleConfig: ModuleConfig = {
  role: "coe",
  basePath: BASE,
  moduleLabel: "Examinations",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "student-exam-record", label: "Student Exam Record", icon: "badge", href: `${BASE}/student-exam-record` },
      ],
    },
    {
      label: "Exam Cycle",
      items: [
        { key: "exam-management", label: "Exam Management", icon: "fact_check", href: `${BASE}/exam-management` },
        { key: "exam-registration", label: "Exam Registration", icon: "how_to_reg", href: `${BASE}/exam-registration`, badgeKey: "coeExamRegistrations" },
        { key: "timetables", label: "Exam Timetable", icon: "calendar_month", href: `${BASE}/timetables` },
        { key: "halls-seating", label: "Hall & Seating", icon: "grid_view", href: `${BASE}/halls-seating`, badgeKey: "coeHallSeating" },
        { key: "hall-tickets", label: "Hall Tickets", icon: "badge", href: `${BASE}/hall-tickets`, badgeKey: "coeHallTickets" },
        { key: "special-admissions", label: "Lateral entry & transfers", icon: "swap_horiz", href: `${BASE}/special-admissions` },
      ],
    },
    {
      label: "Conduct",
      items: [
        { key: "invigilators", label: "Invigilation", icon: "groups", href: `${BASE}/invigilators`, badgeKey: "coeInvigilation" },
        { key: "attendance-eligibility", label: "Attendance & Eligibility", icon: "fact_check", href: `${BASE}/attendance-eligibility` },
        { key: "question-papers", label: "Question Papers", icon: "description", href: `${BASE}/question-papers`, badgeKey: "coeQuestionPapers" },
        { key: "confidential-access-log", label: "Confidential Access Log", icon: "lock", href: `${BASE}/confidential-access-log` },
        { key: "malpractice", label: "Malpractice / UFM", icon: "warning", href: `${BASE}/malpractice`, badgeKey: "coeMalpractice" },
      ],
    },
    {
      label: "Evaluation",
      items: [
        { key: "exam-valuation", label: "Exam Valuation", icon: "fact_check", href: `${BASE}/exam-valuation` },
        { key: "marks-management", label: "Marks Management", icon: "checklist", href: `${BASE}/marks-management` },
        { key: "mark-entry-sheet", label: "Mark Entry Sheet", icon: "edit_note", href: `${BASE}/mark-entry-sheet` },
        { key: "results-management", label: "Results Management", icon: "military_tech", href: `${BASE}/results-management` },
        { key: "pass-board", label: "Pass Board", icon: "gavel", href: `${BASE}/pass-board` },
        { key: "result-publication", label: "Result Publication", icon: "campaign", href: `${BASE}/result-publication` },
        {
          key: "revaluation-retotaling",
          label: "Revaluation & Retotaling",
          icon: "difference",
          href: `${BASE}/revaluation-retotaling`,
          badgeKey: "coeRevaluationPending",
        },
        { key: "supplementary-arrear", label: "Supplementary & Arrear", icon: "event_repeat", href: `${BASE}/supplementary-arrear` },
        { key: "answer-script-archive", label: "Answer Script Archive", icon: "inventory_2", href: `${BASE}/answer-script-archive` },
      ],
    },
    {
      label: "Services",
      items: [
        { key: "certificate-management", label: "Certificate Management", icon: "workspace_premium", href: `${BASE}/certificate-management` },
        { key: "convocation-degree", label: "Convocation & Degree", icon: "school", href: `${BASE}/convocation-degree` },
        { key: "exam-finance", label: "Exam Finance", icon: "payments", href: `${BASE}/exam-finance` },
      ],
    },
    {
      label: "Administration",
      items: [
        { key: "reports", label: "Reports & Analytics", icon: "bar_chart", href: `${BASE}/reports` },
        { key: "notifications", label: "Notifications", icon: "notifications", href: `${BASE}/notifications` },
      ],
    },
    {
      label: "Setup",
      items: [{ key: "regulation-grading", label: "Regulation & Grading", icon: "rule", href: `${BASE}/regulation-grading` }],
    },
  ],
};
