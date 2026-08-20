"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Icon, Input, Modal, SearchBar, SegmentedTabs, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useTeams, useCreateTeam, useConfirmTeam, type TeamListItem } from "@/modules/sports-admin/api/teams";
import type { SportsTeamStatus } from "@/modules/sports-admin/api/types";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useDepartments } from "@/modules/shared/api/departments";
import { downloadCsv } from "@/lib/utils/csv";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<SportsTeamStatus, BadgeTone> = {
  pending: "neutral",
  confirmed: "accent",
};

const STATUS_PILLS: { key: "all" | SportsTeamStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending", label: "Pending" },
];

const YEAR_OPTIONS = ["I year", "II year", "III year", "IV year"];

/** No dedicated department/year columns on a squad (a squad spans students from many departments/years) — matched the same way the reference design's own generic filter row does: against the squad's composed name/coach/captain/category text. */
function mentions(t: TeamListItem, needle: string): boolean {
  const hay = [t.name, t.coach?.name, t.captain?.name, t.category, t.discipline?.name].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(needle.toLowerCase());
}

export default function TeamsPage() {
  const router = useRouter();
  const disciplines = useDisciplines();
  const departments = useDepartments();
  const createTeam = useCreateTeam();
  const confirmTeam = useConfirmTeam();

  const [q, setQ] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [pill, setPill] = useState<"all" | SportsTeamStatus>("all");

  const teams = useTeams({
    q: q || undefined,
    discipline_id: disciplineId ? Number(disciplineId) : undefined,
    status: pill !== "all" ? pill : undefined,
  });

  const loaded = useMemo(() => teams.data ?? [], [teams.data]);
  const rows = useMemo(
    () =>
      loaded.filter((t) => {
        if (department && !mentions(t, department)) return false;
        if (year && !mentions(t, year)) return false;
        return true;
      }),
    [loaded, department, year],
  );

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [newDisciplineId, setNewDisciplineId] = useState("");
  const [category, setCategory] = useState("");
  const [coachFaculty, setCoachFaculty] = useState<PickedPerson | null>(null);
  const [captainStudent, setCaptainStudent] = useState<PickedPerson | null>(null);
  const [viceCaptainStudent, setViceCaptainStudent] = useState<PickedPerson | null>(null);
  const [managerName, setManagerName] = useState("");
  const [practiceSchedule, setPracticeSchedule] = useState("");
  const [formedDate, setFormedDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setName("");
    setNewDisciplineId("");
    setCategory("");
    setCoachFaculty(null);
    setCaptainStudent(null);
    setViceCaptainStudent(null);
    setManagerName("");
    setPracticeSchedule("");
    setFormedDate("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createTeam.mutateAsync({
        name,
        discipline_id: newDisciplineId ? Number(newDisciplineId) : undefined,
        category: category || undefined,
        coach_faculty_id: coachFaculty ? coachFaculty.id : undefined,
        captain_student_id: captainStudent ? captainStudent.id : undefined,
        vice_captain_student_id: viceCaptainStudent ? viceCaptainStudent.id : undefined,
        manager_name: managerName || undefined,
        practice_schedule: practiceSchedule || undefined,
        formed_date: formedDate || undefined,
      });
      setShowModal(false);
      router.push(`/sports-admin/teams/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function handleExport() {
    downloadCsv(
      "sports-teams",
      [
        { header: "Squad", value: (t: TeamListItem) => t.name },
        { header: "Discipline", value: (t: TeamListItem) => t.discipline?.name ?? "" },
        { header: "Coach", value: (t: TeamListItem) => t.coach?.name ?? "" },
        { header: "Captain", value: (t: TeamListItem) => t.captain?.name ?? "" },
        { header: "Players", value: (t: TeamListItem) => t.size },
        { header: "Status", value: (t: TeamListItem) => t.status },
      ],
      rows,
    );
  }

  const columns: DataTableColumn<TeamListItem>[] = [
    { key: "name", header: "Squad", width: "1.3fr", render: (t) => <span className="font-bold text-ink">{t.name}</span> },
    {
      key: "detail",
      header: "Coach · captain",
      width: "1.6fr",
      render: (t) => (
        <span className="text-body">{[t.coach?.name, t.captain?.name].filter(Boolean).join(" · ")}</span>
      ),
    },
    {
      key: "players",
      header: "Players",
      width: "0.7fr",
      render: (t) => <span className="font-mono text-[12.5px] text-muted">{t.size}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "0.8fr",
      render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>,
    },
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
                confirmTeam.mutate(t.id);
              }}
              className="text-[12px] font-bold text-primary hover:text-primary-dark"
            >
              Confirm
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/sports-admin/teams/${t.id}`);
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
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Teams & squads</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {loaded.length > 0 ? `${loaded.length} squad${loaded.length === 1 ? "" : "s"} with named captains and coaches` : " "}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
            Export
          </Button>
          <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
            <Icon name="add" size={16} />
            Create squad
          </Button>
        </div>
      </div>

      <Card className="flex flex-col gap-3.5 p-4">
        <SearchBar
          className="max-w-none"
          placeholder="Search teams & squads by name, discipline, department or venue"
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
                <option key={d.id} value={d.name}>
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
            onChange={(key) => setPill(key as "all" | SportsTeamStatus)}
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
        onRowClick={(t) => router.push(`/sports-admin/teams/${t.id}`)}
        title="Teams & squads register"
        titleNote={`Showing ${rows.length} of ${loaded.length} loaded record${loaded.length === 1 ? "" : "s"}`}
        emptyMessage={
          teams.isLoading
            ? "Loading…"
            : loaded.length === 0
              ? "No squads yet. Use Create squad to register the first one."
              : "No squads match these filters."
        }
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create squad" subtitle="Registers a new team for this discipline">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Team name</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Men's Basketball" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Discipline</label>
              <Select value={newDisciplineId} onChange={(e) => setNewDisciplineId(e.target.value)}>
                <option value="">Not set</option>
                {disciplines.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Men's / Under-19" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Coach faculty</label>
              <PersonPicker type="faculty" value={coachFaculty} onChange={setCoachFaculty} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Captain student</label>
              <PersonPicker type="student" value={captainStudent} onChange={setCaptainStudent} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Vice captain student</label>
              <PersonPicker type="student" value={viceCaptainStudent} onChange={setViceCaptainStudent} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Manager name</label>
              <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="e.g. R. Kumar" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Practice schedule</label>
              <Input
                value={practiceSchedule}
                onChange={(e) => setPracticeSchedule(e.target.value)}
                placeholder="e.g. Mon/Wed/Fri 5–7pm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Formed date</label>
              <Input type="date" value={formedDate} onChange={(e) => setFormedDate(e.target.value)} />
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!name || createTeam.isPending}>
              {createTeam.isPending ? "Creating…" : "Create squad"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
