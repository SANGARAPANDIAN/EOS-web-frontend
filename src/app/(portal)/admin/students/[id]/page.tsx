"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Badge, Button, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { generateStudentProfileReport } from "@/modules/admin/lib/student-profile-report";
import { avatarTint, formatDate, initials, studentName } from "@/modules/admin/lib/students-format";
import {
  fetchStudentIdCardSource,
  useClassMentor,
  useNotifyStudent,
  useStudent,
  useStudentAttendanceSummary,
  useStudentCertificates,
  useStudentFeeWorkspace,
  useStudentSubjects,
} from "@/modules/admin/api/students";
import { useStudentIdCardBulkStatus, useIssueStudentIdCard } from "@/modules/admin/api/studentIdCard";
import { useCertificateTypes } from "@/modules/admin/api/admissions";
import { studentToIdCardData } from "@/modules/admin/lib/id-card-data";
import { IdCardModal } from "@/modules/admin/components/shared/IdCardModal";
import { NotifyModal } from "@/modules/admin/components/shared/NotifyModal";
import { EditProfileModal } from "@/modules/admin/components/student-detail/EditProfileModal";
import { ResetPasswordModal } from "@/modules/admin/components/student-detail/ResetPasswordModal";
import { OverviewSection } from "@/modules/admin/components/student-detail/OverviewSection";
import { PersonalDetailsSection } from "@/modules/admin/components/student-detail/PersonalDetailsSection";
import { LifecycleSection } from "@/modules/admin/components/student-detail/LifecycleSection";
import { AcademicStandingSection } from "@/modules/admin/components/student-detail/AcademicStandingSection";
import { AttendanceSection } from "@/modules/admin/components/student-detail/AttendanceSection";
import { SubjectsSection } from "@/modules/admin/components/student-detail/SubjectsSection";
import { ExamsSection } from "@/modules/admin/components/student-detail/ExamsSection";
import { FeesSection } from "@/modules/admin/components/student-detail/FeesSection";
import { LibrarySection } from "@/modules/admin/components/student-detail/LibrarySection";
import { HostelSection } from "@/modules/admin/components/student-detail/HostelSection";
import { TransportSection } from "@/modules/admin/components/student-detail/TransportSection";
import { MedicalSection } from "@/modules/admin/components/student-detail/MedicalSection";
import { ParentsSection } from "@/modules/admin/components/student-detail/ParentsSection";
import { CertificatesSection } from "@/modules/admin/components/student-detail/CertificatesSection";
import { IdentityMarksSection } from "@/modules/admin/components/student-detail/IdentityMarksSection";
import { ProjectsSection } from "@/modules/admin/components/student-detail/ProjectsSection";
import { PlacementsSection } from "@/modules/admin/components/student-detail/PlacementsSection";
import { RequestsSection } from "@/modules/admin/components/student-detail/RequestsSection";
import { CommunicationsSection } from "@/modules/admin/components/student-detail/CommunicationsSection";

interface SectionItem {
  id: string;
  label: string;
  icon: string;
  /** Backed by a real endpoint and wired to a panel — clickable. Everything else stays disabled. */
  real?: boolean;
}

interface SectionGroup {
  group: string;
  items: SectionItem[];
}

