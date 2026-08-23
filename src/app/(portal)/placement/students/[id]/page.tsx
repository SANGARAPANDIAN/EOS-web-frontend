"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { useStudentProfile } from "@/modules/placement/hooks/useStudentProfile";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApplicationStatus, StudentApplicationRow, StudentOfferRow, StudentProfile } from "@/modules/placement/types";

function statusLabel(status: ApplicationStatus | null): string {
  if (status === "placed") return "Placed";
  if (status === "rejected") return "Not placed";
  if (status === null) return "Not applied";
  return "In process";
}

function statusTone(status: ApplicationStatus | null): "accent" | "accentDark" | "neutral" | "danger" {
  if (status === "placed") return "accentDark";
  if (status === "rejected") return "danger";
  if (status === null) return "neutral";
  return "accent";
}

function applicationStageLabel(status: ApplicationStatus): string {
  if (status === "placed") return "Selected";
  if (status === "rejected") return "Rejected";
  if (status === "r1_cleared") return "Shortlisted";
  if (status === "r2_cleared" || status === "r3_cleared") return "In process";
  return "Applied";
}

function applicationStageTone(status: ApplicationStatus): "accent" | "accentDark" | "neutral" | "danger" {
  if (status === "placed") return "accentDark";
  if (status === "rejected") return "danger";
  return "accent";
}

function offerResponseLabel(response: StudentOfferRow["offerResponse"]): string {
  if (response === "accepted") return "Accepted";
  if (response === "declined") return "Declined";
  return "Pending";
}

function offerResponseTone(response: StudentOfferRow["offerResponse"]): "accent" | "accentDark" | "neutral" | "danger" {
  if (response === "accepted") return "accentDark";
  if (response === "declined") return "danger";
  return "neutral";
}

function lpa(value: number | null): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function yearLabel(year: number | null): string {
  if (year == null) return "—";
  const roman = ["I", "II", "III", "IV"][year - 1] ?? String(year);
  return `${roman} Year`;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Real, from student_profiles — directly useful to a placement officer reviewing a candidate. */
function profileLinks(profile: StudentProfile): { label: string; url: string }[] {
  return [
    profile.linkedinUrl && { label: "LinkedIn", url: profile.linkedinUrl },
    profile.githubUrl && { label: "GitHub", url: profile.githubUrl },
    profile.leetcodeUrl && { label: "LeetCode", url: profile.leetcodeUrl },
    profile.hackerrankUrl && { label: "HackerRank", url: profile.hackerrankUrl },
    profile.codeforcesUrl && { label: "Codeforces", url: profile.codeforcesUrl },
  ].filter((l): l is { label: string; url: string } => !!l);
}

function DetailRow({ label, value, badge, tone }: { label: string; value: string; badge?: string; tone?: "accent" | "accentDark" | "neutral" | "danger" }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-divider py-2.5 first:border-t-0">
      <span className="min-w-33 text-[12.5px] text-subtle">{label}</span>
      <span className="flex-1 text-[13px] font-semibold text-ink">{value}</span>
      {badge && <Badge tone={tone ?? "neutral"}>{badge}</Badge>}
    </div>
  );
}

function ListRow({ title, meta, right, badge, tone }: { title: string; meta: string; right?: string; badge: string; tone: "accent" | "accentDark" | "neutral" | "danger" }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-divider py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-subtle">{meta}</div>
      </div>
      {right && <span className="font-mono text-[13px] font-medium">{right}</span>}
      <Badge tone={tone}>{badge}</Badge>
    </div>
  );
}

interface JourneyStep {
  label: string;
  meta: string;
  done: boolean;
}

