"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, Badge, ProfilePhoto, Button, EmptyState, SkeletonBlock, SkeletonStatTiles, SkeletonCardGrid } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useHodStudentProfile,
  type HodStudentProfile,
  type HodStudentProfileApplication,
  type HodStudentProfileOffer,
} from "@/modules/hod/api/placements";
import { formatDisplayDate } from "@/lib/utils/date";

function rosterStatusLabel(status: HodStudentProfile["status"]): string {
  if (status === "placed") return "Placed";
  if (status === "rejected") return "Not placed";
  if (status === null) return "Not applied";
  return "In process";
}

function rosterStatusTone(status: HodStudentProfile["status"]): BadgeTone {
  if (status === "placed") return "accent";
  if (status === "rejected") return "danger";
  if (status === null) return "neutral";
  return "accentDark";
}

function applicationStatusLabel(status: HodStudentProfileApplication["status"]): string {
  if (status === "placed") return "Selected";
  if (status === "rejected") return "Rejected";
  if (status === "r1_cleared") return "Shortlisted";
  if (status === "r2_cleared" || status === "r3_cleared") return "In process";
  return "Applied";
}

function applicationStatusTone(status: HodStudentProfileApplication["status"]): BadgeTone {
  if (status === "placed") return "accent";
  if (status === "rejected") return "danger";
  if (status === "applied") return "neutral";
  return "accentDark";
}

function offerResponseLabel(response: HodStudentProfileOffer["offer_response"]): string {
  if (response === "accepted") return "Accepted";
  if (response === "declined") return "Declined";
  return "Pending";
}

function offerResponseTone(response: HodStudentProfileOffer["offer_response"]): BadgeTone {
  if (response === "accepted") return "accent";
  if (response === "declined") return "danger";
  return "accentDark";
}

function lpa(value: number | null): string {
  return value == null ? "—" : `₹${value} LPA`;
}

interface JourneyStep {
  label: string;
  meta: string;
  done: boolean;
}

function buildJourney(profile: HodStudentProfile): JourneyStep[] {
  const shortlisted = profile.applications.some((a) => a.status !== "applied");
  const interviewed = profile.applications.some((a) => a.status === "r2_cleared" || a.status === "r3_cleared" || a.status === "placed");
  const offerReceived = profile.offers_count > 0;
  const bestOffer = profile.offers[0];
  const placed = profile.status === "placed" && bestOffer?.offer_response === "accepted";

  return [
    { label: "Applied", meta: `${profile.drives_applied} drive${profile.drives_applied === 1 ? "" : "s"}`, done: profile.drives_applied > 0 },
    { label: "Shortlisted", meta: shortlisted ? "Cleared screening" : "Not yet shortlisted", done: shortlisted },
    { label: "Interviewed", meta: interviewed ? "Rounds cleared" : "Not yet scheduled", done: interviewed },
    {
      label: "Offer received",
      meta: offerReceived ? `${profile.offers_count} offer${profile.offers_count === 1 ? "" : "s"}` : "No offer yet",
      done: offerReceived,
    },
    {
      label: "Placed",
      meta: placed ? "Offer accepted" : bestOffer?.offer_response === "declined" ? "Offer declined" : "Awaiting response",
      done: placed,
    },
  ];
}

function DetailRow({ label, value, badge, badgeTone }: { label: string; value?: string; badge?: string; badgeTone?: BadgeTone }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-divider py-2.5 first:border-t-0">
      <span className="min-w-[140px] text-[12.5px] text-muted">{label}</span>
      {value !== undefined && <span className="flex-1 text-[13.5px] font-medium text-ink">{value}</span>}
      {badge && <Badge tone={badgeTone ?? "neutral"}>{badge}</Badge>}
    </div>
  );
}

function profileLinks(profile: HodStudentProfile): { label: string; url: string }[] {
  return [
    profile.linkedin_url && { label: "LinkedIn", url: profile.linkedin_url },
    profile.github_url && { label: "GitHub", url: profile.github_url },
    profile.leetcode_url && { label: "LeetCode", url: profile.leetcode_url },
    profile.hackerrank_url && { label: "HackerRank", url: profile.hackerrank_url },
    profile.codeforces_url && { label: "Codeforces", url: profile.codeforces_url },
  ].filter((l): l is { label: string; url: string } => !!l);
}

