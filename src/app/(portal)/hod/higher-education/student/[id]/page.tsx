"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, Badge, Button, EmptyState, ProfilePhoto, SkeletonBlock } from "@/components/ui";
import { useHodHigherEducationProfile } from "@/modules/hod/api/higherEducation";
import { formatDisplayDate } from "@/lib/utils/date";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-divider py-3.5 first:border-t-0">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-[14.5px] font-bold text-ink">{value}</span>
    </div>
  );
}

// Same hex tones used everywhere else in the HOD module for status pills.
// admission_status is a real enum (higher_education_admission_status_enum):
// interested/applied/admitted/enrolled.
const ADMISSION_STATUS_TONE: Record<string, string> = {
  interested: "text-[#8b93a5] bg-[#f4f6fa] border border-[#e8ebf2]",
  applied: "text-[#92400e] bg-[#fef7ec] border border-[#f6e2c3]",
  admitted: "text-[#15803d] bg-[#effaf3] border border-[#cdeed9]",
  enrolled: "text-[#15803d] bg-[#effaf3] border border-[#cdeed9]",
};

function admissionStatusClass(status: string): string {
  return ADMISSION_STATUS_TONE[status] ?? "text-[#8b93a5] bg-[#f4f6fa] border border-[#e8ebf2]";
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function currency(value: number | null): string {
  return value != null ? `₹${value.toLocaleString("en-IN")}` : "—";
}

export default function HodHigherEducationProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const profile = useHodHigherEducationProfile(id);

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }
  if (!profile.data) {
    return (
      <Card>
        <EmptyState message="Higher-education record not found." />
      </Card>
    );
  }

  const { student, admission, academic, programme, readiness, timeline, funding, test_scores } = profile.data;

  const backlogsLabel =
    academic.backlogs > 0
      ? `${academic.backlogs} arrear${academic.backlogs === 1 ? "" : "s"} pending`
      : `No arrears · all ${academic.credits_earned} credits cleared`;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <Button variant="secondary" className="w-fit" onClick={() => router.push("/hod/higher-education")}>
        ← All higher-education students
      </Button>

      <Card>
        <div className="flex items-start gap-5">
          <ProfilePhoto
            imageUrl={student.photo_url}
            alt={student.name}
            label="student photo"
            caption="35 x 45 mm"
            className="h-[230px] w-[180px] shrink-0 text-[12px]"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[32px] font-extrabold tracking-[-.02em] text-ink">{student.name}</h2>
            <p className="mt-1.5 text-[15.5px] text-muted">
              {student.department_code} · Batch {student.batch_label ?? "—"} · Register {student.student_id_no}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {admission.status && (
                <span
                  className={`inline-flex items-center whitespace-nowrap rounded-pill border px-[9px] py-1 text-[10.5px] font-extrabold tracking-[.06em] ${admissionStatusClass(admission.status)}`}
                >
                  {statusLabel(admission.status)}
                </span>
              )}
              <Badge tone="neutral">{admission.is_abroad ? "Abroad" : "Domestic"}</Badge>
              {admission.intake && <Badge tone="neutral">Intake {admission.intake}</Badge>}
            </div>

            <div className="mt-5 grid grid-cols-4 gap-4">
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">UG CGPA</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">{academic.cgpa ?? "—"}</div>
                <div className="mt-2 text-[12.5px] text-subtle">
                  {academic.percentage != null ? `${academic.percentage}% equivalent` : "—"}
                </div>
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">Destination</div>
                <div className="mt-1.5 text-[26px] font-extrabold text-ink">{programme.country}</div>
                <div className="mt-2 text-[12.5px] text-subtle">{admission.intake ?? "—"}</div>
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">Test scores</div>
                <div className="mt-1.5 text-[22px] font-extrabold text-ink">{test_scores ?? "—"}</div>
                {test_scores && <div className="mt-2 text-[12.5px] text-subtle">reported to university</div>}
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">Scholarship value</div>
                <div className="mt-1.5 text-[26px] font-extrabold text-ink">{currency(funding.scholarship_value)}</div>
                <div className="mt-2 text-[12.5px] text-subtle">{funding.scholarship ?? "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Programme &amp; university</h2>
          <div className="mt-3">
            <Row label="Programme" value={programme.course} />
            <Row label="University" value={programme.university ?? "—"} />
            <Row label="Country" value={programme.country} />
            <Row label="Intake" value={programme.intake ?? "—"} />
            <Row label="Statement of purpose" value={programme.statement_of_purpose ?? "—"} />
            <Row label="Recommendation" value={programme.recommendation ?? "—"} />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Undergraduate record &amp; readiness</h2>
          <div className="mt-3">
            <Row
              label="CGPA · percentage"
              value={academic.cgpa != null ? `${academic.cgpa} · ${academic.percentage}%` : "—"}
            />
            <Row label="Backlogs" value={backlogsLabel} />
            <Row label="Research output" value={readiness.research_output ?? "—"} />
            <Row label="Internship" value={readiness.internship ?? "—"} />
            <Row label="Passport" value={readiness.passport ?? "—"} />
            <Row label="Visa" value={readiness.visa ?? "—"} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Application timeline</h2>
          <div className="mt-3">
            <Row
              label="Application submitted"
              value={timeline.application_submitted ? formatDisplayDate(timeline.application_submitted) : "—"}
            />
            <Row
              label="Test score reported"
              value={timeline.test_score_reported ? formatDisplayDate(timeline.test_score_reported) : "—"}
            />
            <Row
              label="Interview / evaluation"
              value={timeline.interview_date ? formatDisplayDate(timeline.interview_date) : "—"}
            />
            <Row label="Offer / result" value={timeline.offer_result ?? "—"} />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">Funding &amp; contact</h2>
          <div className="mt-3">
            <Row label="Scholarship" value={funding.scholarship ?? "—"} />
            <Row label="Value" value={currency(funding.scholarship_value)} />
            <Row label="Loan / funding" value={funding.loan_funding ?? "—"} />
            <Row label="Student mobile" value={student.mobile ?? "—"} />
            <Row label="Email" value={student.email} />
            <Row
              label="Guardian"
              value={student.guardian ? `${student.guardian.name}${student.guardian.mobile ? ` · ${student.guardian.mobile}` : ""}` : "—"}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
