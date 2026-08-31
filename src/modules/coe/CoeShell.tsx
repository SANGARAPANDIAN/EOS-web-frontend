"use client";

import { AppShell } from "@/components/layout/AppShell";
import { coeModuleConfig } from "@/modules/coe/nav";
import { useMe } from "@/modules/coe/api/identity";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";
import { useRevaluationRequests } from "@/modules/coe/api/revaluation";
import { useExamRegistrations } from "@/modules/coe/api/examRegistrations";
import { useHallPlans } from "@/modules/coe/api/hallPlans";
import { useHallTicketsTotalCount } from "@/modules/coe/api/hallTicketsManagement";
import { useInvigilationDuties } from "@/modules/coe/api/invigilation";
import { useQuestionPapersTotalCount } from "@/modules/coe/api/questionPapers";
import { useMalpracticeIncidents } from "@/modules/coe/api/malpractice";
import { ROLE_LABEL } from "@/lib/config";

/**
 * Renders through the shared AppShell/Topbar — same chrome as every other
 * module (HoD, Principal, etc.), no bespoke topbar. Each COE page still
 * carries its own title/actions row via CoePageHeader (see
 * modules/coe/PageHeader.tsx) below the shared Topbar, same as HoD's pages
 * render their own headings below theirs.
 *
 * studentName/registerNumber feed the Sidebar's own footer identity block —
 * /auth/me doesn't join coe_profiles (nothing in the backend does), so
 * there's no real display name beyond the account email; the role label
 * falls back to the same static ROLE_LABEL every other module uses.
 *
 * The revaluation nav badge is a real count of status: "requested" rows.
 * The Exam Cycle/Conduct group badges (design shows a count chip next to
 * Exam Registration/Hall & Seating/Hall Tickets/Invigilation/Question
 * Papers/Malpractice) are each a real total fetched unfiltered across every
 * exam — same pattern as revaluation, not fabricated numbers.
 */
export function CoeShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const now = new Date();
  const revaluation = useRevaluationRequests();
  const registrations = useExamRegistrations({});
  const hallPlans = useHallPlans();
  const hallTickets = useHallTicketsTotalCount();
  const invigilation = useInvigilationDuties();
  const questionPapers = useQuestionPapersTotalCount();
  const malpractice = useMalpracticeIncidents();

  // Matches revaluation-retotaling/page.tsx's own "Payment pending" rule
  // exactly (fee_paid gates everything, regardless of the raw status column)
  // so the sidebar count never disagrees with what that page's own tab shows.
  const pendingRevaluation = revaluation.data?.filter((r) => !r.fee_paid).length;

  return (
    <AppShell
      moduleConfig={coeModuleConfig}
      header={{
        studentName: me.data?.email,
        registerNumber: ROLE_LABEL.coe,
        searchPlaceholder: "Search exams, students, halls, courses…",
        academicYearLabel: viewedAcademicYearLabel(now.getFullYear(), now.getMonth()),
        semesterParityLabel: currentInstitutionSemesterParity(now),
        showNotifications: true,
        // Real, backend-wired pass-mark/grade-threshold config
        // (exam_pass_rules_settings) — previously only reachable by typing
        // the URL directly since it was dropped from nav during a redesign.
        settingsHref: "/coe/settings",
      }}
      navBadges={{
        coeRevaluationPending: pendingRevaluation || undefined,
        coeExamRegistrations: registrations.data?.length || undefined,
        coeHallSeating: hallPlans.data?.meta.total || undefined,
        coeHallTickets: hallTickets.data?.total || undefined,
        coeInvigilation: invigilation.data?.meta.total || undefined,
        coeQuestionPapers: questionPapers.data?.total || undefined,
        coeMalpractice: malpractice.data?.meta.total || undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