export default function HodPlacementStudentProfilePage() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);
  const router = useRouter();
  const profile = useHodStudentProfile(studentId);

  if (profile.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonBlock className="h-[150px]" />
        <SkeletonStatTiles count={4} />
        <SkeletonCardGrid count={2} columns={2} />
      </div>
    );
  }
  if (profile.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load this student&apos;s placement profile — please try again.
      </div>
    );
  }
  if (!profile.data) {
    return (
      <Card>
        <EmptyState message="Student not found." />
      </Card>
    );
  }

  const p = profile.data;
  const journey = buildJourney(p);
  const statusLabel = rosterStatusLabel(p.status);
  const bestOfferPackage = p.offers.reduce<number | null>(
    (max, o) => (o.offered_package != null && (max == null || o.offered_package > max) ? o.offered_package : max),
    null,
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center gap-6">
        <Button variant="secondary" className="shrink-0" onClick={() => router.push("/hod/placements")}>
          ← Back to placements
        </Button>
        <div>
          <h1 className="text-[21px] font-extrabold text-ink">{p.name}</h1>
          <p className="font-mono text-[13px] text-subtle">
            {p.student_id_no} · {p.department_code ?? "—"}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <ProfilePhoto photoUrl={p.photo_url} name={p.name} size={62} />
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[24px] font-extrabold tracking-[-.02em] text-ink">{p.name}</h2>
              <Badge tone={rosterStatusTone(p.status)}>{statusLabel}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span className="font-mono">{p.register_no ?? p.student_id_no}</span>
              <span>·</span>
              <span>{p.department_code ?? "—"}</span>
              {p.year != null && (
                <>
                  <span>·</span>
                  <span>Year {p.year}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${p.email}`}>
              <Button variant="secondary">Email student</Button>
            </a>
            {p.resume_url?.startsWith("http") && (
              <a href={p.resume_url} target="_blank" rel="noopener noreferrer">
                <Button variant="primarySmall">Download resume</Button>
              </a>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "CGPA", value: "—", sub: "Not tracked in this system yet" },
            { label: "Standing arrears", value: "—", sub: "Not tracked in this system yet" },
            { label: "Applications", value: String(p.drives_applied), sub: "This placement cycle" },
            { label: "Offers", value: String(p.offers_count), sub: lpa(bestOfferPackage) },
          ].map((tile) => (
            <div key={tile.label} className="hod-hover-card rounded-[11px] border border-border-default p-3.5">
              <p className="text-[11.5px] text-muted">{tile.label}</p>
              <p className="mt-1 text-[20px] font-extrabold tracking-[-.01em] text-ink">{tile.value}</p>
              {tile.sub && <p className="mt-0.5 text-[11px] text-subtle">{tile.sub}</p>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-[15px] font-extrabold text-ink">Profile</h2>
            <div className="mt-2">
              <DetailRow label="Register number" value={p.register_no ?? p.student_id_no} />
              <DetailRow label="Department" value={p.department_name ?? "—"} />
              <DetailRow label="Year" value={p.year != null ? String(p.year) : "—"} />
              <DetailRow label="CGPA" value="—" />
              <DetailRow label="Standing arrears" value="—" />
              <DetailRow label="Placement status" badge={statusLabel} badgeTone={rosterStatusTone(p.status)} />
              {profileLinks(p).length > 0 && (
                <div className="flex items-center gap-3.5 border-t border-divider py-2.5">
                  <span className="min-w-[140px] text-[12.5px] text-muted">Profiles</span>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {profileLinks(p).map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[7px] bg-accent-50 px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-accent-100"
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
            <h2 className="text-[15px] font-extrabold text-ink">Placement journey</h2>
            <div className="mt-3.5 flex flex-col">
              {journey.map((j, i) => (
                <div key={j.label} className="flex gap-3">
                  <div className="flex w-3 flex-col items-center">
                    <span className={`h-[11px] w-[11px] shrink-0 rounded-full border-2 ${j.done ? "border-primary bg-primary" : "border-border-default bg-surface"}`} />
                    {i < journey.length - 1 && (
                      <span className={`my-0.5 min-h-4 w-0.5 flex-1 ${journey[i + 1].done ? "bg-primary" : "bg-divider"}`} />
                    )}
                  </div>
                  <div className="pb-3.5">
                    <p className={`text-[13.5px] ${j.done ? "font-semibold text-ink" : "text-muted"}`}>{j.label}</p>
                    <p className="mt-0.5 text-[11.5px] text-subtle">{j.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-[15px] font-extrabold text-ink">Applications</h2>
            {p.applications.length === 0 ? (
              <div className="mt-3">
                <EmptyState message="No applications recorded this cycle." />
              </div>
            ) : (
              <div className="mt-2">
                {p.applications.map((a) => (
                  <div key={a.drive_id} className="flex items-center gap-3.5 border-t border-divider py-3 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{a.company_name}</p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {[a.job_role, `Applied ${formatDisplayDate(a.updated_at)}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge tone={applicationStatusTone(a.status)}>{applicationStatusLabel(a.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-[15px] font-extrabold text-ink">Offers</h2>
            {p.offers.length === 0 ? (
              <div className="mt-3">
                <EmptyState message="No offers released yet." />
              </div>
            ) : (
              <div className="mt-2">
                {p.offers.map((o) => (
                  <div key={o.drive_id} className="flex items-center gap-3.5 border-t border-divider py-3 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{o.company_name}</p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {[o.job_role, `Released ${formatDisplayDate(o.updated_at)}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="font-mono text-[13.5px] font-medium text-ink">{lpa(o.offered_package)}</span>
                    <Badge tone={offerResponseTone(o.offer_response)}>{offerResponseLabel(o.offer_response)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
