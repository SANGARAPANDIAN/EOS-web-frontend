"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, Badge, EmptyState, type BadgeTone } from "@/components/ui";
import { useAspirantDetail, type AspirantStatus } from "@/modules/higher-education/api/aspirants";
import { formatDisplayDate } from "@/lib/utils/date";

const STATUS_LABEL: Record<AspirantStatus, string> = {
  interested: "Interested",
  applied: "Applied",
  admitted: "Admitted",
  enrolled: "Enrolled",
};

const STATUS_TONE: Record<AspirantStatus, BadgeTone> = {
  interested: "neutral",
  applied: "accent",
  admitted: "accentDark",
  enrolled: "accentDark",
};

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-6 border-b border-divider py-3 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={mono ? "font-mono text-[14px] text-ink-soft" : "text-right text-[14px] font-bold text-ink"}>{value}</span>
    </div>
  );
}

export default function AspirantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const aspirantId = Number(params.id);
  const detail = useAspirantDetail(aspirantId);
  const s = detail.data;

  if (detail.isLoading) {
    return <EmptyState message="Loading…" />;
  }

  if (!s) {
    return <EmptyState message="Aspirant record not found." />;
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button
        type="button"
        onClick={() => router.push("/higher-education/aspirants")}
        className="inline-flex w-fit items-center gap-2.5 rounded-[10px] border border-border-default bg-surface px-4 py-2.5 text-[14px] font-bold text-ink"
      >
        ← All higher-education students
      </button>

      <Card className="border-[1.5px] border-primary">
        <h1 className="text-[32px] font-extrabold tracking-[-.02em] text-ink">{s.student_name}</h1>
        <div className="mt-1.5 text-[14px] text-muted">
          {s.dept_name ?? "—"} · Batch {s.batch ?? "—"} · Register {s.register_no ?? "—"}
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
          <Badge tone="neutral">{s.mode}</Badge>
          {s.intake && <Badge tone="neutral">Intake {s.intake}</Badge>}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3.5">
          <div className="rounded-[11px] border border-divider p-3.5">
            <div className="text-[12.5px] text-muted">Destination</div>
            <div className="mt-1 text-[18px] font-extrabold text-ink">{s.programme.country}</div>
          </div>
          <div className="rounded-[11px] border border-divider p-3.5">
            <div className="text-[12.5px] text-muted">UG CGPA · %</div>
            <div className="mt-1 text-[16px] font-extrabold text-ink">
              {s.academics.cgpa != null || s.academics.percentage != null
                ? `${s.academics.cgpa ?? "—"} · ${s.academics.percentage != null ? `${s.academics.percentage}%` : "—"}`
                : "—"}
            </div>
          </div>
          <div className="rounded-[11px] border border-divider p-3.5">
            <div className="text-[12.5px] text-muted">Test scores</div>
            <div className="mt-1 text-[16px] font-extrabold text-ink">
              {s.testScores.length > 0 ? s.testScores.map((t) => `${t.test_name} ${t.score}`).join(" · ") : s.academics.test_scores_summary}
            </div>
          </div>
          <div className="rounded-[11px] border border-divider p-3.5 col-span-2 border-border-accent">
            <div className="text-[12.5px] text-body">Scholarship value</div>
            <div className="mt-1 text-[20px] font-extrabold text-primary">
              {s.funding.scholarship_value != null ? `₹${s.funding.scholarship_value.toLocaleString("en-IN")}` : "—"}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">{s.funding.scholarship_name}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h2 className="mb-1 text-[17px] font-extrabold text-ink">Programme & university</h2>
          <div className="mt-2">
            <Row label="Programme" value={s.programme.course} />
            <Row label="University" value={s.programme.university} />
            <Row label="Country" value={s.programme.country} />
            <Row label="Intake" value={s.programme.intake} />
            <Row label="Statement of purpose" value={s.programme.sop_status} />
            <Row label="Recommendation" value={s.programme.recommendation_status} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-[17px] font-extrabold text-ink">Readiness</h2>
          <div className="mt-2">
            <Row label="Research output" value={s.readiness.research_output} />
            <Row label="Internship" value={s.readiness.internship_details} />
            <Row label="Visa" value={s.readiness.visa_status} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h2 className="mb-1 text-[17px] font-extrabold text-ink">Application timeline</h2>
          <div className="mt-2">
            <Row
              label="Application submitted"
              value={s.timeline.application_submitted_date ? formatDisplayDate(s.timeline.application_submitted_date) : "—"}
            />
            <Row label="Interview / evaluation" value={s.timeline.interview_date ? formatDisplayDate(s.timeline.interview_date) : "—"} />
            <Row label="Offer / result" value={s.timeline.offer_status} />
          </div>
        </Card>
        <Card className="border-[1.5px] border-primary">
          <h2 className="mb-1 text-[17px] font-extrabold text-ink">Funding & contact</h2>
          <div className="mt-2">
            <Row label="Scholarship" value={s.funding.scholarship_name} />
            <Row
              label="Value"
              value={s.funding.scholarship_value != null ? `₹${s.funding.scholarship_value.toLocaleString("en-IN")}` : "—"}
              mono
            />
            <Row label="Loan / funding" value={s.funding.funding_source} />
            <Row label="Student mobile" value={s.funding.student_contact} mono />
            <Row label="Email" value={s.funding.email} mono />
            <Row label="Guardian" value={s.funding.guardian} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 text-[17px] font-extrabold text-ink">Remarks</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-body">{s.remarks}</p>
      </Card>
    </div>
  );
}
