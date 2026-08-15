"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, Icon, Input, Modal, SearchBar, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import { useCoaches, useCreateCoachProfile, type CoachListItem, type DutyStatus } from "@/modules/sports-admin/api/coaches";
import { useDisciplines } from "@/modules/sports-admin/api/disciplines";
import { PersonPicker, type PickedPerson } from "@/modules/sports-admin/components/PersonPicker";
import { ApiError } from "@/types/api";

const DUTY_TONE: Record<DutyStatus, BadgeTone> = {
  on_duty: "accent",
  on_leave: "neutral",
};

export default function CoachesPage() {
  const router = useRouter();
  const disciplines = useDisciplines();
  const createCoachProfile = useCreateCoachProfile();
  const [q, setQ] = useState("");
  const [dutyStatus, setDutyStatus] = useState<string>("");

  const coaches = useCoaches({
    q: q || undefined,
    duty_status: (dutyStatus as DutyStatus) || undefined,
  });

  const rows = useMemo(() => coaches.data ?? [], [coaches.data]);

  const [showModal, setShowModal] = useState(false);
  const [faculty, setFaculty] = useState<PickedPerson | null>(null);
  const [newDisciplineId, setNewDisciplineId] = useState("");
  const [coachingExperienceYears, setCoachingExperienceYears] = useState("");
  const [newDutyStatus, setNewDutyStatus] = useState<DutyStatus>("on_duty");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setFaculty(null);
    setNewDisciplineId("");
    setCoachingExperienceYears("");
    setNewDutyStatus("on_duty");
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!faculty) return;
    try {
      const created = await createCoachProfile.mutateAsync({
        faculty_id: faculty.id,
        discipline_id: newDisciplineId ? Number(newDisciplineId) : undefined,
        coaching_experience_years: coachingExperienceYears ? Number(coachingExperienceYears) : undefined,
        duty_status: newDutyStatus,
      });
      setShowModal(false);
      router.push(`/sports-admin/coaches/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<CoachListItem>[] = [
    { key: "name", header: "Staff", width: "1.3fr", render: (c) => <span className="font-bold text-ink">{c.name}</span> },
    {
      key: "detail",
      header: "Designation · discipline",
      width: "1.6fr",
      render: (c) => (
        <span className="text-body">{[c.designation, c.discipline?.name].filter(Boolean).join(" · ")}</span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      width: "0.9fr",
      render: (c) => <span className="font-mono text-[12.5px] text-muted">{c.phone ?? "—"}</span>,
    },
    {
      key: "duty",
      header: "Duty",
      width: "0.8fr",
      render: (c) => <Badge tone={DUTY_TONE[c.duty_status]}>{c.duty_status}</Badge>,
    },
    {
      key: "open",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (c) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/sports-admin/coaches/${c.id}`);
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
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Coaches</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {rows.length > 0 ? `${rows.length} coaching staff record${rows.length === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Add coach
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <SearchBar placeholder="Search coaches…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-auto" value={dutyStatus} onChange={(e) => setDutyStatus(e.target.value)}>
          <option value="">All duty statuses</option>
          <option value="on_duty">On duty</option>
          <option value="on_leave">On leave</option>
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => router.push(`/sports-admin/coaches/${c.id}`)}
        emptyMessage={coaches.isLoading ? "Loading…" : "No coaches match these filters."}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add coach" subtitle="Creates a coaching profile for an existing staff record">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Faculty</label>
            <PersonPicker type="faculty" value={faculty} onChange={setFaculty} required />
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
              <label className="text-[13px] font-bold text-primary">Coaching experience (years)</label>
              <Input
                type="number"
                value={coachingExperienceYears}
                onChange={(e) => setCoachingExperienceYears(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Duty status</label>
            <Select value={newDutyStatus} onChange={(e) => setNewDutyStatus(e.target.value as DutyStatus)}>
              <option value="on_duty">On duty</option>
              <option value="on_leave">On leave</option>
            </Select>
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
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!faculty || createCoachProfile.isPending}>
              {createCoachProfile.isPending ? "Adding…" : "Add coach"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
