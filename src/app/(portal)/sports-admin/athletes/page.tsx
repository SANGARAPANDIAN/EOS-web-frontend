"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Icon, Modal, SearchBar, SegmentedTabs, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useAthletes, useCreateAthlete, type AthleteListItem, type AthleteStatus } from "@/modules/sports-admin/api/athletes";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useDepartments } from "@/modules/shared/api/departments";
import { downloadCsv } from "@/lib/utils/csv";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<AthleteStatus, BadgeTone> = {
  active: "accent",
  rest: "neutral",
  injured: "accentDark",
};

const STATUS_PILLS: { key: "all" | AthleteStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "injured", label: "Injured" },
  { key: "rest", label: "Rest" },
];

const YEAR_OPTIONS = ["I year", "II year", "III year", "IV year"];
const ATTENDANCE_OPTIONS = ["Above 85%", "70–85%", "Below 70%"];

function matchesYear(a: AthleteListItem, year: string): boolean {
  return (a.year_sem ?? "").toLowerCase().startsWith(year.toLowerCase());
}

function matchesAttendance(a: AthleteListItem, band: string): boolean {
  if (band === "Above 85%") return a.attendance_pct > 85;
  if (band === "Below 70%") return a.attendance_pct < 70;
  return a.attendance_pct >= 70 && a.attendance_pct <= 85;
}

export default function AthletesPage() {
  const router = useRouter();
  const disciplines = useDisciplines();
  const departments = useDepartments();
  const createAthlete = useCreateAthlete();

  const [q, setQ] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [attendance, setAttendance] = useState("");
  const [pill, setPill] = useState<"all" | AthleteStatus>("all");

  const athletes = useAthletes({
    q: q || undefined,
    discipline_id: disciplineId ? Number(disciplineId) : undefined,
    status: pill !== "all" ? pill : undefined,
  });

  const loaded = useMemo(() => athletes.data ?? [], [athletes.data]);
  const rows = useMemo(
    () =>
      loaded.filter((a) => {
        if (department && a.dept_code !== department) return false;
        if (year && !matchesYear(a, year)) return false;
        if (attendance && !matchesAttendance(a, attendance)) return false;
        return true;
      }),
    [loaded, department, year, attendance],
  );

  const [showModal, setShowModal] = useState(false);
  const [student, setStudent] = useState<PickedPerson | null>(null);
  const [newDisciplineId, setNewDisciplineId] = useState("");
  const [newStatus, setNewStatus] = useState<AthleteStatus>("active");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setStudent(null);
    setNewDisciplineId("");
    setNewStatus("active");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!student) return;
    try {
      const created = await createAthlete.mutateAsync({
        student_id: student.id,
        primary_discipline_id: newDisciplineId ? Number(newDisciplineId) : undefined,
        status: newStatus,
      });
      setShowModal(false);
      router.push(`/sports-admin/athletes/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function handleExport() {
    downloadCsv(
      "sports-athletes",
      [
        { header: "Athlete", value: (a: AthleteListItem) => a.name },
        { header: "Department", value: (a: AthleteListItem) => a.dept_code ?? "" },
        { header: "Year", value: (a: AthleteListItem) => a.year_sem ?? "" },
        { header: "Discipline", value: (a: AthleteListItem) => a.discipline?.name ?? "" },
        { header: "Attendance %", value: (a: AthleteListItem) => a.attendance_pct },
        { header: "Status", value: (a: AthleteListItem) => a.status },
      ],
      rows,
    );
  }

  const columns: DataTableColumn<AthleteListItem>[] = [
    { key: "name", header: "Athlete", width: "1.3fr", render: (a) => <span className="font-bold text-ink">{a.name}</span> },
    {
      key: "detail",
      header: "Department · discipline",
      width: "1.6fr",
      render: (a) => (
        <span className="text-body">
          {[a.dept_code, a.year_sem, a.discipline?.name].filter(Boolean).join(" · ")}
        </span>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      width: "0.9fr",
      render: (a) => <span className="font-mono text-[12.5px] text-muted">{a.attendance_pct}%</span>,
    },
    { key: "status", header: "Status", width: "0.8fr", render: (a) => <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge> },
    {
      key: "manage",
      header: "Manage",
      width: "0.6fr",
      align: "right",
      render: (a) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/sports-admin/athletes/${a.id}`);
          }}
          className="rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary"
        >
          Open
        </button>
      ),
    },
  ];

  const hasActiveFilters = q !== "" || disciplineId !== "" || department !== "" || year !== "" || attendance !== "" || pill !== "all";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Athletes</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {loaded.length > 0
              ? `${loaded.length} registered athlete${loaded.length === 1 ? "" : "s"} across ${disciplines.data?.length ?? 0} disciplines`
              : " "}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
            Export
          </Button>
          <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
            <Icon name="add" size={16} />
            Add athlete
          </Button>
        </div>
      </div>

      <Card className="flex flex-col gap-3.5 p-4">
        <SearchBar
          className="max-w-none"
          placeholder="Search athletes by name, discipline, department or venue"
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
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">Attendance</span>
            <Select className="w-auto" value={attendance} onChange={(e) => setAttendance(e.target.value)}>
              <option value="">Any</option>
              {ATTENDANCE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>

          <div className="h-6 w-px bg-border-default" />

          <SegmentedTabs
            options={STATUS_PILLS.map((p) => ({ key: p.key, label: p.label }))}
            value={pill}
            onChange={(key) => setPill(key as "all" | AthleteStatus)}
          />

          {hasActiveFilters && (
            <button
              onClick={() => {
                setQ("");
                setDisciplineId("");
                setDepartment("");
                setYear("");
                setAttendance("");
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
        rowKey={(a) => a.id}
        onRowClick={(a) => router.push(`/sports-admin/athletes/${a.id}`)}
        title="Athletes register"
        titleNote={`Showing ${rows.length} of ${loaded.length} loaded record${loaded.length === 1 ? "" : "s"}`}
        emptyMessage={
          athletes.isLoading
            ? "Loading…"
            : loaded.length === 0
              ? "No athletes yet. Use Add athlete to register the first one."
              : "No athletes match these filters."
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add athlete"
        subtitle="Added to the sports register for this academic year"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Student</label>
            <PersonPicker type="student" value={student} onChange={setStudent} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Primary discipline</label>
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
              <label className="text-[13px] font-bold text-primary">Status</label>
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as AthleteStatus)}>
                <option value="active">Active</option>
                <option value="injured">Injured</option>
                <option value="rest">Rest</option>
              </Select>
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!student || createAthlete.isPending}>
              {createAthlete.isPending ? "Registering…" : "Add athlete"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
