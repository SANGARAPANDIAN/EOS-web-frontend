"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Textarea, EmptyState, Icon, ConfirmDialog } from "@/components/ui";
import {
  useUpcomingDrives,
  usePostedDrives,
  useDriveHistory,
  useMyPlacementProfile,
  useUpdatePlacementProfile,
  useAddStudentProject,
  useRemoveStudentProject,
  useApplyToDrive,
} from "@/modules/student/api/placements";
import { formatDisplayDate } from "@/lib/utils/date";
import { APPLICATION_STATUS_LABEL } from "@/lib/config";
import { ApiError } from "@/types/api";

type Tab = "upcoming" | "history" | "profile";

const PROFILE_FIELDS: { key: keyof import("@/modules/student/api/placements").StudentProfileUrls; label: string }[] = [
  { key: "resume_url", label: "Resume URL" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "github_url", label: "GitHub" },
  { key: "leetcode_url", label: "LeetCode" },
  { key: "hackerrank_url", label: "HackerRank" },
  { key: "codeforces_url", label: "Codeforces" },
];

function driveMeta(packageLpa: number | null, roleOrDate: string): string {
  return packageLpa !== null ? `₹${packageLpa} LPA · ${roleOrDate}` : roleOrDate;
}

// The design reference shows a named, per-round breakdown (e.g. "Aptitude
// test: Cleared", "HR interview: Not scheduled") — there's no table anywhere
// that stores a drive's actual round names or a per-round result, only this
// single generic stage enum (capped at 3 rounds regardless of how many a
// drive really has). Rather than invent round names/statuses, this shows the
// one real, honestly-derived progress signal instead.
function ProgressLine({ status, lastClearedRound }: { status: string; lastClearedRound: number | null }) {
  if (status === "placed") return <div className="mt-2.5 text-[12.5px] font-semibold text-primary">Offer received</div>;
  if (status === "rejected" && lastClearedRound !== null) {
    return <div className="mt-2.5 text-[12.5px] text-muted">Not selected · cleared through round {lastClearedRound}</div>;
  }
  if (lastClearedRound !== null) {
    return <div className="mt-2.5 text-[12.5px] font-semibold text-primary">Cleared through round {lastClearedRound}</div>;
  }
  if (status === "applied") return <div className="mt-2.5 text-[12.5px] text-muted">Applied · results awaited</div>;
  return null;
}

function registrationWindowLabel(d: import("@/modules/student/api/placements").PostedDrive): string | null {
  if (!d.registration_start && !d.registration_end) return null;
  const open = d.registration_start ? `opens ${formatDisplayDate(d.registration_start)}` : null;
  const close = d.registration_end ? `closes ${formatDisplayDate(d.registration_end)}` : null;
  return `Applications ${[open, close].filter(Boolean).join(" · ")}`;
}

