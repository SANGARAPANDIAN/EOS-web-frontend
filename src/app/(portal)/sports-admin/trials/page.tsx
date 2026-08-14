"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Icon, Input, Modal, SearchBar, SegmentedTabs, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useTrials, useCreateTrial, useSelectTrial, type TrialListItem, type TrialStatus } from "@/modules/sports-admin/api/trials";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useDepartments } from "@/modules/shared/api/departments";
import { useTeams } from "@/modules/sports-admin/api/teams";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { downloadCsv } from "@/lib/utils/csv";
import { formatDisplayDate } from "@/lib/utils/date";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<TrialStatus, BadgeTone> = {
  pending: "neutral",
  selected: "accent",
  hold: "accentDark",
};

const STATUS_PILLS: { key: "all" | TrialStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "selected", label: "Selected" },
  { key: "hold", label: "Hold" },
];

const YEAR_OPTIONS = ["I year", "II year", "III year", "IV year"];

function matchesYear(t: TrialListItem, year: string): boolean {
  return (t.year_sem ?? "").toLowerCase().startsWith(year.toLowerCase());
}

export default function TrialsPage() {
  const router = useRouter();
  const disciplines = useDisciplines();
  const departments = useDepartments();
  const teams = useTeams();
  const facilities = useFacilities();
  const createTrial = useCreateTrial();
  const selectTrial = useSelectTrial();

  const [q, setQ] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [pill, setPill] = useState<"all" | TrialStatus>("all");

  const trials = useTrials({
    q: q || undefined,
    discipline_id: disciplineId ? Number(disciplineId) : undefined,
    status: pill !== "all" ? pill : undefined,
  });

  const loaded = useMemo(() => trials.data ?? [], [trials.data]);
  const rows = useMemo(
    () =>
      loaded.filter((t) => {
        if (department && t.dept_code !== department) return false;
        if (year && !matchesYear(t, year)) return false;
        return true;
      }),
    [loaded, department, year],
  );

  const [showModal, setShowModal] = useState(false);
  const [student, setStudent] = useState<PickedPerson | null>(null);
  const [newDisciplineId, setNewDisciplineId] = useState("");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [roundLabel, setRoundLabel] = useState("");
  const [trialAt, setTrialAt] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [panel, setPanel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setStudent(null);
    setNewDisciplineId("");
    setTargetTeamId("");
    setRoundLabel("");
    setTrialAt("");
    setFacilityId("");
    setPanel("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!student) return;
    try {
      const created = await createTrial.mutateAsync({
        student_id: student.id,
        discipline_id: Number(newDisciplineId),
        target_team_id: targetTeamId ? Number(targetTeamId) : undefined,
        round_label: roundLabel || undefined,
        trial_at: trialAt,
        facility_id: facilityId ? Number(facilityId) : undefined,
        panel: panel || undefined,
      });
      setShowModal(false);
      router.push(`/sports-admin/trials/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function handleExport() {
    downloadCsv(
      "sports-trials",
      [
        { header: "Candidate", value: (t: TrialListItem) => t.student.name },
        { header: "Department", value: (t: TrialListItem) => t.dept_code ?? "" },
        { header: "Year", value: (t: TrialListItem) => t.year_sem ?? "" },
        { header: "Discipline", value: (t: TrialListItem) => t.discipline.name },
        { header: "Round", value: (t: TrialListItem) => t.round_label ?? "" },
        { header: "Trial date", value: (t: TrialListItem) => formatDisplayDate(t.trial_at) },
        { header: "Status", value: (t: TrialListItem) => t.status },
      ],
      rows,
    );
  }

  const columns: DataTableColumn<TrialListItem>[] = [
    { key: "candidate", header: "Candidate", width: "1.3fr", render: (t) => <span className="font-bold text-ink">{t.student.name}</span> },
    {
      key: "detail",
      header: "Discipline · round",
      width: "1.4fr",
      render: (t) => (
        <span className="text-body">{[t.discipline?.name, t.round_label].filter(Boolean).join(" · ")}</span>
      ),
    },
    {
      key: "trial_at",
      header: "Trial date",
      width: "1fr",
      render: (t) => <span className="text-body">{formatDisplayDate(t.trial_at)}</span>,
    },
    { key: "status", header: "Status", width: "0.8fr", render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
    {
      key: "manage",
      header: "Manage",
      width: "1fr",
      align: "right",
      render: (t) => (
        <div className="flex items-center justify-end gap-3.5">
          {t.status === "pending" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectTrial.mutate({ id: t.id });
              }}
              className="text-[12px] font-bold text-primary hover:text-primary-dark"
            >
              Select
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/sports-admin/trials/${t.id}`);
            }}
            className="rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary"
          >
            Open
          </button>
        </div>
      ),
    },
  ];

  const hasActiveFilters = q !== "" || disciplineId !== "" || department !== "" || year !== "" || pill !== "all";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Trials & selection</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {loaded.length > 0 ? `${loaded.length} trial${loaded.length === 1 ? "" : "s"} scheduled` : " "}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
            Export
          </Button>
          <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
            <Icon name="add" size={16} />
            Schedule trial
          </Button>
        </div>
      </div>

      <Card className="flex flex-col gap-3.5 p-4">
        <SearchBar
          className="max-w-none"
          placeholder="Search candidates by name, discipline or department"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">Sport</span>
            <Select className="w-auto" value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
              <option value="">All</option>
              {disciplines.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">Department</span>
            <Select className="w-auto" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">Year</span>
            <Select className="w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          <div className="h-6 w-px bg-border-default" />

          <SegmentedTabs
            options={STATUS_PILLS.map((p) => ({ key: p.key, label: p.label }))}
            value={pill}
            onChange={(key) => setPill(key as "all" | TrialStatus)}
          />

          {hasActiveFilters && (
            <button
              onClick={() => {
                setQ("");
                setDisciplineId("");
                setDepartment("");
                setYear("");
                setPill("all");
              }}
              className="ml-auto text-[12.5px] font-bold text-primary hover:text-primary-dark"
            >
              Reset filters
            </button>
          )}
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(t) => t.id}
        onRowClick={(t) => router.push(`/sports-admin/trials/${t.id}`)}
        title="Trials register"
        titleNote={`Showing ${rows.length} of ${loaded.length} loaded record${loaded.length === 1 ? "" : "s"}`}
        emptyMessage={
          trials.isLoading
            ? "Loading…"
            : loaded.length === 0
              ? "No trials yet. Use Schedule trial to book the first one."
              : "No trials match these filters."
        }
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Schedule trial" subtitle="Books a selection trial for a candidate">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Student</label>
            <PersonPicker type="student" value={student} onChange={setStudent} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Discipline</label>
              <Select required value={newDisciplineId} onChange={(e) => setNewDisciplineId(e.target.value)}>
                <option value="">Select discipline</option>
                {disciplines.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Target squad</label>
              <Select value={targetTeamId} onChange={(e) => setTargetTeamId(e.target.value)}>
                <option value="">Not set</option>
                {teams.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Round</label>
              <Input value={roundLabel} onChange={(e) => setRoundLabel(e.target.value)} placeholder="e.g. Trial 1 of 2" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Trial date & time</label>
              <Input required type="datetime-local" value={trialAt} onChange={(e) => setTrialAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Facility</label>
              <Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                <option value="">Not set</option>
                {facilities.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Panel</label>
              <Input value={panel} onChange={(e) => setPanel(e.target.value)} placeholder="e.g. Mr. X, Mr. Y" />
            </div>
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primarySmall"
              className="px-6"
              disabled={!student || !newDisciplineId || !trialAt || createTrial.isPending}
            >
              {createTrial.isPending ? "Scheduling…" : "Schedule trial"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
