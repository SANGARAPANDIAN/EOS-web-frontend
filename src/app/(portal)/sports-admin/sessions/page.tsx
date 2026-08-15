"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Input, Modal, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useSessions, useCreateSession, type SessionListItem, type SessionStatus } from "@/modules/sports-admin/api/sessions";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { useFacilities } from "@/modules/sports-admin/api/facilities";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { todayDateOnly, formatTime12h } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<SessionStatus, BadgeTone> = {
  pending: "neutral",
  confirmed: "accent",
  done: "accent",
  cancelled: "accentDark",
};

export default function SessionsPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => todayDateOnly());

  const sessions = useSessions(date);
  const disciplines = useDisciplines();
  const facilities = useFacilities();
  const createSession = useCreateSession();
  const rows = useMemo(() => sessions.data ?? [], [sessions.data]);

  const [showModal, setShowModal] = useState(false);
  const [disciplineId, setDisciplineId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [coachFaculty, setCoachFaculty] = useState<PickedPerson | null>(null);
  const [sessionDate, setSessionDate] = useState(() => todayDateOnly());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setDisciplineId("");
    setFacilityId("");
    setCoachFaculty(null);
    setSessionDate(date);
    setStartTime("");
    setEndTime("");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createSession.mutateAsync({
        discipline_id: Number(disciplineId),
        facility_id: facilityId ? Number(facilityId) : undefined,
        coach_faculty_id: coachFaculty?.id,
        session_date: sessionDate,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
      });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<SessionListItem>[] = [
    { key: "session", header: "Session", width: "1.2fr", render: (s) => <span className="font-bold text-ink">{s.discipline?.name}</span> },
    {
      key: "detail",
      header: "Time · venue · coach",
      width: "1.6fr",
      render: (s) => (
        <span className="text-body">
          {[s.start_time ? formatTime12h(s.start_time) : null, s.facility?.name, s.coach?.name].filter(Boolean).join(" · ")}
        </span>
      ),
    },
    {
      key: "athletes",
      header: "Athletes",
      width: "0.8fr",
      render: (s) => <span className="font-mono text-[12.5px] text-muted">{s.athlete_count}</span>,
    },
    { key: "status", header: "Status", width: "0.8fr", render: (s) => <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge> },
    {
      key: "open",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (s) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/sports-admin/sessions/${s.id}`);
          }}
          className="rounded-[8px] border border-border-accent bg-accent-50 px-3 py-1.5 text-[12px] font-bold text-primary"
        >
          Open
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Training sessions</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {rows.length > 0 ? `${rows.length} session${rows.length === 1 ? "" : "s"} on this date` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Add session
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(s) => s.id}
        onRowClick={(s) => router.push(`/sports-admin/sessions/${s.id}`)}
        emptyMessage={sessions.isLoading ? "Loading…" : "No sessions scheduled for this date."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add training session" subtitle="Schedules a new practice session for a discipline">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Discipline</label>
              <Select required value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
                <option value="">Select discipline</option>
                {disciplines.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
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
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Coach</label>
            <PersonPicker type="faculty" value={coachFaculty} onChange={setCoachFaculty} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Session date</label>
              <Input required type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Start time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">End time</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!disciplineId || !sessionDate || createSession.isPending}>
              {createSession.isPending ? "Adding…" : "Add session"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