// Drives the placement cell has posted, within their registration window,
// that this student hasn't applied/been shortlisted for yet. Applying
// creates the same student_drive_applications row a placement-cell
// shortlist would — this card just lets the student create it themselves.
function PostedDriveCard({
  d,
  hasResume,
  applying,
  onApply,
}: {
  d: import("@/modules/student/api/placements").PostedDrive;
  hasResume: boolean;
  applying: boolean;
  onApply: () => void;
}) {
  const windowLabel = registrationWindowLabel(d);
  return (
    <Card key={d.drive_id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[16.5px] font-extrabold tracking-[-.02em] text-ink">{d.company_name}</div>
          <div className="mt-1 text-[13px] text-muted">{driveMeta(d.package_lpa, formatDisplayDate(d.scheduled_date))}</div>
          {d.company_profile_info && <p className="mt-1.5 text-[13px] text-body">{d.company_profile_info}</p>}
          {!d.is_disclosed && d.disclosed_reveal_date && (
            <div className="mt-1.5 text-[12px] text-subtle">Company reveals on {formatDisplayDate(d.disclosed_reveal_date)}</div>
          )}
          {windowLabel && <div className="mt-1.5 text-[12px] text-subtle">{windowLabel}</div>}
          {d.eligibility_cgpa !== null && <div className="mt-1 text-[12px] text-subtle">Eligibility: CGPA ≥ {d.eligibility_cgpa}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button variant="primarySmall" className="w-auto" disabled={!hasResume || applying} onClick={onApply}>
            {applying ? "Applying…" : "Apply"}
          </Button>
          {!hasResume && <span className="max-w-[160px] text-right text-[11px] text-subtle">Add a resume link in My profile first</span>}
        </div>
      </div>
    </Card>
  );
}

function UpcomingTab() {
  const drives = useUpcomingDrives();
  const posted = usePostedDrives();
  const profile = useMyPlacementProfile();
  const applyToDrive = useApplyToDrive();
  const [applyTarget, setApplyTarget] = useState<{ drive_id: number; company_name: string } | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  if (drives.isLoading) return <Card><EmptyState message="Loading…" /></Card>;

  const hasShortlisted = !!drives.data && drives.data.length > 0;
  const hasPosted = !!posted.data && posted.data.length > 0;
  const hasResume = !!profile.data?.profile?.resume_url;

  if (!hasShortlisted && !hasPosted && !posted.isLoading) {
    return <Card><EmptyState message="No drives posted right now." /></Card>;
  }

  function confirmApply() {
    if (!applyTarget) return;
    const driveId = applyTarget.drive_id;
    setApplyError(null);
    applyToDrive.mutate(driveId, {
      onError: (err) => setApplyError(err instanceof ApiError ? err.message : "Could not apply to this drive. Please try again."),
    });
    setApplyTarget(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {hasShortlisted && (
        <div className="flex flex-col gap-3">
          {drives.data!.map((d) => (
            <Card key={d.drive_id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[16.5px] font-extrabold tracking-[-.02em] text-ink">{d.company_name}</div>
                  <div className="mt-1 text-[13px] text-muted">{driveMeta(d.package_lpa, formatDisplayDate(d.scheduled_date))}</div>
                  {d.company_profile_info && <p className="mt-1.5 text-[13px] text-body">{d.company_profile_info}</p>}
                  {!d.is_disclosed && d.disclosed_reveal_date && (
                    <div className="mt-1.5 text-[12px] text-subtle">Company reveals on {formatDisplayDate(d.disclosed_reveal_date)}</div>
                  )}
                </div>
                <Badge tone={d.application_status === "rejected" ? "accentDark" : "accent"}>
                  {APPLICATION_STATUS_LABEL[d.application_status] ?? d.application_status}
                </Badge>
              </div>
              <ProgressLine status={d.application_status} lastClearedRound={d.last_cleared_round} />
            </Card>
          ))}
        </div>
      )}

      {hasPosted && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[14px] font-bold text-ink">Other posted drives</h2>
          {posted.data!.map((d) => (
            <PostedDriveCard
              key={d.drive_id}
              d={d}
              hasResume={hasResume}
              applying={applyToDrive.isPending && applyToDrive.variables === d.drive_id}
              onApply={() => setApplyTarget({ drive_id: d.drive_id, company_name: d.company_name })}
            />
          ))}
        </div>
      )}

      {applyError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{applyError}</div>
      )}

      <ConfirmDialog
        open={applyTarget !== null}
        title="Apply to this drive?"
        description={applyTarget ? `You're about to apply to ${applyTarget.company_name}. This can't be undone from here.` : undefined}
        confirmLabel="Apply"
        onConfirm={confirmApply}
        onCancel={() => setApplyTarget(null)}
      />
    </div>
  );
}

function HistoryTab() {
  const history = useDriveHistory();
  if (history.isLoading) return <Card><EmptyState message="Loading…" /></Card>;
  if (!history.data || history.data.length === 0) return <Card><EmptyState message="No concluded drives yet." /></Card>;
  return (
    <div className="flex flex-col gap-3">
      {history.data.map((d) => (
        <Card key={d.drive_id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[16.5px] font-extrabold tracking-[-.02em] text-ink">{d.company_name}</div>
              <div className="mt-1 text-[13px] text-muted">
                {driveMeta(d.package_lpa, d.job_role ?? formatDisplayDate(d.scheduled_date))}
              </div>
            </div>
            <Badge tone={d.application_status === "rejected" ? "accentDark" : "accent"}>
              {APPLICATION_STATUS_LABEL[d.application_status] ?? d.application_status}
            </Badge>
          </div>
          <ProgressLine status={d.application_status} lastClearedRound={d.last_cleared_round} />
        </Card>
      ))}
    </div>
  );
}

function ProfileTab() {
  const profile = useMyPlacementProfile();
  const updateProfile = useUpdatePlacementProfile();
  const addProject = useAddStudentProject();
  const removeProject = useRemoveStudentProject();

  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linksSaved, setLinksSaved] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ id: number; title: string } | null>(null);

  if (profile.isLoading) return <Card><EmptyState message="Loading…" /></Card>;

  function savedValue(key: string) {
    return profile.data?.profile?.[key as keyof typeof profile.data.profile] ?? "";
  }

  function fieldValue(key: string) {
    return form[key] ?? savedValue(key);
  }

  function handleFieldChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setLinksSaved(false);
  }

  function startEditingLinks() {
    setForm({});
    setSaveError(null);
    setLinksSaved(false);
    setIsEditingLinks(true);
  }

  function cancelEditingLinks() {
    setForm({});
    setSaveError(null);
    setIsEditingLinks(false);
  }

  function handleSaveLinks() {
    setSaveError(null);
    // A field left blank means "clear this link" — send null so
    // @IsOptional() on the backend DTO skips URL validation for it
    // (an empty string instead would fail @IsUrl() and 400).
    const payload: Record<string, string | null> = {};
    for (const f of PROFILE_FIELDS) {
      const value = fieldValue(f.key).trim();
      payload[f.key] = value || null;
    }
    updateProfile.mutate(payload, {
      onSuccess: () => {
        setForm({});
        setLinksSaved(true);
        setIsEditingLinks(false);
      },
      onError: (err) => {
        setSaveError(err instanceof ApiError ? err.message : "Could not save your links. Please try again.");
      },
    });
  }

  const hasAnyLink = PROFILE_FIELDS.some((f) => savedValue(f.key));

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">Links</h2>
          {!isEditingLinks && (
            <button onClick={startEditingLinks} className="flex items-center gap-1 text-[12.5px] font-bold text-primary hover:underline">
              <Icon name="edit" size={14} />
              Edit
            </button>
          )}
        </div>

        {isEditingLinks ? (
          <div className="flex flex-col gap-3">
            {PROFILE_FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">{f.label}</label>
                <Input
                  value={fieldValue(f.key)}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  placeholder="https://…"
                />
              </div>
            ))}
            {saveError && <p className="text-[12px] text-danger-fg">{saveError}</p>}
            <div className="flex items-center gap-3">
              <Button variant="primarySmall" className="self-start" disabled={updateProfile.isPending} onClick={handleSaveLinks}>
                {updateProfile.isPending ? "Saving…" : "Save"}
              </Button>
              <Button variant="secondary" className="w-auto self-start" disabled={updateProfile.isPending} onClick={cancelEditingLinks}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {!hasAnyLink && <EmptyState message="No links added yet — click Edit to add one." />}
            {PROFILE_FIELDS.filter((f) => savedValue(f.key)).map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <span className="text-[11.5px] font-bold text-muted">{f.label}</span>
                <a
                  href={savedValue(f.key)}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[13.5px] font-semibold text-primary hover:underline"
                >
                  {savedValue(f.key)}
                </a>
              </div>
            ))}
            {linksSaved && (
              <span className="flex items-center gap-1 text-[12.5px] font-semibold text-primary">
                <Icon name="check_circle" size={16} />
                Saved
              </span>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-[15px] font-bold text-ink">Projects</h2>
        <div className="flex flex-col gap-2">
          {profile.data?.projects.length === 0 && <EmptyState message="No projects added yet." />}
          {profile.data?.projects.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-2 border-t border-divider pt-2 first:border-0 first:pt-0">
              <div>
                <div className="text-[13.5px] font-bold text-ink">{p.title}</div>
                {p.description && <div className="text-[12px] text-muted">{p.description}</div>}
                {p.faculty && <div className="text-[11.5px] text-subtle">Mentor: {p.faculty.first_name} {p.faculty.last_name}</div>}
              </div>
              <button onClick={() => setRemoveTarget({ id: p.id, title: p.title })} className="text-subtle hover:text-primary">
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-divider pt-3">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Project title" />
          <Textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description (optional)" />
          <Button
            variant="primarySmall"
            className="self-start"
            disabled={!newTitle.trim() || addProject.isPending}
            onClick={() => {
              addProject.mutate({ title: newTitle, description: newDescription || undefined });
              setNewTitle("");
              setNewDescription("");
            }}
          >
            Add project
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove project"
        description={removeTarget ? `Remove "${removeTarget.title}" from your profile? This can't be undone.` : undefined}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) removeProject.mutate(removeTarget.id);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

export default function PlacementsPage() {
  const [tab, setTab] = useState<Tab>("upcoming");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Placements</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {tab === "upcoming"
              ? "Drives you're shortlisted for, plus other drives the placement cell has posted"
              : tab === "history"
                ? "Drives you have already been through this placement season"
                : "Links and projects shown to recruiters"}
          </p>
        </div>
        <SegmentedTabs
          options={[
            { key: "upcoming", label: "Upcoming drives" },
            { key: "history", label: "History" },
            { key: "profile", label: "My profile" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "upcoming" && <UpcomingTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "profile" && <ProfileTab />}
    </div>
  );
}
