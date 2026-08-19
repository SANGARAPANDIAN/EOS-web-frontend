"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Badge, Button, Modal, useToast } from "@/modules/admin/components/ui";
import { useFacultyActivity, useFacultyAttendance, useFacultyById } from "@/modules/admin/api/faculty";
import { useFacultyMappings } from "@/modules/admin/api/facultyMapping";
import { useDeleteFacultyDocument, useFacultyDocuments, useUploadFacultyDocument } from "@/modules/admin/api/facultyFiles";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";
import { FacultyIdCardModal } from "@/modules/admin/components/faculty/FacultyIdCardModal";
import { friendlyError } from "@/lib/utils/errors";
import { generateFacultyProfileReport } from "@/modules/admin/lib/faculty-profile-report";
import { experienceYears, formatDate, formatFacultyCode, fullName, profileCompleteness } from "@/modules/admin/lib/faculty-format";
import { OverviewSection } from "@/modules/admin/components/faculty/detail/OverviewSection";
import { PersonalSection } from "@/modules/admin/components/faculty/detail/PersonalSection";
import { ContactSection } from "@/modules/admin/components/faculty/detail/ContactSection";
import { EmploymentSection } from "@/modules/admin/components/faculty/detail/EmploymentSection";
import { IdentitySection } from "@/modules/admin/components/faculty/detail/IdentitySection";
import { DocumentsSection } from "@/modules/admin/components/faculty/detail/DocumentsSection";
import { AssignmentsSection } from "@/modules/admin/components/faculty/detail/AssignmentsSection";
import { AttendanceSection } from "@/modules/admin/components/faculty/detail/AttendanceSection";
import { ActivitySection } from "@/modules/admin/components/faculty/detail/ActivitySection";

interface SectionItem {
  id: string;
  label: string;
  icon: string;
}
interface SectionGroup {
  group: string;
  items: SectionItem[];
}

/** Same 3 groups / 9 sections as the old console's faculty detail page — every one of them is fully built here, unlike the student-detail rail. */
const SECTION_GROUPS: SectionGroup[] = [
  {
    group: "Profile",
    items: [
      { id: "overview", label: "Overview", icon: "space_dashboard" },
      { id: "personal", label: "Personal Information", icon: "person" },
      { id: "contact", label: "Contact", icon: "location_on" },
      { id: "employment", label: "Employment", icon: "work" },
      { id: "identity", label: "Identity", icon: "shield" },
      { id: "documents", label: "Documents", icon: "folder" },
    ],
  },
  {
    group: "Academics",
    items: [
      { id: "academic-assignments", label: "Academic Assignments", icon: "assignment" },
      { id: "attendance", label: "Attendance", icon: "event_available" },
    ],
  },
  {
    group: "Records",
    items: [{ id: "activity", label: "Activity", icon: "history" }],
  },
];

const RAIL_KEY = "eos.admin.facultyProfileRail.collapsed";

function ProfileCompletionRing({ percent }: { percent: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--color-admin-border)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--color-admin-primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-base font-bold text-admin-ink">{percent}%</span>
      </div>
    </div>
  );
}

function IdItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-medium text-admin-body">{value}</dd>
    </div>
  );
}

export default function FacultyDetailPage() {
  // useSearchParams needs a Suspense boundary above it for Next's static
  // prerendering path — see node_modules/next/dist/docs's use-search-params
  // page for why (this route otherwise builds fine in dev but fails `next
  // build` with "Missing Suspense boundary with useSearchParams").
  return (
    <Suspense fallback={<p className="text-sm text-admin-muted">Loading faculty…</p>}>
      <FacultyDetailPageInner />
    </Suspense>
  );
}

function FacultyDetailPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const facultyId = Number(params.id);
  const validFacultyId = Number.isFinite(facultyId) ? facultyId : null;
  const { show } = useToast();

  const { data: faculty, isLoading, error } = useFacultyById(validFacultyId);

  // Called unconditionally (before the early returns below) since hooks
  // can't be conditional — each is internally gated on a valid faculty id.
  const { data: mappingsData, isLoading: mappingsLoading } = useFacultyMappings({
    faculty_id: validFacultyId ?? undefined,
    limit: 100,
  });
  const { data: documents, isLoading: documentsLoading } = useFacultyDocuments(validFacultyId);
  const { data: activity, isLoading: activityLoading } = useFacultyActivity(validFacultyId);
  const { data: attendance, isLoading: attendanceLoading } = useFacultyAttendance(validFacultyId);
  const uploadDocument = useUploadFacultyDocument(facultyId);
  const deleteDocument = useDeleteFacultyDocument(facultyId);

  const [activeSection, setActiveSection] = useState(() => searchParams.get("section") ?? "overview");
  const [railCollapsed, setRailCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(RAIL_KEY) === "1",
  );
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const completeness = useMemo(() => (faculty ? profileCompleteness(faculty) : 0), [faculty]);
  const mappings = useMemo(() => mappingsData?.data ?? [], [mappingsData]);
  const distinctSubjectCount = useMemo(() => new Set(mappings.map((m) => m.subject.id)).size, [mappings]);
  const distinctClassCount = useMemo(() => new Set(mappings.map((m) => m.class.id)).size, [mappings]);

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
    return <p className="text-sm text-admin-muted">Loading faculty…</p>;
  }
  if (error || !faculty) {
    return <p className="text-sm text-admin-danger">Couldn&apos;t load this faculty record.</p>;
  }

  async function handlePrintReport() {
    if (!faculty) return; // narrowed already at this point in render, but TS can't carry that across the closure
    setIsGeneratingReport(true);
    try {
      await generateFacultyProfileReport({
        faculty,
        mappings,
        documents,
        activity,
        attendance,
        distinctSubjectCount,
        distinctClassCount,
        completeness,
      });
    } catch (err: unknown) {
      show(friendlyError(err), "error");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  const name = fullName(faculty);
  const attendanceCount = attendance
    ? attendance.overall.full_days +
      attendance.overall.half_days +
      attendance.overall.absent +
      attendance.overall.on_leave +
      attendance.overall.on_duty +
      attendance.overall.on_vacation
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm text-admin-muted">
          <Link href="/admin/dashboard" className="hover:text-admin-body">
            Home
          </Link>
          <Icon name="chevron_right" size={15} />
          <Link href="/admin/faculty" className="hover:text-admin-body">
            Faculty
          </Link>
          <Icon name="chevron_right" size={15} />
          <span className="font-semibold text-admin-body">{name}</span>
        </nav>
        <Link href="/admin/faculty" className="flex items-center gap-1.5 text-sm font-semibold text-admin-body hover:text-admin-ink">
          <Icon name="arrow_back" size={15} /> Back to list
        </Link>
      </div>

      <div className="rounded-admin-card border border-admin-border bg-admin-canvas p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {faculty.profile_url ? (
              <button
                type="button"
                onClick={() => setPhotoViewerOpen(true)}
                aria-label="View profile photo"
                className="block shrink-0 cursor-pointer border-0 bg-transparent p-0 leading-none"
              >
                <FacultyAvatar faculty={faculty} className="h-[92px] w-[92px] rounded-admin-lg text-2xl" />
              </button>
            ) : (
              <FacultyAvatar faculty={faculty} className="h-[92px] w-[92px] rounded-admin-lg text-2xl" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-admin-ink">{name}</h1>
                <Badge tone={faculty.status === "active" ? "success" : "neutral"}>
                  {faculty.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-admin-muted">
                {faculty.designation} · {faculty.department?.name ?? "No department"}
              </p>

              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                <IdItem label="Faculty ID" value={formatFacultyCode(faculty.id)} />
                <IdItem label="Department" value={faculty.department?.code ?? faculty.department?.name ?? "—"} />
                <IdItem label="Email" value={faculty.email} />
                <IdItem label="Phone" value={faculty.phone ?? "Not provided"} />
                <IdItem label="Joined" value={formatDate(faculty.date_of_joining)} />
                <IdItem label="Experience" value={experienceYears(faculty.date_of_joining)} />
              </dl>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ProfileCompletionRing percent={completeness} />
            <p className="text-xs text-admin-muted">Profile complete</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/admin/faculty/${faculty.id}/edit`}>
            <Button variant="primary">
              <Icon name="edit" size={16} /> Edit profile
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setActiveSection("activity")}>
            <Icon name="history" size={16} /> Timeline
          </Button>
          <Button variant="secondary" onClick={() => setActiveSection("academic-assignments")}>
            <Icon name="assignment" size={16} /> Assignments
          </Button>
          <Button variant="secondary" onClick={() => show("Notifications are coming soon.", "info")}>
            <Icon name="send" size={16} /> Notify
          </Button>
          <Button variant="secondary" onClick={() => setIdCardModalOpen(true)}>
            <Icon name="badge" size={16} /> ID card
          </Button>
          <Button variant="secondary" onClick={handlePrintReport} disabled={isGeneratingReport}>
            <Icon name="print" size={16} /> {isGeneratingReport ? "Preparing PDF…" : "Print"}
          </Button>
        </div>
      </div>

      <div className={`grid items-start gap-6 ${railCollapsed ? "grid-cols-[64px_minmax(0,1fr)]" : "grid-cols-[232px_minmax(0,1fr)]"}`}>
        <nav
          className="sticky top-0 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-admin-card border border-admin-border bg-admin-canvas"
          aria-label="Profile sections"
        >
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
            {SECTION_GROUPS.map((group) => (
              <div key={group.group}>
                {!railCollapsed && (
                  <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">{group.group}</div>
                )}
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  const count =
                    item.id === "academic-assignments"
                      ? mappingsData?.meta.total ?? 0
                      : item.id === "documents"
                        ? documents?.length ?? 0
                        : item.id === "attendance"
                          ? attendanceCount
                          : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center gap-2 rounded-admin-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive ? "bg-admin-tint-strong text-admin-primary-deep" : "text-admin-body hover:bg-admin-tint"
                      }`}
                    >
                      <Icon name={item.icon} size={17} className="shrink-0 opacity-75" />
                      {!railCollapsed && (
                        <span className="flex flex-1 items-center justify-between gap-2">
                          <span className="truncate text-left">{item.label}</span>
                          {count !== null && <span className="shrink-0 text-xs font-semibold text-admin-subtle">{count}</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 rounded-admin-card border border-admin-border bg-admin-canvas p-6">
          {activeSection === "overview" && (
            <OverviewSection
              faculty={faculty}
              distinctSubjectCount={distinctSubjectCount}
              distinctClassCount={distinctClassCount}
              mappingsLoading={mappingsLoading}
              attendance={attendance}
              attendanceLoading={attendanceLoading}
            />
          )}
          {activeSection === "personal" && <PersonalSection faculty={faculty} />}
          {activeSection === "contact" && <ContactSection faculty={faculty} />}
          {activeSection === "employment" && <EmploymentSection faculty={faculty} />}
          {activeSection === "identity" && <IdentitySection faculty={faculty} />}
          {activeSection === "documents" && (
            <DocumentsSection
              documents={documents}
              documentsLoading={documentsLoading}
              uploadDocument={uploadDocument}
              deleteDocument={deleteDocument}
            />
          )}
          {activeSection === "academic-assignments" && <AssignmentsSection mappings={mappings} isLoading={mappingsLoading} />}
          {activeSection === "attendance" && <AttendanceSection attendance={attendance} isLoading={attendanceLoading} />}
          {activeSection === "activity" && <ActivitySection activity={activity} isLoading={activityLoading} />}
        </div>
      </div>

      {faculty.profile_url && (
        <Modal open={photoViewerOpen} onClose={() => setPhotoViewerOpen(false)} title={name} subtitle="Profile photo" widthClassName="max-w-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- a remote storage URL, not a local/optimizable asset */}
          <img src={faculty.profile_url} alt="" className="w-full rounded-admin-lg object-cover" />
        </Modal>
      )}

      <FacultyIdCardModal open={idCardModalOpen} onClose={() => setIdCardModalOpen(false)} faculty={[faculty]} />
    </div>
  );
}
