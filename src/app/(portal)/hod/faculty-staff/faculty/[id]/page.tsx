"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, EmptyState, Badge, Button, ProfilePhoto, SkeletonBlock } from "@/components/ui";
import { useHodFacultyProfile } from "@/modules/hod/api/facultyStaff";
import { formatDisplayDate } from "@/lib/utils/date";

function appraisalStatusLabel(status: string | null): string {
  switch (status) {
    case "submitted":
      return "Submitted · pending review";
    case "hod_reviewed":
      return "Reviewed by you · pending HR";
    case "hr_scored":
      return "Scored by HR · pending management";
    case "management_approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Not submitted yet";
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-divider py-3.5 first:border-t-0">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-[14.5px] font-bold text-ink">{value}</span>
    </div>
  );
}

export default function HodFacultyProfilePage() {
  const params = useParams<{ id: string }>();
  const facultyId = Number(params.id);
  const router = useRouter();
  const profile = useHodFacultyProfile(facultyId);

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }
  if (profile.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load this faculty member&apos;s profile — please try again.
      </div>
    );
  }
  if (!profile.data) {
    return (
      <Card>
        <EmptyState message="Faculty not found." />
      </Card>
    );
  }

  const { faculty, workload, advisory_class, subjects, leave_balances, appraisal } = profile.data;

  const facultyCode = `FAC${String(faculty.id).padStart(4, "0")}`;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Button variant="secondary" className="shrink-0" onClick={() => router.push("/hod/faculty-staff")}>
            ← Back to faculty
          </Button>
          <div>
            <h1 className="text-[21px] font-extrabold text-ink">{faculty.name}</h1>
            <p className="font-mono text-[13px] text-subtle">
              {facultyCode} · {faculty.designation} · {faculty.department_code}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Button variant="secondary" onClick={() => window.print()}>
            Print profile
          </Button>
          {faculty.institute_email && (
            <a href={`mailto:${faculty.institute_email}`}>
              <Button variant="primarySmall">Message faculty</Button>
            </a>
          )}
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-5">
          <ProfilePhoto
            imageUrl={faculty.photo_url}
            alt={faculty.name}
            label="faculty photo"
            caption="35 x 45 mm"
            className="h-[230px] w-[180px] shrink-0 text-[12px]"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[32px] font-extrabold tracking-[-.02em] text-ink">{faculty.name}</h2>
            <p className="mt-1.5 text-[15.5px] text-muted">
              {faculty.designation} · {faculty.department_name}
              {faculty.qualification ? ` · ${faculty.qualification}` : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutral">ID {facultyCode}</Badge>
              <Badge tone="accent">Teaching</Badge>
              {faculty.qualification && <Badge tone="neutral">{faculty.qualification}</Badge>}
              {profile.data.today_status_label && <Badge tone="neutral">{profile.data.today_status_label} today</Badge>}
              <Badge tone="neutral">
                {advisory_class
                  ? `Class advisor · ${advisory_class.year_label ?? ""}-${advisory_class.section}`.trim()
                  : "No advisory class"}
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4">
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-muted">Attendance this term</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">
                  {profile.data.attendance_this_term != null ? `${profile.data.attendance_this_term}%` : "—"}
                </div>
                <div className="mt-0.5 text-[12.5px] text-subtle">across working days</div>
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-muted">Workload</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">
                  {workload.hours_per_week != null ? `${workload.hours_per_week} hrs` : "—"}
                </div>
                <div className="mt-0.5 text-[12.5px] text-subtle">per week · {workload.periods_per_week} periods</div>
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-muted">Experience</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">
                  {faculty.experience_years != null ? `${faculty.experience_years} yrs` : "—"}
                </div>
                <div className="mt-0.5 text-[12.5px] text-subtle">
                  {faculty.date_of_joining ? `joined ${formatDisplayDate(faculty.date_of_joining)}` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Service record</h2>
          <div className="mt-3">
            <Row label="Designation" value={faculty.designation} />
            <Row label="Qualification" value={faculty.qualification ?? "—"} />
            {faculty.specialization && <Row label="Specialisation" value={faculty.specialization} />}
            <Row label="Institute email" value={faculty.institute_email ?? "—"} />
            <Row label="Contact number" value={faculty.contact_number ?? "—"} />
            <Row
              label="Date of joining"
              value={faculty.date_of_joining ? formatDisplayDate(faculty.date_of_joining) : "—"}
            />
            <Row
              label="Total experience"
              value={faculty.experience_years != null ? `${faculty.experience_years} yrs` : "—"}
            />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Leave &amp; appraisal</h2>
          <div className="mt-3">
            {leave_balances.map((b) => (
              <Row key={b.leave_type} label={b.leave_type} value={`${b.used} of ${b.allocated} used`} />
            ))}
            <Row label="On duty this term" value={`${profile.data.on_duty_days_this_term} days`} />
            <Row
              label={appraisal.cycle_academic_year ? `Appraisal ${appraisal.cycle_academic_year}` : "Appraisal"}
              value={appraisalStatusLabel(appraisal.status)}
            />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-extrabold text-ink">Subjects handled</h2>
          <span className="text-[12.5px] text-subtle">
            {subjects.reduce((sum, s) => sum + s.periods_per_week, 0)} periods / week
          </span>
        </div>
        {subjects.length === 0 ? (
          <EmptyState message="No subjects assigned this academic year." />
        ) : (
          <div className="mt-2">
            {subjects.map((s) => (
              <div
                key={`${s.subject_id}-${s.class_id}`}
                className="hod-hover-row flex items-center justify-between gap-4 rounded-[10px] border-t border-divider px-2 py-3 first:border-t-0"
              >
                <div className="flex items-center gap-4">
                  <span className="w-[70px] text-[12.5px] font-extrabold text-primary">{s.code}</span>
                  <span className="text-[14px] font-bold text-ink">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {s.semester != null && <Badge tone="accent">Semester {s.semester}</Badge>}
                  <span className="text-[12.5px] text-subtle">
                    {s.year_label ? `${s.year_label} year · ${s.section}` : s.section}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
