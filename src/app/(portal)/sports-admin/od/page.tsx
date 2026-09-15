"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Icon, Input, Select, Textarea, Banner, EmptyState, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { useAthletes, type AthleteListItem } from "@/modules/sports-admin/api/athletes";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import {
  useOdRequests,
  useCreateOdRequest,
  useOdRequestApprovals,
  type OdRequest,
} from "@/modules/sports-admin/api/od";
import { useIssueOdLetterNumbers } from "@/modules/sports-admin/api/odLetters";
import { generateOdLettersPdf } from "@/modules/sports-admin/lib/od-letter-pdf";
import type { ApprovalStatus } from "@/modules/sports-admin/api/types";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "apply" | "history" | "letter";

const STATUS_TONE: Record<ApprovalStatus, BadgeTone> = {
  pending: "neutral",
  approved: "accent",
  rejected: "accentDark",
};

const OD_TYPES = [
  "Inter-collegiate tournament",
  "Zonal or university meet",
  "State or national championship",
  "Selection trial or camp",
  "Sports day duty",
];
const PERIODS = ["All periods", "Forenoon periods", "Afternoon periods", "First two periods", "Last two periods"];
const LEVELS = ["Inter-collegiate", "Zonal", "University", "State", "National"];
const TRANSPORT_OPTIONS = ["College bus", "Own arrangement", "Host institution", "Not required"];

function athleteToPerson(a: AthleteListItem): PickedPerson {
  return { id: a.student_id, name: a.name, meta: [a.dept_code, a.year_sem, a.discipline?.name].filter(Boolean).join(" · ") };
}

