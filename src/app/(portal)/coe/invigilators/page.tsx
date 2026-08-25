"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExams } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useFacultyDirectory } from "@/modules/coe/api/faculty";
import {
  useInvigilationDuties,
  useInvigilationStats,
  useUnfilledSlots,
  useUpdateInvigilationDuty,
  useAcknowledgeInvigilationDuty,
  useRemindInvigilationDuty,
  useDeleteInvigilationDuty,
  useAutoAssignInvigilation,
  useCreateInvigilationDuty,
  type InvigilationDuty,
  type VenueOverviewCard,
} from "@/modules/coe/api/invigilation";

type TabKey = "all" | "unfilled" | "awaiting_ack" | "reports";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All duties" },
  { key: "unfilled", label: "Unfilled slots" },
  { key: "awaiting_ack", label: "Awaiting acknowledgement" },
  { key: "reports", label: "Duty reports" },
];

type Row = {
  key: string;
  duty: InvigilationDuty | null;
  slot: VenueOverviewCard | null;
  date: string;
  session: string;
  hallName: string;
  facultyName: string | null;
  departmentCode: string | null;
  dutyType: string;
  status: "unfilled" | "assigned" | "acknowledged";
};

function facultyDisplayName(f: { first_name: string; last_name: string }): string {
  return [f.first_name, f.last_name].filter(Boolean).join(" ");
}