function buildJourney(profile: StudentProfile): JourneyStep[] {
  const shortlisted = profile.applications.some(
    (a) => a.status === "r1_cleared" || a.status === "r2_cleared" || a.status === "r3_cleared" || a.status === "placed",
  );
  const interviewed = profile.applications.some((a) => a.status === "r2_cleared" || a.status === "r3_cleared" || a.status === "placed");
  const offerReceived = profile.offersCount > 0;
  const bestOffer = profile.offers[0];
  const placed = profile.status === "placed" && bestOffer?.offerResponse === "accepted";

  return [
    { label: "Applied", meta: `${profile.drivesApplied} drive${profile.drivesApplied === 1 ? "" : "s"}`, done: profile.drivesApplied > 0 },
    { label: "Shortlisted", meta: shortlisted ? "Cleared screening" : "Not yet shortlisted", done: shortlisted },
    { label: "Interviewed", meta: interviewed ? "Rounds cleared" : "Not yet scheduled", done: interviewed },
    { label: "Offer received", meta: offerReceived ? `${profile.offersCount} offer${profile.offersCount === 1 ? "" : "s"}` : "No offer yet", done: offerReceived },
    {
      label: "Placed",
      meta: placed ? "Offer accepted" : bestOffer?.offerResponse === "declined" ? "Offer declined" : "Awaiting response",
      done: placed,
    },
  ];
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();
  const driveId = searchParams.get("driveId");
  const { data: profile, isLoading, error } = useStudentProfile(id);

  if (isLoading || error || !profile) {
    return <EmptyState loading={isLoading} message={error ? "Failed to load this student." : "Student not found."} />;
  }

  const backLabel = driveId ? "← Back to Placement Drives" : "← Back to Students";
  const backHref = driveId ? `/placement/drives/${driveId}` : "/placement/students";
  const journey = buildJourney(profile);
  const links = profileLinks(profile);

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" className="h-8.5 self-start px-3.5" onClick={() => router.push(backHref)}>
        {backLabel}
      </Button>

      <Card className="p-[24px_26px]">
        <div className="flex flex-wrap items-center gap-4.5">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase storage URL, not a local asset
            <img src={profile.photoUrl} alt={profile.name} className="size-[62px] shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex size-[62px] shrink-0 items-center justify-center rounded-full bg-accent-100 text-[21px] font-bold text-primary">
              {initials(profile.name)}
            </div>
          )}
          <div className="min-w-55 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[26px] font-bold tracking-[-.02em] text-ink">{profile.name}</span>
              <Badge tone={statusTone(profile.status)}>{statusLabel(profile.status)}</Badge>
              <Badge tone="neutral">Not tracked</Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-2.5 text-[13px] text-muted">
              <span className="font-mono">{profile.registerNo ?? profile.studentIdNo}</span>
              <span className="text-border-default">·</span>
              <span>{profile.departmentCode ?? "—"}</span>
              <span className="text-border-default">·</span>
              <span>{yearLabel(profile.year)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`mailto:${profile.email}`}
              className="rounded-[11px] border-[1.5px] border-border-accent bg-surface px-[22px] py-[13px] text-sm font-bold text-primary transition-colors hover:bg-nav-hover"
            >
              Email student
            </a>
            {/* Some seeded resume_url rows are placeholder relative paths that don't resolve to a real file — only treat it as a real download once it's an actual URL. */}
            {profile.resumeUrl?.startsWith("http") ? (
              <Button variant="primarySmall" onClick={() => window.open(profile.resumeUrl!, "_blank", "noopener,noreferrer")}>
                Download resume
              </Button>
            ) : (
              <Button variant="primarySmall" onClick={() => show("No resume uploaded yet.", "error")}>
                Download resume
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {(
            [
              ["CGPA", "—", "Not tracked in this system yet"],
              ["Standing arrears", "—", "Not tracked in this system yet"],
              ["Applications", String(profile.drivesApplied), "This placement cycle"],
              ["Offers", String(profile.offersCount), lpa(Math.max(0, ...profile.offers.map((o) => o.offeredPackageLpa ?? 0)) || null)],
            ] as const
          ).map(([label, value, sub]) => (
            <div key={label} className="rounded-input bg-surface-tint p-[13px_15px]">
              <div className="text-[11.5px] text-subtle">{label}</div>
              <div className="mt-1 text-xl font-bold tracking-[-.02em] text-ink">{value}</div>
              <div className="mt-0.5 text-[11px] text-subtle">{sub}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-3.5">
        <div className="flex flex-col gap-3.5">
          <Card>
            <div className="text-sm font-bold text-ink">Profile</div>
            <div className="mt-2 flex flex-col">
              <DetailRow label="Register number" value={profile.registerNo ?? profile.studentIdNo} />
              <DetailRow label="Department" value={profile.departmentCode ?? "—"} />
              <DetailRow label="Year" value={yearLabel(profile.year)} />
              <DetailRow label="CGPA" value="—" />
              <DetailRow label="Standing arrears" value="—" />
              <DetailRow label="Eligibility" value="" badge="Not tracked" tone="neutral" />
              <DetailRow label="Placement status" value="" badge={statusLabel(profile.status)} tone={statusTone(profile.status)} />
              {links.length > 0 && (
                <div className="flex items-center gap-3.5 border-t border-divider py-2.5">
                  <span className="min-w-33 text-[12.5px] text-subtle">Profiles</span>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {links.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[5px] bg-accent-100 px-2.5 py-[3.5px] text-xs font-semibold text-primary no-underline"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-ink">Placement journey</div>
            <div className="mt-3.5 flex flex-col">
              {journey.map((j, i) => (
                <div key={j.label} className="flex gap-3">
                  <div className="flex w-2.5 flex-col items-center">
                    <span className={`size-2.5 shrink-0 rounded-full border-2 ${j.done ? "border-primary bg-primary" : "border-border-default bg-surface"}`} />
                    {i < journey.length - 1 && (
                      <span className={`my-1 w-0.5 flex-1 ${journey[i + 1].done ? "bg-primary" : "bg-border-default"}`} style={{ minHeight: 16 }} />
                    )}
                  </div>
                  <div className="pb-3.5">
                    <div className={`text-[13px] ${j.done ? "font-bold text-ink" : "font-medium text-subtle"}`}>{j.label}</div>
                    <div className="mt-0.5 text-[11.5px] text-subtle">{j.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3.5">
          <Card>
            <div className="text-sm font-bold text-ink">Applications</div>
            {profile.applications.length === 0 && <div className="py-4.5 pb-1.5 text-[12.5px] text-subtle">No applications recorded this cycle.</div>}
            <div className="mt-2 flex flex-col">
              {profile.applications.map((a: StudentApplicationRow) => (
                <ListRow
                  key={a.driveId}
                  title={a.companyName}
                  meta={[a.jobRole, `Applied ${dateLabel(a.updatedAt)}`].filter(Boolean).join(" · ")}
                  badge={applicationStageLabel(a.status)}
                  tone={applicationStageTone(a.status)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-ink">Offers</div>
            {profile.offers.length === 0 && <div className="py-4.5 pb-1.5 text-[12.5px] text-subtle">No offers released yet.</div>}
            <div className="mt-2 flex flex-col">
              {profile.offers.map((o: StudentOfferRow) => (
                <ListRow
                  key={o.driveId}
                  title={o.companyName}
                  meta={[o.jobRole, `Released ${dateLabel(o.updatedAt)}`].filter(Boolean).join(" · ")}
                  right={lpa(o.offeredPackageLpa)}
                  badge={offerResponseLabel(o.offerResponse)}
                  tone={offerResponseTone(o.offerResponse)}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
