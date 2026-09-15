"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { Badge, type BadgeTone, Button, Card } from "@/modules/admin/components/ui";
import { useStudentProfile } from "@/modules/placement/api/students";
import type { StudentApplicationRow, StudentOfferRow, StudentProfile } from "@/modules/placement/api/students";
import { applicationStageLabel, dateLabel, lpa, offerResponseLabel, rosterStatusLabel, yearLabel } from "@/modules/placement/lib/format";
import { SkeletonBlock, SkeletonStatTiles, SkeletonCardGrid } from "@/components/ui/Skeleton";

function statusTone(label: string): BadgeTone {
  if (label === "Placed") return "success";
  if (label === "Not placed") return "danger";
  if (label === "In process") return "warning";
  return "neutral";
}

function stageTone(label: string): BadgeTone {
  if (label === "Selected") return "success";
  if (label === "Rejected") return "danger";
  if (label === "In process" || label === "Shortlisted") return "warning";
  return "neutral";
}

function offerTone(label: string): BadgeTone {
  if (label === "Accepted") return "success";
  if (label === "Declined") return "danger";
  return "warning";
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Real, from student_profiles — genuinely available and directly useful to a placement officer reviewing a candidate. */
function profileLinks(profile: StudentProfile): { label: string; url: string }[] {
  return [
    profile.linkedinUrl && { label: "LinkedIn", url: profile.linkedinUrl },
    profile.githubUrl && { label: "GitHub", url: profile.githubUrl },
    profile.leetcodeUrl && { label: "LeetCode", url: profile.leetcodeUrl },
    profile.hackerrankUrl && { label: "HackerRank", url: profile.hackerrankUrl },
    profile.codeforcesUrl && { label: "Codeforces", url: profile.codeforcesUrl },
  ].filter((l): l is { label: string; url: string } => !!l);
}

function DetailRow({ label, value, badge, badgeTone }: { label: string; value?: string; badge?: string; badgeTone?: BadgeTone }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-admin-divider py-2.5 first:border-t-0">
      <span className="min-w-[140px] text-[12.5px] text-admin-muted">{label}</span>
      {value !== undefined && <span className="flex-1 text-sm font-medium text-admin-ink">{value}</span>}
      {badge && <Badge tone={badgeTone ?? "neutral"}>{badge}</Badge>}
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
    {
      label: "Offer received",
      meta: offerReceived ? `${profile.offersCount} offer${profile.offersCount === 1 ? "" : "s"}` : "No offer yet",
      done: offerReceived,
    },
    {
      label: "Placed",
      meta: placed ? "Offer accepted" : bestOffer?.offerResponse === "declined" ? "Offer declined" : "Awaiting response",
      done: placed,
    },
  ];
}

