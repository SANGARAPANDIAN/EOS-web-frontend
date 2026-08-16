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
  type CreateOdTeamInput,
  type OdRequestRow,
  type OdTeam,
} from "@/modules/student/api/od";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "apply" | "history";
type Mode = "create" | "join";

const OVERALL_STATUS_LABEL: Record<string, string> = {
  pending_mentor: "Awaiting mentor",
  pending_hod: "Awaiting HOD",
  approved: "Approved",
  rejected: "Rejected",
};

const DECLARATION_TEXT =
  "I declare that the details above are true, that I will attend the event as stated, and that I will upload the event photographs within 7 days of completion. I understand attendance is not credited otherwise.";

const EMPTY_CREATE_FORM: CreateOdTeamInput = {
  team_name: "",
  reason: "",
  venue: "",
  from_date: "",
  to_date: "",
  from_time: "",
  to_time: "",
  faculty_guide_id: 0,
};

function ModeCard({ mode, active, onSelect, icon, title, subtitle }: { mode: Mode; active: boolean; onSelect: () => void; icon: string; title: string; subtitle: string }) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3.5 rounded-card border p-4 text-left transition-colors ${
        active ? "border-border-accent bg-accent-50" : "border-border-default bg-surface hover:bg-nav-hover"
      }`}
      data-mode={mode}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${active ? "bg-primary" : "bg-icon-chip"}`}>
        <Icon name={icon} size={19} className={active ? "text-white" : "text-subtle"} />
      </span>
      <div>
        <div className="text-[14.5px] font-bold text-ink">{title}</div>
        <div className="mt-0.5 text-[12.5px] text-muted">{subtitle}</div>
      </div>
    </button>
  );
}

function CreateOrJoinTeam() {
  const [mode, setMode] = useState<Mode>("create");
  const [form, setForm] = useState<CreateOdTeamInput>(EMPTY_CREATE_FORM);
  const [declared, setDeclared] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const facultyDirectory = useFacultyDirectory();
  const createTeam = useCreateOdTeam();
  const joinTeam = useJoinOdTeam();

  const canCreate =
    form.team_name.trim() &&
    form.reason.trim() &&
    form.venue.trim() &&
    form.from_date &&
    form.to_date &&
    form.from_time &&
    form.to_time &&
    form.faculty_guide_id > 0 &&
    declared;

  async function handleCreate() {
    setError(null);
    try {
      await createTeam.mutateAsync(form);
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
        <ModeCard mode="create" active={mode === "create"} onSelect={() => setMode("create")} icon="group_add" title="Create team" subtitle="You are the team lead" />
        <ModeCard mode="join" active={mode === "join"} onSelect={() => setMode("join")} icon="mail" title="Join team" subtitle="You have a team code" />
      </div>

      {error && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
      )}

      {mode === "create" ? (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold text-muted">Team name</label>
            <Input value={form.team_name} onChange={(e) => setForm((f) => ({ ...f, team_name: e.target.value }))} placeholder="e.g. Team Nexus" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold text-muted">Event or activity</label>
            <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. IEEE paper presentation" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Start date</label>
              <Input type="date" value={form.from_date} onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">End date</label>
              <Input type="date" min={form.from_date || undefined} value={form.to_date} onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Start time</label>
              <Input type="time" value={form.from_time} onChange={(e) => setForm((f) => ({ ...f, from_time: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">End time</label>
              <Input type="time" value={form.to_time} onChange={(e) => setForm((f) => ({ ...f, to_time: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Venue</label>
              <Input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Institution or location" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Faculty mentor</label>
              <Select
                value={form.faculty_guide_id || ""}
                onChange={(e) => setForm((f) => ({ ...f, faculty_guide_id: e.target.value ? Number(e.target.value) : 0 }))}
              >
                <option value="">e.g. Dr. Kavitha R</option>
                {facultyDirectory.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} · {f.department_name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-[11px] border border-border-default bg-surface-muted p-3.5">
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              className="mt-0.5 size-[17px] shrink-0 accent-primary"
            />
            <span className="text-[12.5px] leading-[1.5] text-body">{DECLARATION_TEXT}</span>
          </label>

          <Button onClick={handleCreate} disabled={!canCreate || createTeam.isPending}>
            {createTeam.isPending ? "Creating…" : "Create team & generate code"}
          </Button>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <label className="text-[11.5px] font-bold text-muted">Team code</label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="6-CHARACTER CODE"
              maxLength={20}
              className="text-center font-mono text-lg uppercase tracking-[.2em]"
            />
            <p className="text-[12px] text-subtle">Ask your team lead for the code generated when the team was created. Event details are filled in automatically.</p>
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
  const submitRequest = useSubmitOdRequest();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    try {
      await submitRequest.mutateAsync({
        teamId: team.id,
        input: {
          from_date: team.from_date!,
          to_date: team.to_date!,
          reason: team.reason!,
          from_time: team.from_time ?? undefined,
          to_time: team.to_time ?? undefined,
          faculty_guide_id: team.faculty_guide_id ?? undefined,
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

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-divider pt-4 text-[13px]">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle">EVENT</div>
            <div className="mt-0.5 font-bold text-ink">{team.team_name}</div>
            <div className="text-muted">{team.reason}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle">WHEN</div>
            <div className="mt-0.5 text-ink">
              {team.from_date && formatDisplayDate(team.from_date)} – {team.to_date && formatDisplayDate(team.to_date)}
            </div>
            <div className="text-muted">
              {team.from_time} – {team.to_time}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle">VENUE</div>
            <div className="mt-0.5 text-ink">{team.venue}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle">FACULTY MENTOR</div>
            <div className="mt-0.5 text-ink">{team.faculty_guide_name ?? "—"}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-divider pt-4">
          {team.members.map((m) => (
            <div key={m.student_id} className="flex items-center justify-between text-[13px]">
              <span className="text-ink">{m.name}</span>
              {m.is_creator && <span className="text-[11px] text-subtle">Creator</span>}
            </div>
          ))}
        </div>
      </Card>

      {team.is_creator ? (
        <Card>
          {error && (
            <div className="mb-3 rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">{error}</div>
          )}
          {success ? (
            <Banner>OD request submitted — your team is now locked.</Banner>
          ) : (
            <>
              <p className="mb-3 text-[13px] text-body">
                Once everyone who&apos;s attending has joined with the team code above, submit the request to lock the team and send it for mentor and HOD
                approval.
              </p>
              <Button onClick={handleSubmit} disabled={submitRequest.isPending}>
                {submitRequest.isPending ? "Submitting…" : "Submit OD request"}
              </Button>
            </>
          )}
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">On duty</h1>
          <p className="mt-1 text-[13.5px] text-muted">Create a team for an event, or join one with the team code</p>
        </div>
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