export default function CoeInvigilationPage() {
  const exams = useExams();
  const departments = useDepartments();
  const facultyDirectory = useFacultyDirectory();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [session, setSession] = useState<"all" | "FN" | "AN">("all");
  const [departmentCode, setDepartmentCode] = useState<string>("all");
  const [assigning, setAssigning] = useState<VenueOverviewCard | null>(null);

  const duties = useInvigilationDuties();
  const unfilled = useUnfilledSlots();
  const stats = useInvigilationStats();
  const update = useUpdateInvigilationDuty();
  const acknowledge = useAcknowledgeInvigilationDuty();
  const remind = useRemindInvigilationDuty();
  const remove = useDeleteInvigilationDuty();
  const autoAssign = useAutoAssignInvigilation();

  const rows: Row[] = useMemo(() => {
    const dutyRows: Row[] = (duties.data?.data ?? []).map((d) => ({
      key: `duty-${d.id}`,
      duty: d,
      slot: null,
      date: d.duty_date,
      session: d.session,
      hallName: d.hall_plans.venues.name,
      facultyName: facultyDisplayName(d.faculty),
      departmentCode: d.faculty.departments?.code ?? null,
      dutyType: d.duty_type,
      status: d.acknowledged_at ? "acknowledged" : "assigned",
    }));
    const unfilledRows: Row[] = (unfilled.data ?? []).map((s) => ({
      key: `slot-${s.key}`,
      duty: null,
      slot: s,
      date: s.exam_date,
      session: s.session,
      hallName: s.venue.name,
      facultyName: null,
      departmentCode: s.department_code,
      dutyType: "—",
      status: "unfilled",
    }));
    return [...dutyRows, ...unfilledRows].sort((a, b) => a.date.localeCompare(b.date));
  }, [duties.data, unfilled.data]);

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      unfilled: rows.filter((r) => r.status === "unfilled").length,
      awaiting_ack: rows.filter((r) => r.status === "assigned").length,
      reports: rows.filter((r) => r.status !== "unfilled" && new Date(r.date) < new Date()).length,
    }),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (tab === "unfilled" && r.status !== "unfilled") return false;
    if (tab === "awaiting_ack" && r.status !== "assigned") return false;
    if (tab === "reports" && (r.status === "unfilled" || new Date(r.date) >= new Date())) return false;
    if (session !== "all" && r.session !== session) return false;
    if (departmentCode !== "all" && r.departmentCode !== departmentCode) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!(r.facultyName ?? "").toLowerCase().includes(q) && !r.hallName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function handleExport() {
    downloadCsv(
      "invigilation",
      [
        { header: "Date", value: (r: Row) => r.date },
        { header: "Session", value: (r: Row) => r.session },
        { header: "Hall", value: (r: Row) => r.hallName },
        { header: "Faculty", value: (r: Row) => r.facultyName ?? "" },
        { header: "Department", value: (r: Row) => r.departmentCode ?? "" },
        { header: "Duty type", value: (r: Row) => r.dutyType },
        { header: "Status", value: (r: Row) => r.status },
      ],
      filtered,
    );
  }

  const facultyOptions = (facultyDirectory.data ?? []).map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Invigilation"
        subtitle="Faculty duty allocation, hall-wise assignment, acknowledgement and duty reports."
        actions={
          <Button variant="secondary" className="w-auto" onClick={handleExport}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Invigilators assigned"
          value={stats.data?.assigned ?? 0}
          icon="groups"
          sub={stats.data?.required ? `${Math.round((stats.data.assigned / stats.data.required) * 1000) / 10}% of required` : undefined}
        />
        <StatCard
          label="Unfilled duty slots"
          value={stats.data?.unfilled_slots ?? 0}
          icon="event_busy"
          sub={stats.data?.next_unfilled_date ? `next ${new Date(stats.data.next_unfilled_date).toLocaleDateString()}` : "none"}
        />
        <StatCard label="Acknowledged" value={stats.data?.acknowledged ?? 0} icon="task_alt" sub={stats.data ? `${stats.data.acknowledged_pct}% of assigned` : undefined} />
        <StatCard label="Relief invigilators" value={stats.data?.relief_invigilators ?? 0} icon="swap_horiz" sub="on standby" />
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <PillTabs options={TABS.map((t) => ({ ...t, label: `${t.label} (${tabCounts[t.key]})` }))} value={tab} onChange={(k) => setTab(k as TabKey)} />
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search faculty or hall…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
            <Select value={session} onChange={(e) => setSession(e.target.value as typeof session)} className="w-auto min-w-[130px]">
              <option value="all">All sessions</option>
              <option value="FN">Forenoon</option>
              <option value="AN">Afternoon</option>
            </Select>
            <Select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} className="w-auto min-w-[140px]">
              <option value="all">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {duties.isLoading || unfilled.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Duties</span>
            <span className="text-[12.5px] text-muted">{filtered.length} records</span>
          </div>
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No duties match the current filter.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="w-[150px]">Date & session</div>
                <div className="flex-1">Hall</div>
                <div className="w-[160px]">Faculty</div>
                <div className="w-[110px]">Department</div>
                <div className="w-[100px]">Duty type</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[170px] text-right">Actions</div>
              </div>
              {filtered.map((r) => (
                <RowView
                  key={r.key}
                  row={r}
                  facultyOptions={facultyOptions}
                  onSwap={(facultyId) => r.duty && update.mutate({ id: r.duty.id, faculty_id: facultyId })}
                  onRemove={() => r.duty && remove.mutate(r.duty.id)}
                  onRemind={() => r.duty && remind.mutate(r.duty.id)}
                  onAcknowledge={() => r.duty && acknowledge.mutate(r.duty.id)}
                  onAssign={() => r.slot && setAssigning(r.slot)}
                  onAuto={() =>
                    r.slot &&
                    autoAssign.mutate({ exam_id: r.slot.exam_id, hall_plan_id: r.slot.hall_plan_id, duty_date: r.slot.exam_date, session: r.slot.session })
                  }
                  busy={update.isPending || remove.isPending || remind.isPending || acknowledge.isPending || autoAssign.isPending}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      <AssignModal slot={assigning} onClose={() => setAssigning(null)} facultyOptions={facultyOptions} />
    </div>
  );
}

const STATUS_TONE: Record<Row["status"], BadgeTone> = { unfilled: "danger", assigned: "accent", acknowledged: "accentDark" };
const STATUS_LABEL: Record<Row["status"], string> = { unfilled: "Blocked", assigned: "Assigned", acknowledged: "Acknowledged" };

function RowView({
  row: r,
  facultyOptions,
  onSwap,
  onRemove,
  onRemind,
  onAcknowledge,
  onAssign,
  onAuto,
  busy,
}: {
  row: Row;
  facultyOptions: { id: number; name: string }[];
  onSwap: (facultyId: number) => void;
  onRemove: () => void;
  onRemind: () => void;
  onAcknowledge: () => void;
  onAssign: () => void;
  onAuto: () => void;
  busy: boolean;
}) {
  const [swapping, setSwapping] = useState(false);

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="w-[150px]">
        <div className="text-[13px] font-bold text-ink">{new Date(r.date).toLocaleDateString()}</div>
        <div className="text-[11.5px] text-muted">{r.session === "FN" ? "Forenoon" : "Afternoon"}</div>
      </div>
      <div className="flex-1 text-[12.5px] text-ink">{r.hallName}</div>
      <div className="w-[160px]">
        {swapping ? (
          <select
            autoFocus
            className="w-full rounded-input border border-border-default bg-surface px-2 py-1.5 text-[12px]"
            onChange={(e) => {
              if (e.target.value) onSwap(Number(e.target.value));
              setSwapping(false);
            }}
            onBlur={() => setSwapping(false)}
          >
            <option value="">Choose faculty…</option>
            {facultyOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[12.5px] font-bold text-ink">{r.facultyName ?? "—"}</span>
        )}
      </div>
      <div className="w-[110px] text-[12.5px] text-ink">{r.departmentCode ?? "—"}</div>
      <div className="w-[100px]">
        <Badge tone="neutral">{r.dutyType === "—" ? "—" : r.dutyType.replace("_", " ").toUpperCase()}</Badge>
      </div>
      <div className="w-[110px]">
        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status].toUpperCase()}</Badge>
      </div>
      <div className="flex w-[170px] justify-end gap-2">
        {r.status === "unfilled" ? (
          <>
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40" disabled={busy} onClick={onAssign}>
              Assign
            </button>
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40" disabled={busy} onClick={onAuto}>
              Auto
            </button>
          </>
        ) : (
          <>
            {r.status === "assigned" && (
              <button type="button" className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40" disabled={busy} onClick={onRemind}>
                Remind
              </button>
            )}
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40" disabled={busy} onClick={() => setSwapping(true)}>
              Swap
            </button>
            <button type="button" className="text-[12.5px] font-bold text-danger-fg hover:underline disabled:opacity-40" disabled={busy} onClick={onRemove}>
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AssignModal({ slot, onClose, facultyOptions }: { slot: VenueOverviewCard | null; onClose: () => void; facultyOptions: { id: number; name: string }[] }) {
  const create = useCreateInvigilationDuty();
  const [facultyId, setFacultyId] = useState<number | null>(null);

  function handleClose() {
    setFacultyId(null);
    create.reset();
    onClose();
  }

  function handleAssign() {
    if (!slot || !facultyId) return;
    create.mutate(
      { exam_id: slot.exam_id, hall_plan_id: slot.hall_plan_id, faculty_id: facultyId, duty_date: slot.exam_date, session: slot.session },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal open={slot != null} onClose={handleClose} title="Assign duty" subtitle={slot ? `${slot.venue.name} · ${new Date(slot.exam_date).toLocaleDateString()} · ${slot.session === "FN" ? "Forenoon" : "Afternoon"}` : undefined}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Faculty</label>
          <select
            value={facultyId ?? ""}
            onChange={(e) => setFacultyId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="">Choose faculty…</option>
            {facultyOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" disabled={!facultyId || create.isPending} onClick={handleAssign}>
            {create.isPending ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
