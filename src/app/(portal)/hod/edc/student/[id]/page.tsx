"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, Badge, Button, EmptyState, ProfilePhoto, SkeletonBlock } from "@/components/ui";
import { useHodEdcProfile } from "@/modules/hod/api/edc";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-divider py-3.5 first:border-t-0">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-[14.5px] font-bold text-ink">{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-1 text-[13.5px] font-bold text-ink">{value}</div>
    </div>
  );
}

function yesNo(value: boolean | null): string {
  return value === true ? "Yes" : value === false ? "No" : "—";
}

function currency(value: number | null): string {
  return value != null ? `₹${value.toLocaleString("en-IN")}` : "—";
}

export default function HodEdcProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const profile = useHodEdcProfile(id);

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
        <EmptyState message="EDC record not found." />
      </Card>
    );
  }

  const { student, venture, stats, entrepreneurship_status, business_details, founder_team, startup_progress, funding } = profile.data;

  const externalMentor = [founder_team.external_mentor_name, founder_team.external_mentor_org].filter(Boolean).join(" · ") || "—";
  const monthlyAnnual =
    startup_progress.monthly_revenue != null
      ? `${currency(startup_progress.monthly_revenue)} · ${currency(startup_progress.monthly_revenue * 12)}`
      : "—";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <Button variant="secondary" className="w-fit" onClick={() => router.push("/hod/edc")}>
        ← All EDC students
      </Button>

      <Card>
        <div className="flex items-start gap-5">
          <div className="flex shrink-0 flex-col gap-5">
            <ProfilePhoto
              imageUrl={student.photo_url}
              alt={student.name}
              label="student photo"
              className="h-[186px] w-[187px] text-[12px]"
            />
            <ProfilePhoto
              imageUrl={venture.logo_url}
              alt={venture.business_name}
              label="venture logo"
              className="h-[136px] w-[187px] text-[12px]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[32px] font-extrabold tracking-[-.02em] text-ink">{student.name}</h2>
            <p className="mt-1.5 text-[15.5px] text-muted">
              {venture.business_name} · {venture.sector ?? "—"}
              {venture.year_started != null ? ` · started ${venture.year_started}` : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {venture.stage && <Badge tone="accent">{venture.stage}</Badge>}
              <Badge tone="neutral">{venture.entrepreneur_type ?? "—"}</Badge>
              <Badge tone="neutral">{venture.funding_status ?? "—"}</Badge>
              {venture.is_incubated && <Badge tone="accentDark">Incubated</Badge>}
              <Badge tone="neutral">Reg {student.student_id_no}</Badge>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-4">
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">Customers / users</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">{stats.customers_count ?? "—"}</div>
                {stats.customers_count != null && <div className="mt-2 text-[12.5px] text-subtle">active this quarter</div>}
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">Monthly revenue</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">{currency(stats.monthly_revenue)}</div>
                {stats.monthly_revenue != null && (
                  <div className="mt-2 text-[12.5px] text-subtle">{currency(stats.monthly_revenue * 12)} a year</div>
                )}
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">Team size</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">{stats.team_size ?? "—"}</div>
                {stats.team_size != null && <div className="mt-2 text-[12.5px] text-subtle">{stats.team_size} employees</div>}
              </div>
              <div className="hod-hover-card rounded-[11px] border border-border-default p-4">
                <div className="text-[13.5px] text-[#5c6573]">Funding raised</div>
                <div className="mt-1.5 text-[32px] font-extrabold text-ink">{currency(stats.funding_raised)}</div>
                <div className="mt-2 text-[12.5px] text-subtle">{stats.funding_raised != null ? "Raised so far" : "Not raised"}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">1 · Student information</h2>
          <div className="mt-3">
            <Row label="Student name" value={student.name} />
            <Row label="Register number" value={student.student_id_no} />
            <Row label="Department" value={student.department_code ?? "—"} />
            <Row label="Programme" value={student.programme ?? "—"} />
            <Row
              label="Batch · year of study"
              value={[student.batch_label, student.year_label ? `${student.year_label} Year` : null].filter(Boolean).join(" · ") || "—"}
            />
            <Row label="College email" value={student.email} />
            <Row label="Mobile number" value={student.mobile ?? "—"} />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">2 · Entrepreneurship status</h2>
          <div className="mt-3">
            <Row label="Entrepreneurship status" value={entrepreneurship_status.stage ?? "—"} />
            <Row label="Entrepreneur type" value={entrepreneurship_status.entrepreneur_type ?? "—"} />
            <Row label="Year started" value={entrepreneurship_status.year_started ?? "—"} />
            <Row label="Current status" value={entrepreneurship_status.current_status_note ?? "—"} />
            <Row label="Registration" value={entrepreneurship_status.registration_type ?? "—"} />
          </div>
        </Card>
      </div>

      <Card className="hod-hover-card border-primary/40">
        <h2 className="text-[17px] font-extrabold text-ink">3 · Startup / business details</h2>
        <div className="mt-4 grid grid-cols-3 gap-x-8 gap-y-5">
          <Field label="Business name" value={business_details.business_name} />
          <Field label="Industry / domain" value={business_details.sector ?? "—"} />
          <Field label="Business category" value={business_details.business_category ?? "—"} />
          <Field label="Problem statement" value={business_details.problem_statement ?? "—"} />
          <Field label="Location" value={business_details.location ?? "—"} />
          <Field label="Solution / product" value={business_details.solution_product ?? "—"} />
          <Field label="Business model" value={business_details.business_model ?? "—"} />
          <Field label="Target customers" value={business_details.target_customers ?? "—"} />
          <Field label="Website" value={business_details.website ?? "—"} />
          <Field label="LinkedIn" value={business_details.linkedin_url ?? "—"} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">4 · Founder &amp; team</h2>
          <div className="mt-3">
            <Row label="Founder" value={founder_team.founder_name} />
            <Row label="Co-founders" value={founder_team.co_founders ?? "—"} />
            <Row label="Team members" value={founder_team.team_size ?? "—"} />
            <Row label="Student team" value={founder_team.student_team_note ?? "—"} />
            <Row label="Faculty mentor" value={founder_team.faculty_mentor ?? "—"} />
            <Row label="External mentor" value={externalMentor} />
            <Row label="Team roles" value={founder_team.team_roles_note ?? "—"} />
          </div>
        </Card>

        <Card className="hod-hover-card">
          <h2 className="text-[17px] font-extrabold text-ink">5 · Startup progress</h2>
          <div className="mt-3">
            <Row label="Idea developed" value={yesNo(startup_progress.idea_developed)} />
            <Row label="Prototype developed" value={yesNo(startup_progress.prototype_developed)} />
            <Row label="MVP launched" value={yesNo(startup_progress.mvp_launched)} />
            <Row label="Product / service launched" value={yesNo(startup_progress.product_launched)} />
            <Row label="Customers / users" value={startup_progress.customers_count ?? "—"} />
            <Row label="Monthly · annual revenue" value={monthlyAnnual} />
            <Row label="Employees" value={startup_progress.team_size ?? "—"} />
            <Row label="Current growth stage" value={startup_progress.growth_stage ?? "—"} />
          </div>
        </Card>
      </div>

      <Card className="hod-hover-card">
        <h2 className="text-[17px] font-extrabold text-ink">6 · Funding</h2>
        <div className="mt-3 grid grid-cols-2 gap-x-8">
          <div>
            <Row label="Funding status" value={funding.funding_status ?? "—"} />
            <Row label="Funding source" value={funding.funding_source ?? "—"} />
            <Row label="Incubator support" value={funding.incubator_support ?? "—"} />
          </div>
          <div>
            <Row label="Funding received" value={currency(funding.funding_received)} />
            <Row label="Government grant / scheme" value={funding.govt_grant_scheme ?? "—"} />
            <Row label="Accelerator support" value={funding.accelerator_support ?? "—"} />
          </div>
        </div>
      </Card>
    </div>
  );
}
