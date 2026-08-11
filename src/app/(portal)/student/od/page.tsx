"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Select, Banner, DataTable, EmptyState, Icon } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useMyOdTeams,
  useCreateOdTeam,
  useJoinOdTeam,
  useSubmitOdRequest,
  useMyOdRequests,
  useFacultyDirectory,
  type OdRequestRow,
  type OdTeam,
} from "@/modules/student/api/od";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "apply" | "history";
type Mode = "create" | "join" | null;

const OVERALL_STATUS_LABEL: Record<string, string> = {
  pending_mentor: "Awaiting mentor",
  pending_hod: "Awaiting HOD",
  approved: "Approved",
  rejected: "Rejected",
};

function CreateOrJoinTeam() {
  const [mode, setMode] = useState<Mode>(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createTeam = useCreateOdTeam();
  const joinTeam = useJoinOdTeam();

  async function handleCreate() {
    setError(null);
    try {
      await createTeam.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await joinTeam.mutateAsync(joinCode.trim().toUpperCase());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setMode("create")}
          className={`rounded-card border p-5 text-left transition-colors ${
            mode === "create" ? "border-primary bg-accent-50" : "border-border-default bg-surface hover:bg-nav-hover"
          }`}
        >
          <Icon name="group_add" size={22} className="text-primary" />
          <div className="mt-2 text-[15px] font-bold text-ink">Create team</div>
          <div className="mt-0.5 text-[12.5px] text-muted">Start a new OD team and share the code with teammates.</div>
        </button>
        <button
          onClick={() => setMode("join")}
          className={`rounded-card border p-5 text-left transition-colors ${
            mode === "join" ? "border-primary bg-accent-50" : "border-border-default bg-surface hover:bg-nav-hover"
          }`}
        >
          <Icon name="group" size={22} className="text-primary" />
          <div className="mt-2 text-[15px] font-bold text-ink">Join team</div>
          <div className="mt-0.5 text-[12.5px] text-muted">Enter a code shared by your team&apos;s creator.</div>
        </button>
      </div>

      {error && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {error}
        </div>
      )}

      {mode === "create" && (
        <Card className="max-w-[480px]">
          <p className="mb-3 text-[13px] text-body">
            You&apos;ll be the team creator, responsible for adding the event details and submitting the OD request once
            everyone has joined.
          </p>
          <Button onClick={handleCreate} disabled={createTeam.isPending}>
            {createTeam.isPending ? "Creating…" : "Create team & generate code"}
          </Button>
        </Card>
      )}

      {mode === "join" && (
        <Card className="max-w-[480px]">
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="TEAM CODE"
              maxLength={20}
              className="text-center font-mono text-lg uppercase tracking-[.2em]"
            />
            <Button type="submit" disabled={!joinCode.trim() || joinTeam.isPending}>
              {joinTeam.isPending ? "Joining…" : "Join team"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function ActiveTeamCard({ team }: { team: OdTeam }) {
  const facultyDirectory = useFacultyDirectory();
  const submitRequest = useSubmitOdRequest();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [facultyGuideId, setFacultyGuideId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await submitRequest.mutateAsync({
        teamId: team.id,
        input: {
          from_date: fromDate,
          to_date: toDate,
          reason,
          faculty_guide_id: facultyGuideId === "" ? undefined : facultyGuideId,
        },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-bold text-muted">TEAM CODE</div>
            <div className="font-mono text-xl font-extrabold tracking-[.15em] text-ink">{team.unique_code}</div>
          </div>
          <Badge tone={team.is_creator ? "accent" : "accentDark"}>{team.is_creator ? "You created this team" : "Member"}</Badge>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          {team.members.map((m) => (
            <div key={m.student_id} className="flex items-center justify-between text-[13px]">
              <span className="text-ink">{m.name}</span>
              {m.is_creator && <span className="text-[11px] text-subtle">Creator</span>}
            </div>
          ))}
        </div>
      </Card>

      {team.is_creator ? (
        <Card className="max-w-[560px]">
          <h2 className="mb-3 text-[15px] font-bold text-ink">Submit OD request</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Event / reason</label>
              <Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Hackathon at XYZ College" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">From date</label>
                <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">To date</label>
                <Input type="date" required value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Faculty mentor (optional)</label>
              <Select value={facultyGuideId} onChange={(e) => setFacultyGuideId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select faculty</option>
                {facultyDirectory.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} · {f.department_name}
                  </option>
                ))}
              </Select>
            </div>

            {error && (
              <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                {error}
              </div>
            )}
            {success && <Banner>OD request submitted — your team is now locked.</Banner>}

            <Button type="submit" disabled={!fromDate || !toDate || !reason || submitRequest.isPending}>
              {submitRequest.isPending ? "Submitting…" : "Submit OD request"}
            </Button>
          </form>
        </Card>
      ) : (
        <Banner>Waiting for {team.members.find((m) => m.is_creator)?.name ?? "the team creator"} to submit the OD request.</Banner>
      )}
    </div>
  );
}

export default function OdPage() {
  const [tab, setTab] = useState<Tab>("apply");
  const teams = useMyOdTeams();
  const requests = useMyOdRequests();
  const activeTeam = teams.data?.data.find((t) => !t.is_locked) ?? null;

  const columns: DataTableColumn<OdRequestRow>[] = [
    { key: "event", header: "Event", width: "2fr", render: (r) => r.reason },
    { key: "team", header: "Team", width: "1fr", render: (r) => <span className="font-mono text-[12px]">{r.unique_code}</span> },
    {
      key: "period",
      header: "Period",
      width: "1.5fr",
      render: (r) => `${formatDisplayDate(r.from_date)} – ${formatDisplayDate(r.to_date)}`,
    },
    { key: "mentor", header: "Mentor", width: "1.3fr", render: (r) => r.faculty_guide_name ?? "—" },
    {
      key: "status",
      header: "Status",
      width: "1.3fr",
      render: (r) => (
        <Badge tone={r.overall_status === "rejected" ? "accentDark" : "accent"}>
          {OVERALL_STATUS_LABEL[r.overall_status] ?? r.overall_status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">On duty</h1>
        <SegmentedTabs
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "apply" ? (
        teams.isLoading ? (
          <Card>
            <EmptyState message="Loading…" />
          </Card>
        ) : activeTeam ? (
          <ActiveTeamCard team={activeTeam} />
        ) : (
          <CreateOrJoinTeam />
        )
      ) : requests.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <DataTable columns={columns} data={requests.data?.data ?? []} rowKey={(r) => r.id} emptyMessage="No OD requests yet." />
      )}
    </div>
  );
}
