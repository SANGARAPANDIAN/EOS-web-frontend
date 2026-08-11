"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Textarea, EmptyState, Icon } from "@/components/ui";
import {
  useUpcomingDrives,
  useDriveHistory,
  useMyPlacementProfile,
  useUpdatePlacementProfile,
  useAddStudentProject,
  useRemoveStudentProject,
} from "@/modules/student/api/placements";
import { formatDisplayDate } from "@/lib/utils/date";
import { APPLICATION_STATUS_LABEL } from "@/lib/config";

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

function UpcomingTab() {
  const drives = useUpcomingDrives();
  if (drives.isLoading) return <Card><EmptyState message="Loading…" /></Card>;
  if (!drives.data || drives.data.length === 0) return <Card><EmptyState message="No upcoming drives you're part of." /></Card>;
  return (
    <div className="flex flex-col gap-3">
      {drives.data.map((d) => (
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

  const [form, setForm] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  if (profile.isLoading) return <Card><EmptyState message="Loading…" /></Card>;

  function fieldValue(key: string) {
    return form[key] ?? profile.data?.profile?.[key as keyof typeof profile.data.profile] ?? "";
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <h2 className="mb-3 text-[15px] font-bold text-ink">Links</h2>
        <div className="flex flex-col gap-3">
          {PROFILE_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">{f.label}</label>
              <Input
                value={fieldValue(f.key)}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder="https://…"
              />
            </div>
          ))}
          <Button
            variant="primarySmall"
            className="self-start"
            disabled={updateProfile.isPending}
            onClick={() => updateProfile.mutate(form)}
          >
            {updateProfile.isPending ? "Saving…" : "Save links"}
          </Button>
        </div>
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
              <button onClick={() => removeProject.mutate(p.id)} className="text-subtle hover:text-primary">
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
              ? "Drives from the training and placement cell you're eligible for"
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