export default function OdPage() {
  const [tab, setTab] = useState<Tab>("apply");
  const odRequests = useOdRequests();
  const athletes = useAthletes();
  const disciplines = useDisciplines();
  const createOdRequest = useCreateOdRequest();
  const issueLetterNumbers = useIssueOdLetterNumbers();
  // Which request's department breakdown is expanded.
  const [approvalsFor, setApprovalsFor] = useState<number | null>(null);
  const approvals = useOdRequestApprovals(approvalsFor);

  const [odType, setOdType] = useState(OD_TYPES[0]);
  const [periodsAffected, setPeriodsAffected] = useState(PERIODS[0]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [event, setEvent] = useState("");
  const [venue, setVenue] = useState("");
  const [level, setLevel] = useState(LEVELS[0]);
  const [coachFaculty, setCoachFaculty] = useState<PickedPerson | null>(null);
  const [transport, setTransport] = useState(TRANSPORT_OPTIONS[0]);
  const [remarks, setRemarks] = useState("");
  const [squad, setSquad] = useState<PickedPerson[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [letterEvent, setLetterEvent] = useState("");
  const [letterOrganizingInstitution, setLetterOrganizingInstitution] = useState("");
  const [letterEventFromDate, setLetterEventFromDate] = useState("");
  const [letterEventToDate, setLetterEventToDate] = useState("");
  const [letterOdFromDate, setLetterOdFromDate] = useState("");
  const [letterOdToDate, setLetterOdToDate] = useState("");
  const [letterLevel, setLetterLevel] = useState(LEVELS[0]);
  const [letterTeamCategory, setLetterTeamCategory] = useState("");
  const [letterSquad, setLetterSquad] = useState<PickedPerson[]>([]);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [letterGenerating, setLetterGenerating] = useState(false);

  const roster = useMemo(() => athletes.data ?? [], [athletes.data]);
  const rosterById = useMemo(() => {
    const map = new Map<number, AthleteListItem>();
    for (const a of roster) map.set(a.student_id, a);
    return map;
  }, [roster]);
  const deptByStudentId = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of roster) if (a.dept_code) map.set(a.student_id, a.dept_code);
    return map;
  }, [roster]);

  const squadDepts = useMemo(() => {
    const depts = new Set<string>();
    for (const p of squad) {
      const d = deptByStudentId.get(p.id);
      if (d) depts.add(d);
    }
    return [...depts];
  }, [squad, deptByStudentId]);

  function toggleAthleteIn(setter: React.Dispatch<React.SetStateAction<PickedPerson[]>>, a: AthleteListItem) {
    setter((prev) =>
      prev.some((p) => p.id === a.student_id) ? prev.filter((p) => p.id !== a.student_id) : [...prev, athleteToPerson(a)],
    );
  }

  function addDisciplineIn(setter: React.Dispatch<React.SetStateAction<PickedPerson[]>>, disciplineId: number) {
    const members = roster.filter((a) => a.discipline?.id === disciplineId).map(athleteToPerson);
    setter((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      return [...prev, ...members.filter((m) => !existing.has(m.id))];
    });
  }

  function toggleAthlete(a: AthleteListItem) {
    toggleAthleteIn(setSquad, a);
  }

  function addDiscipline(disciplineId: number) {
    addDisciplineIn(setSquad, disciplineId);
  }

  async function handleGenerateLetters(e: React.FormEvent) {
    e.preventDefault();
    setLetterError(null);
    if (letterSquad.length === 0) {
      setLetterError("Add at least one athlete to generate letters for.");
      return;
    }
    setLetterGenerating(true);
    try {
      const studentIds = letterSquad.map((p) => p.id);
      const issued = await issueLetterNumbers.mutateAsync(studentIds);
      const issuedByStudentId = new Map(issued.map((i) => [i.student_id, i]));
      const letterStudents = letterSquad
        .map((p) => {
          const athlete = rosterById.get(p.id);
          const number = issuedByStudentId.get(p.id);
          if (!athlete || !number) return null;
          return {
            student_id: p.id,
            name: athlete.name,
            dept_name: athlete.dept_name,
            discipline_name: athlete.discipline?.name ?? null,
            letter_number: number.letter_number,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      await generateOdLettersPdf(letterStudents, {
        event: letterEvent,
        organizing_institution: letterOrganizingInstitution,
        event_from_date: letterEventFromDate,
        event_to_date: letterEventToDate,
        od_from_date: letterOdFromDate,
        od_to_date: letterOdToDate,
        level: letterLevel,
        team_category: letterTeamCategory || undefined,
      });
    } catch (err) {
      setLetterError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLetterGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createOdRequest.mutateAsync({
        od_type: odType,
        periods_affected: periodsAffected || undefined,
        from_date: fromDate,
        to_date: toDate,
        event,
        venue: venue || undefined,
        level: level || undefined,
        accompanying_coach_faculty_id: coachFaculty?.id,
        transport: transport || undefined,
        remarks: remarks || undefined,
        student_ids: squad.map((p) => p.id),
      });
      setSuccess(true);
      setOdType(OD_TYPES[0]);
      setPeriodsAffected(PERIODS[0]);
      setFromDate("");
      setToDate("");
      setEvent("");
      setVenue("");
      setLevel(LEVELS[0]);
      setCoachFaculty(null);
      setTransport(TRANSPORT_OPTIONS[0]);
      setRemarks("");
      setSquad([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<OdRequest>[] = [
    { key: "event", header: "Event", width: "1.3fr", render: (r) => <span className="font-bold text-ink">{r.event}</span> },
    {
      key: "period",
      header: "From – to",
      width: "1.3fr",
      render: (r) => (
        <span className="text-body">
          {formatDisplayDate(r.from_date)} – {formatDisplayDate(r.to_date)}
        </span>
      ),
    },
    { key: "venue", header: "Venue", width: "1fr", render: (r) => <span className="text-body">{r.venue ?? "—"}</span> },
    {
      key: "squad_size",
      header: "Squad",
      width: "0.7fr",
      render: (r) => <span className="font-mono text-[12.5px] text-muted">{r.squad_size}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "1.3fr",
      align: "right",
      // No approve/reject here: a sports OD releases students from class, so
      // the HoD of each department in the squad decides it. Sports raises the
      // request and watches its progress.
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "pending" ? (
            <Badge tone="neutral">Awaiting HoD</Badge>
          ) : (
            <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
          )}
          <button
            onClick={() => setApprovalsFor((cur) => (cur === r.id ? null : r.id))}
            className="rounded-[8px] border border-border-default px-2.5 py-1.5 text-[11.5px] font-bold text-muted hover:text-primary"
          >
            {approvalsFor === r.id ? "Hide HoDs" : "HoD approvals"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Athlete on-duty</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Raise a single on-duty request to the principal for a squad drawn from several departments
          </p>
        </div>
        <SegmentedTabs
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
            { key: "letter", label: "OD Letter" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "letter" ? (
        <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
          <Card className="p-[22px_24px]">
            <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-ink">Event details</h2>
            <p className="mt-1 text-[12.5px] text-muted">
              One on-duty letter per selected athlete, addressed to their own department head
            </p>
            <form onSubmit={handleGenerateLetters} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Event / purpose</label>
                <Input
                  required
                  value={letterEvent}
                  onChange={(e) => setLetterEvent(e.target.value)}
                  placeholder="e.g. AUSB Zone Cricket tournament"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Organizing / host institution</label>
                <Input
                  required
                  value={letterOrganizingInstitution}
                  onChange={(e) => setLetterOrganizingInstitution(e.target.value)}
                  placeholder="e.g. Sri Krishna College of Engineering, Coimbatore"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Event from date</label>
                  <Input type="date" required value={letterEventFromDate} onChange={(e) => setLetterEventFromDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Event to date</label>
                  <Input
                    type="date"
                    required
                    value={letterEventToDate}
                    min={letterEventFromDate || undefined}
                    onChange={(e) => setLetterEventToDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">On-duty from date</label>
                  <Input type="date" required value={letterOdFromDate} onChange={(e) => setLetterOdFromDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">On-duty to date</label>
                  <Input
                    type="date"
                    required
                    value={letterOdToDate}
                    min={letterOdFromDate || undefined}
                    onChange={(e) => setLetterOdToDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Level</label>
                  <Select value={letterLevel} onChange={(e) => setLetterLevel(e.target.value)}>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Team category (optional)</label>
                  <Input
                    value={letterTeamCategory}
                    onChange={(e) => setLetterTeamCategory(e.target.value)}
                    placeholder="e.g. (Men) or (Women)"
                  />
                </div>
              </div>

              {letterError && (
                <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                  {letterError}
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  !letterEvent ||
                  !letterOrganizingInstitution ||
                  !letterEventFromDate ||
                  !letterEventToDate ||
                  !letterOdFromDate ||
                  !letterOdToDate ||
                  letterSquad.length === 0 ||
                  letterGenerating
                }
              >
                {letterGenerating
                  ? "Generating…"
                  : `Download OD letter${letterSquad.length === 1 ? "" : "s"} (${letterSquad.length})`}
              </Button>
            </form>
          </Card>

          <Card className="p-[22px_24px]">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-ink">Athletes</h2>
              <span className="shrink-0 text-[13px] font-bold text-primary">{letterSquad.length} selected</span>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              {letterSquad.length > 0 ? `${letterSquad.length} athlete${letterSquad.length === 1 ? "" : "s"} selected` : "No athletes selected yet"}
            </p>

            <div className="mt-4">
              <span className="text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Filter by game</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {disciplines.data?.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => addDisciplineIn(setLetterSquad, d.id)}
                    className="rounded-pill border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary hover:bg-primary hover:text-white"
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex max-h-[480px] flex-col overflow-y-auto border-t border-divider">
              {athletes.isLoading ? (
                <EmptyState message="Loading…" />
              ) : roster.length === 0 ? (
                <EmptyState message="No athletes registered yet." />
              ) : (
                roster.map((a) => {
                  const checked = letterSquad.some((p) => p.id === a.student_id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAthleteIn(setLetterSquad, a)}
                      className="hover-lift flex items-center gap-3 border-b border-divider px-1 py-2.5 text-left last:border-0"
                    >
                      <span
                        className={
                          checked
                            ? "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] bg-primary"
                            : "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border-default"
                        }
                      >
                        {checked && <Icon name="check" size={13} className="text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-ink">{a.name}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {[a.dept_code, a.year_sem, a.discipline?.name].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {a.dept_code && (
                        <span className="shrink-0 whitespace-nowrap rounded-[7px] bg-primary px-2.5 py-1 text-[11px] font-extrabold text-white">
                          {a.dept_code}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setLetterSquad(roster.map(athleteToPerson))}
                className="text-[12.5px] font-bold text-primary hover:text-primary-dark"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setLetterSquad([])}
                className="text-[12.5px] font-bold text-muted hover:text-ink"
              >
                Clear
              </button>
            </div>
          </Card>
        </div>
      ) : tab === "apply" ? (
        <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
          <Card className="p-[22px_24px]">
            <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-ink">Request details</h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">OD type</label>
                  <Select required value={odType} onChange={(e) => setOdType(e.target.value)}>
                    {OD_TYPES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Periods affected</label>
                  <Select value={periodsAffected} onChange={(e) => setPeriodsAffected(e.target.value)}>
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">From date</label>
                  <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">To date</label>
                  <Input type="date" required value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Event / purpose</label>
                <Input required value={event} onChange={(e) => setEvent(e.target.value)} placeholder="e.g. Anna University zonal kabaddi league" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Venue / host institution</label>
                <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. PSG College of Technology, Coimbatore" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Level</label>
                  <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold text-muted">Accompanying coach</label>
                  <PersonPicker type="faculty" value={coachFaculty} onChange={setCoachFaculty} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Transport</label>
                <Select value={transport} onChange={(e) => setTransport(e.target.value)}>
                  {TRANSPORT_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Class adjustment and remarks</label>
                <Textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Mention how classes and attendance will be adjusted for each department"
                />
              </div>

              {error && (
                <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                  {error}
                </div>
              )}
              {success && <Banner>Your OD request has been submitted.</Banner>}

              <Button
                type="submit"
                disabled={!odType || !fromDate || !toDate || !event || squad.length === 0 || createOdRequest.isPending}
              >
                {createOdRequest.isPending ? "Submitting…" : "Submit OD request to principal"}
              </Button>
            </form>
          </Card>

          <Card className="p-[22px_24px]">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-ink">Athletes on this OD</h2>
              <span className="shrink-0 text-[13px] font-bold text-primary">{squad.length} selected</span>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              {squad.length > 0
                ? `${squad.length} athlete${squad.length === 1 ? "" : "s"} across ${squadDepts.length} department${squadDepts.length === 1 ? "" : "s"} · ${squadDepts.join(", ")}`
                : "No athletes added yet"}
            </p>

            <div className="mt-4">
              <span className="text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Add squad</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {disciplines.data?.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => addDiscipline(d.id)}
                    className="rounded-pill border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary hover:bg-primary hover:text-white"
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex max-h-[480px] flex-col overflow-y-auto border-t border-divider">
              {athletes.isLoading ? (
                <EmptyState message="Loading…" />
              ) : roster.length === 0 ? (
                <EmptyState message="No athletes registered yet." />
              ) : (
                roster.map((a) => {
                  const checked = squad.some((p) => p.id === a.student_id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAthlete(a)}
                      className="hover-lift flex items-center gap-3 border-b border-divider px-1 py-2.5 text-left last:border-0"
                    >
                      <span
                        className={
                          checked
                            ? "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] bg-primary"
                            : "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border-default"
                        }
                      >
                        {checked && <Icon name="check" size={13} className="text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-ink">{a.name}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {[a.dept_code, a.year_sem, a.discipline?.name].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {a.dept_code && (
                        <span className="shrink-0 whitespace-nowrap rounded-[7px] bg-primary px-2.5 py-1 text-[11px] font-extrabold text-white">
                          {a.dept_code}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSquad(roster.map(athleteToPerson))}
                className="text-[12.5px] font-bold text-primary hover:text-primary-dark"
              >
                Select all
              </button>
              <button type="button" onClick={() => setSquad([])} className="text-[12.5px] font-bold text-muted hover:text-ink">
                Clear
              </button>
            </div>
          </Card>
        </div>
      ) : odRequests.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <DataTable
            columns={columns}
            data={odRequests.data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No OD requests yet."
          />

          {approvalsFor != null && (
            <Card>
              <h2 className="mb-1 text-[17px] font-extrabold text-ink">Department approvals</h2>
              <p className="mb-3 text-[12.5px] text-muted">
                Every department with a student in this squad has to release them. The request is approved only once all
                of them agree, and a single rejection rejects it.
              </p>
              {approvals.isLoading ? (
                <EmptyState message="Loading…" />
              ) : (approvals.data ?? []).length === 0 ? (
                <EmptyState message="No department approvals recorded for this request." />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {(approvals.data ?? []).map((d) => (
                    <div
                      key={d.department_id}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-border-default px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-bold text-ink">
                          {d.department_name ?? "Unassigned department"}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-muted">
                          {d.student_count} student{d.student_count === 1 ? "" : "s"} in the squad
                          {d.remarks ? " · " + d.remarks : ""}
                        </div>
                      </div>
                      <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}