/** Grouped exactly as the old console's `SECTIONS` — same 7 groups, same 30 items, same order. */
const SECTIONS: SectionGroup[] = [
  {
    group: "Summary",
    items: [
      { id: "overview", label: "Overview", icon: "space_dashboard", real: true },
      { id: "personal", label: "Personal details", icon: "person", real: true },
      { id: "lifecycle", label: "Lifecycle", icon: "layers", real: true },
    ],
  },
  {
    group: "Academics",
    items: [
      { id: "academic", label: "Academic standing", icon: "school", real: true },
      { id: "attendance", label: "Attendance", icon: "event_available", real: true },
      { id: "subjects", label: "Subjects", icon: "menu_book", real: true },
      { id: "exams", label: "Examinations & results", icon: "military_tech", real: true },
    ],
  },
  {
    group: "Finance",
    items: [
      { id: "fees", label: "Fees", icon: "account_balance_wallet", real: true },
      { id: "scholarships", label: "Scholarships", icon: "star" },
    ],
  },
  {
    group: "Services",
    items: [
      { id: "library", label: "Library", icon: "local_library", real: true },
      { id: "hostel", label: "Hostel", icon: "bed", real: true },
      { id: "transport", label: "Transport", icon: "directions_bus", real: true },
      { id: "medical", label: "Medical", icon: "medical_services", real: true },
    ],
  },
  {
    group: "People",
    items: [
      { id: "parents", label: "Parents", icon: "family_restroom", real: true },
      { id: "guardian", label: "Guardian", icon: "supervisor_account" },
      { id: "emergency", label: "Emergency contacts", icon: "emergency" },
    ],
  },
  {
    group: "Records",
    items: [
      { id: "documents", label: "Documents", icon: "folder" },
      { id: "certificates", label: "Certificates", icon: "workspace_premium", real: true },
      { id: "identity", label: "Identity marks", icon: "fingerprint", real: true },
    ],
  },
  {
    group: "Achievement",
    items: [
      { id: "achievements", label: "Achievements", icon: "emoji_events" },
      { id: "projects", label: "Projects", icon: "code", real: true },
      { id: "internships", label: "Internships", icon: "flag" },
      { id: "placements", label: "Placements", icon: "work", real: true },
      { id: "research", label: "Research", icon: "science" },
    ],
  },
  {
    group: "Governance",
    items: [
      { id: "disciplinary", label: "Disciplinary", icon: "gavel" },
      { id: "requests", label: "Requests", icon: "inbox", real: true },
      { id: "communications", label: "Communication", icon: "mail", real: true },
      { id: "activity", label: "Activity timeline", icon: "history" },
      { id: "audit", label: "Audit log", icon: "fact_check" },
      { id: "permissions", label: "Permissions", icon: "shield" },
      { id: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

const NOT_BUILT_REASON = "Not built yet — sections are being wired up one at a time";
const RAIL_KEY = "eos.admin.studentProfileRail.collapsed";

function IdItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-admin-ink">{value}</p>
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: student, isLoading, error } = useStudent(studentId);
  const { data: feeWorkspace } = useStudentFeeWorkspace(studentId);
  const { data: mentor } = useClassMentor(student?.class?.id);
  // These four back the Overview tab's summary cards only — gated to that
  // tab (not hardcoded true) so switching to Subjects/Certificates/
  // Attendance doesn't keep this duplicate "overview" copy of the same
  // query alive alongside that tab's own fetch, and the connection burst on
  // tab-switch doesn't compound on top of whatever the new tab needs.
  const onOverview = activeTab === "overview";
  const { data: attendanceSummary } = useStudentAttendanceSummary(studentId, onOverview);
  const { data: overviewSubjects } = useStudentSubjects(studentId, onOverview);
  const { data: overviewCertificateTypes } = useCertificateTypes(onOverview);
  const { data: overviewCertificates } = useStudentCertificates(studentId, onOverview);
  // The Students list page's row-level Edit action links here with
  // ?edit=1 so clicking it opens straight into the edit modal instead of
  // landing on the read-only profile first. Read via window.location in
  // the lazy initializer (not an effect — this is real initial state, not
  // a sync) rather than useSearchParams() to avoid the Suspense-boundary
  // requirement that hook forces on the whole page for one small affordance.
  const [editOpen, setEditOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === "1",
  );
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);
  const { data: idCardStatusMap, isLoading: idCardStatusLoading } = useStudentIdCardBulkStatus(
    idCardOpen ? [studentId] : [],
  );
  const issueStudentIdCard = useIssueStudentIdCard();
  const { show } = useToast();
  const notifyStudent = useNotifyStudent();
  const [railCollapsed, setRailCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(RAIL_KEY) === "1",
  );

  function toggleRail() {
    setRailCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* non-fatal */
      }
      return next;
    });
  }

  if (isLoading) {
    return <p className="text-sm text-admin-muted">Loading student…</p>;
  }
  if (error || !student) {
    return <p className="text-sm text-admin-danger">Student not found.</p>;
  }

  async function handlePrintReport() {
    if (!student) return; // narrowed already at this point in render, but TS can't carry that across the closure
    setIsGeneratingReport(true);
    try {
      await generateStudentProfileReport({ student, feeWorkspace, mentor });
    } catch (err: unknown) {
      show(friendlyError(err), "error");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleSendNotification(input: { title: string; message: string }) {
    try {
      await notifyStudent.mutateAsync({ id: studentId, input });
      show("Notification sent.", "success");
      setNotifyOpen(false);
    } catch (err: unknown) {
      show(friendlyError(err), "error");
    }
  }

  const tint = avatarTint(student.id);
  const name = studentName(student.first_name, student.last_name);

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Breadcrumb + back ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm text-admin-muted">
          <Link href="/admin/dashboard" className="hover:text-admin-body">
            Home
          </Link>
          <Icon name="chevron_right" size={15} />
          <Link href="/admin/students" className="hover:text-admin-body">
            Students
          </Link>
          <Icon name="chevron_right" size={15} />
          <span className="font-semibold text-admin-body">{name}</span>
        </nav>
        <Link href="/admin/students" className="flex items-center gap-1.5 text-sm font-semibold text-admin-body hover:text-admin-ink">
          <Icon name="arrow_back" size={15} /> Back to list
        </Link>
      </div>

      {/* ---- Identity header ---- */}
      <div className="rounded-admin-card border border-admin-border bg-admin-canvas p-5">
        <div className="flex flex-wrap items-start gap-5">
          <div className="relative h-[92px] w-[92px] shrink-0">
            <span
              className="flex h-full w-full items-center justify-center overflow-hidden rounded-admin-lg border border-admin-border text-2xl font-semibold"
              style={student.photo_url ? undefined : { background: tint.bg, color: tint.fg }}
            >
              {student.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- a remote storage URL, not a local/optimizable asset
                <img src={student.photo_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                initials(student.first_name, student.last_name)
              )}
            </span>
          </div>

          <div className="min-w-[280px] flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-sans text-2xl font-bold tracking-tight text-admin-ink">{name}</h1>
              <Badge tone={student.status === "active" ? "success" : "neutral"}>{student.status === "active" ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="mt-2 text-sm text-admin-muted">
              {student.course?.name ?? "—"} {student.department?.name ?? ""} · Section {student.class?.section ?? "—"} · Batch{" "}
              {student.batch?.name ?? "—"}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <IdItem label="Roll number" value={student.roll_no ?? student.student_id_no} />
              <IdItem label="Register number" value={student.register_no ?? "—"} />
              <IdItem label="Student ID" value={student.student_id_no} />
              <IdItem label="Admitted" value={formatDate(student.admission_date)} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Icon name="edit" size={16} /> Edit profile
          </Button>
          <Button variant="secondary" onClick={() => setResetPasswordOpen(true)}>
            <Icon name="lock" size={16} /> Reset password
          </Button>
          <Button variant="secondary" onClick={() => setActiveTab("academic")}>
            <Icon name="school" size={16} /> Academic history
          </Button>
          <Button variant="secondary" onClick={() => setNotifyOpen(true)}>
            <Icon name="send" size={16} /> Notify
          </Button>
          <Button variant="secondary" onClick={() => setIdCardOpen(true)}>
            <Icon name="badge" size={16} /> ID card
          </Button>
          <Button variant="secondary" onClick={handlePrintReport} disabled={isGeneratingReport}>
            <Icon name="print" size={16} /> {isGeneratingReport ? "Preparing PDF…" : "Print"}
          </Button>
        </div>
      </div>

      {/* ---- Lifecycle strip ---- */}
      <div className="rounded-admin-card border border-admin-border bg-admin-canvas px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-wide text-admin-subtle uppercase">Student lifecycle</span>
          <span
            className="text-xs text-admin-subtle"
            title="Lifecycle stages aren't tracked as per-student data yet — only status (active/inactive) and admission date exist"
          >
            Not tracked — only status and admission date exist today
          </span>
        </div>
      </div>

      {/* ---- Rail + panels ---- */}
      <div className={`grid items-start gap-6 ${railCollapsed ? "grid-cols-[64px_minmax(0,1fr)]" : "grid-cols-[232px_minmax(0,1fr)]"}`}>
        <nav className="sticky top-0 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-admin-card border border-admin-border bg-admin-canvas" aria-label="Profile sections">
          <div className="flex items-center justify-between gap-2 border-b border-admin-divider px-3 py-2.5">
            {!railCollapsed && <span className="text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">Sections</span>}
            <button
              type="button"
              onClick={toggleRail}
              aria-label={railCollapsed ? "Expand section list" : "Collapse section list"}
              className="ml-auto rounded-admin-sm p-1 text-admin-subtle hover:bg-admin-tint-strong hover:text-admin-body"
            >
              <Icon name={railCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"} size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-0.5 p-2">
            {SECTIONS.map((group) => (
              <div key={group.group}>
                {!railCollapsed && <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">{group.group}</div>}
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!item.real}
                      title={item.real ? item.label : `${item.label} — ${NOT_BUILT_REASON}`}
                      onClick={() => item.real && setActiveTab(item.id)}
                      className={`flex w-full items-center gap-2 rounded-admin-md px-3 py-2 text-sm font-medium transition-colors ${
                        !item.real
                          ? "cursor-not-allowed text-admin-border"
                          : isActive
                            ? "bg-admin-tint-strong text-admin-primary-deep"
                            : "text-admin-body hover:bg-admin-tint"
                      }`}
                    >
                      <Icon name={item.icon} size={17} className="shrink-0 opacity-75" />
                      {!railCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          {activeTab === "overview" && (
            <OverviewSection
              student={student}
              feeWorkspace={feeWorkspace}
              mentor={mentor}
              attendanceSummary={attendanceSummary}
              subjects={overviewSubjects}
              certificateTypes={overviewCertificateTypes}
              certificates={overviewCertificates}
            />
          )}
          {activeTab === "personal" && (
            <PersonalDetailsSection studentId={studentId} active={activeTab === "personal"} name={name} email={student.email} phone={student.phone} />
          )}
          {activeTab === "identity" && <IdentityMarksSection studentId={studentId} active={activeTab === "identity"} />}
          {activeTab === "lifecycle" && <LifecycleSection studentId={studentId} active={activeTab === "lifecycle"} />}
          {activeTab === "academic" && (
            <AcademicStandingSection currentSemester={student.class?.current_semester ?? null} studentId={studentId} active={activeTab === "academic"} />
          )}
          {activeTab === "attendance" && <AttendanceSection studentId={studentId} active={activeTab === "attendance"} />}
          {activeTab === "subjects" && <SubjectsSection studentId={studentId} active={activeTab === "subjects"} />}
          {activeTab === "exams" && <ExamsSection studentId={studentId} active={activeTab === "exams"} />}
          {activeTab === "fees" && <FeesSection workspace={feeWorkspace} isLoading={!feeWorkspace} />}
          {activeTab === "library" && <LibrarySection studentId={studentId} active={activeTab === "library"} />}
          {activeTab === "hostel" && <HostelSection studentType={student.student_type} studentId={studentId} active={activeTab === "hostel"} />}
          {activeTab === "transport" && <TransportSection studentId={studentId} active={activeTab === "transport"} />}
          {activeTab === "medical" && <MedicalSection studentId={studentId} active={activeTab === "medical"} />}
          {activeTab === "parents" && <ParentsSection studentId={studentId} active={activeTab === "parents"} />}
          {activeTab === "certificates" && <CertificatesSection studentId={studentId} active={activeTab === "certificates"} />}
          {activeTab === "placements" && <PlacementsSection studentId={studentId} active={activeTab === "placements"} />}
          {activeTab === "projects" && <ProjectsSection studentId={studentId} active={activeTab === "projects"} />}
          {activeTab === "requests" && <RequestsSection studentId={studentId} active={activeTab === "requests"} />}
          {activeTab === "communications" && <CommunicationsSection studentId={studentId} active={activeTab === "communications"} />}
        </div>
      </div>

      <EditProfileModal studentId={studentId} firstName={student.first_name} lastName={student.last_name} open={editOpen} onClose={() => setEditOpen(false)} />
      <ResetPasswordModal studentId={studentId} studentName={name} open={resetPasswordOpen} onClose={() => setResetPasswordOpen(false)} />
      <NotifyModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        recipientName={name}
        onSend={handleSendNotification}
        isSending={notifyStudent.isPending}
      />
      <IdCardModal
        open={idCardOpen}
        onClose={() => setIdCardOpen(false)}
        entities={[
          {
            id: student.id,
            avatar: (
              <span
                className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-admin-md border border-admin-border text-sm font-semibold"
                style={student.photo_url ? undefined : { background: tint.bg, color: tint.fg }}
              >
                {student.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a remote storage URL, not a local/optimizable asset
                  <img src={student.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(student.first_name, student.last_name)
                )}
              </span>
            ),
            pickerAvatar: (
              <span
                className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-admin-pill text-[10px] font-semibold"
                style={student.photo_url ? undefined : { background: tint.bg, color: tint.fg }}
              >
                {student.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a remote storage URL, not a local/optimizable asset
                  <img src={student.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(student.first_name, student.last_name)
                )}
              </span>
            ),
            title: name,
            subtitle: `${student.register_no ?? student.roll_no ?? student.student_id_no} · ${student.course?.name ?? "—"} · ${student.department?.name ?? "—"}`,
            data: studentToIdCardData({ ...student, blood_group: null, addresses: [] }),
          },
        ]}
        statusMap={idCardStatusMap}
        statusLoading={idCardStatusLoading}
        issueCard={(id) => issueStudentIdCard.mutateAsync(id)}
        fetchFullData={(id) => fetchStudentIdCardSource(id).then(studentToIdCardData)}
        onIssued={() => {}}
      />
    </div>
  );
}