function StudentDetailContent({ id }: { id: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();
  const driveId = searchParams.get("driveId");
  const { data: profile, isLoading, error } = useStudentProfile(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock className="h-[150px]" />
        <SkeletonStatTiles count={4} />
        <SkeletonCardGrid count={2} columns={2} />
      </div>
    );
  }
  if (error || !profile) return <p className="text-sm text-admin-danger">Failed to load this student.</p>;

  const backLabel = driveId ? "Back to Placement Drives" : "Back to Students";
  const backHref = driveId ? `/placement/drives/${driveId}` : "/placement/students";
  const journey = buildJourney(profile);
  const statusLabel = rosterStatusLabel(profile.status);
  const bestOfferPackage = Math.max(0, ...profile.offers.map((o) => o.offeredPackageLpa ?? 0)) || null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm text-admin-muted">
          <Link href="/placement/students" className="hover:text-admin-body">
            Students
          </Link>
          <Icon name="chevron_right" size={15} />
          <span className="font-semibold text-admin-body">{profile.name}</span>
        </nav>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1.5 text-sm font-semibold text-admin-body hover:text-admin-ink"
        >
          <Icon name="arrow_back" size={15} /> {backLabel}
        </button>
      </div>

      <Card hoverable={false} className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="h-[62px] w-[62px] shrink-0 overflow-hidden rounded-full">
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external storage URL, not a local asset
              <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-admin-tint-strong text-xl font-bold text-admin-primary-deep">
                {initials(profile.name)}
              </div>
            )}
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-sans text-2xl font-extrabold tracking-tight text-admin-ink">{profile.name}</h1>
              <Badge tone={statusTone(statusLabel)}>{statusLabel}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-admin-muted">
              <span className="font-mono">{profile.registerNo ?? profile.studentIdNo}</span>
              <span>·</span>
              <span>{profile.departmentCode ?? "—"}</span>
              <span>·</span>
              <span>{yearLabel(profile.year)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${profile.email}`}>
              <Button variant="secondary">
                <Icon name="mail" size={16} /> Email student
              </Button>
            </a>
            {/* Some seeded resume_url rows are placeholder relative paths that don't resolve to a real file — only treat it as a real download once it's an actual URL. */}
            {profile.resumeUrl?.startsWith("http") ? (
              <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary">
                  <Icon name="description" size={16} /> Download resume
                </Button>
              </a>
            ) : (
              <Button variant="primary" onClick={() => show("No resume uploaded yet.", "error")}>
                <Icon name="description" size={16} /> Download resume
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "CGPA", value: "—", sub: "Not tracked in this system yet" },
            { label: "Standing arrears", value: "—", sub: "Not tracked in this system yet" },
            { label: "Applications", value: String(profile.drivesApplied), sub: "This placement cycle" },
            { label: "Offers", value: String(profile.offersCount), sub: lpa(bestOfferPackage) },
          ].map((tile) => (
            <div key={tile.label} className="rounded-admin-md bg-admin-tint p-3.5">
              <p className="text-[11.5px] text-admin-muted">{tile.label}</p>
              <p className="mt-1 font-sans text-xl font-bold tracking-tight text-admin-ink">{tile.value}</p>
              <p className="mt-0.5 text-[11px] text-admin-subtle">{tile.sub}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card hoverable={false} className="p-5">
            <h2 className="font-sans text-[15px] font-bold text-admin-ink">Profile</h2>
            <div className="mt-2">
              <DetailRow label="Register number" value={profile.registerNo ?? profile.studentIdNo} />
              <DetailRow label="Department" value={profile.departmentCode ?? "—"} />
              <DetailRow label="Year" value={yearLabel(profile.year)} />
              <DetailRow label="CGPA" value="—" />
              <DetailRow label="Standing arrears" value="—" />
              <DetailRow label="Placement status" badge={statusLabel} badgeTone={statusTone(statusLabel)} />
              {profileLinks(profile).length > 0 && (
                <div className="flex items-center gap-3.5 border-t border-admin-divider py-2.5">
                  <span className="min-w-[140px] text-[12.5px] text-admin-muted">Profiles</span>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {profileLinks(profile).map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-admin-sm bg-admin-tint-strong px-2.5 py-1 text-xs font-semibold text-admin-primary hover:bg-admin-tint-deep"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card hoverable={false} className="p-5">
            <h2 className="font-sans text-[15px] font-bold text-admin-ink">Placement journey</h2>
            <div className="mt-3.5 flex flex-col">
              {journey.map((j, i) => (
                <div key={j.label} className="flex gap-3">
                  <div className="flex w-3 flex-col items-center">
                    <span className={`h-[11px] w-[11px] shrink-0 rounded-full border-2 ${j.done ? "border-admin-primary bg-admin-primary" : "border-admin-border bg-admin-canvas"}`} />
                    {i < journey.length - 1 && (
                      <span className={`my-0.5 min-h-4 w-0.5 flex-1 ${journey[i + 1].done ? "bg-admin-primary" : "bg-admin-divider"}`} />
                    )}
                  </div>
                  <div className="pb-3.5">
                    <p className={`text-sm ${j.done ? "font-semibold text-admin-ink" : "text-admin-muted"}`}>{j.label}</p>
                    <p className="mt-0.5 text-[11.5px] text-admin-subtle">{j.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card hoverable={false} className="p-5">
            <h2 className="font-sans text-[15px] font-bold text-admin-ink">Applications</h2>
            {profile.applications.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-admin-subtle">No applications recorded this cycle.</p>
            ) : (
              <div className="mt-2">
                {profile.applications.map((a: StudentApplicationRow) => {
                  const stage = applicationStageLabel(a.status);
                  return (
                    <div key={a.driveId} className="flex items-center gap-3.5 border-t border-admin-divider py-3 first:border-t-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-admin-ink">{a.companyName}</p>
                        <p className="mt-0.5 text-xs text-admin-muted">{[a.jobRole, `Applied ${dateLabel(a.updatedAt)}`].filter(Boolean).join(" · ")}</p>
                      </div>
                      <Badge tone={stageTone(stage)}>{stage}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card hoverable={false} className="p-5">
            <h2 className="font-sans text-[15px] font-bold text-admin-ink">Offers</h2>
            {profile.offers.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-admin-subtle">No offers released yet.</p>
            ) : (
              <div className="mt-2">
                {profile.offers.map((o: StudentOfferRow) => {
                  const response = offerResponseLabel(o.offerResponse);
                  return (
                    <div key={o.driveId} className="flex items-center gap-3.5 border-t border-admin-divider py-3 first:border-t-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-admin-ink">{o.companyName}</p>
                        <p className="mt-0.5 text-xs text-admin-muted">{[o.jobRole, `Released ${dateLabel(o.updatedAt)}`].filter(Boolean).join(" · ")}</p>
                      </div>
                      <span className="font-mono text-sm font-medium text-admin-ink">{lpa(o.offeredPackageLpa)}</span>
                      <Badge tone={offerTone(response)}>{response}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudentDetailInner() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  return <StudentDetailContent id={id} />;
}

export default function StudentDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-admin-muted">Loading…</p>}>
      <StudentDetailInner />
    </Suspense>
  );
}
