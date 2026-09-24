"use client";

import { Card, EmptyState, Icon, Badge } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildHigherEducation } from "@/modules/parent/api/higherEducation";
import type { MyHigherEducation } from "@/modules/student/api/higherEducation";
import { formatDisplayDate } from "@/lib/utils/date";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-divider py-2.5 last:border-0">
      <span className="text-[12.5px] font-semibold text-muted">{label}</span>
      <span className="text-[13.5px] font-bold text-ink">{value ?? "—"}</span>
    </div>
  );
}

function HigherEducationDetail({ row }: { row: MyHigherEducation }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <h2 className="mb-1 text-[15px] font-bold text-ink">{row.preferred_course}</h2>
        <p className="mb-3 text-[13px] text-muted">{row.preferred_university ? `${row.preferred_university}, ` : ""}{row.preferred_country}</p>
        <Row label="Intake term" value={row.intake_term} />
        <Row label="Admission status" value={row.admission_status} />
        <Row label="Offer status" value={row.offer_status} />
        <Row label="Visa status" value={row.visa_status} />
        <Row label="Application submitted" value={row.application_submitted_date ? formatDisplayDate(row.application_submitted_date) : null} />
        <Row label="Interview date" value={row.interview_date ? formatDisplayDate(row.interview_date) : null} />
      </Card>
      <Card>
        <h2 className="mb-3 text-[15px] font-bold text-ink">Funding &amp; scholarship</h2>
        <Row label="Scholarship" value={row.is_scholarship ? (row.scholarship_name ?? "Yes") : "No"} />
        {row.scholarship_value !== null && <Row label="Scholarship value" value={`₹${row.scholarship_value.toLocaleString("en-IN")}`} />}
        <Row label="Funding source" value={row.funding_source} />
        <Row label="SOP status" value={row.sop_status} />
        <Row label="Recommendations" value={row.recommendation_status} />
        <Row label="Research output" value={row.research_output} />
        <Row label="Internship details" value={row.internship_details} />
        {row.remarks && (
          <div className="mt-2 border-t border-divider pt-2.5">
            <span className="text-[12.5px] font-semibold text-muted">Remarks</span>
            <p className="mt-1 text-[13px] text-body">{row.remarks}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ParentHigherStudiesPage() {
  const { selectedChildId } = useSelectedChild();
  const { data: record, isLoading, error } = useChildHigherEducation(selectedChildId);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Higher Studies</h1>
          <p className="mt-1 text-[13.5px] text-muted">Your child&apos;s further-studies plan, as recorded by the department</p>
        </div>
        <ChildSwitcher />
      </div>

      {isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : error ? (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load this record."} />
        </Card>
      ) : !record ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon name="school" size={32} className="text-subtle" />
            <div className="text-[15px] font-bold text-ink">No higher-studies record on file yet</div>
            <p className="max-w-md text-[13px] text-muted">
              Once the class advisor or department records a further-studies plan, it will show up here.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {record.admission_status && (
            <div className="self-start">
              <Badge tone="accent">{record.admission_status}</Badge>
            </div>
          )}
          <HigherEducationDetail row={record} />
        </>
      )}
    </div>
  );
}
