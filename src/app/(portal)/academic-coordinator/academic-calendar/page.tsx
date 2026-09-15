"use client";

import { useMemo, useState } from "react";
import { useBatches } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useAcademicCalendarPeriods as useCoordinatorAcademicCalendarPeriods } from "@/modules/academic-coordinator/hooks/useAcademicCalendarQueries";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CalendarPeriodDialog } from "@/modules/academic-coordinator/components/CalendarPeriodDialog";
import { CalendarPeriodView } from "@/modules/shared/academic-calendar/CalendarPeriodView";
import { CalendarEventModal } from "@/modules/shared/academic-calendar/CalendarEventModal";
import type { CalendarEventItem } from "@/modules/shared/academic-calendar/types";
import type { AcademicCalendarPeriod } from "@/modules/academic-coordinator/types";

export default function CoordinatorAcademicCalendarPage() {
  const batches = useBatches();
  const periods = useCoordinatorAcademicCalendarPeriods();

  const [batchId, setBatchId] = useState<number | "all">("all");
  const [semester, setSemester] = useState<number | "all">("all");
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AcademicCalendarPeriod | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined);

  const batchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of batches.data ?? []) map.set(b.id, b.name);
    return map;
  }, [batches.data]);

  const filteredPeriods = useMemo(
    () =>
      (periods.data ?? []).filter(
        (p) => (batchId === "all" || p.batchId === batchId) && (semester === "all" || p.semester === semester),
      ),
    [periods.data, batchId, semester],
  );

  const semesterOptions = useMemo(() => {
    const set = new Set((periods.data ?? []).filter((p) => batchId === "all" || p.batchId === batchId).map((p) => p.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [periods.data, batchId]);

  const selectedPeriod = useMemo(
    () =>
      filteredPeriods.length === 0
        ? null
        : filteredPeriods.reduce((latest, p) => (p.endDate > latest.endDate ? p : latest), filteredPeriods[0]),
    [filteredPeriods],
  );

  function openCreatePeriod() {
    setEditingPeriod(null);
    setPeriodDialogOpen(true);
  }
  function openEditPeriod(p: AcademicCalendarPeriod) {
    setEditingPeriod(p);
    setPeriodDialogOpen(true);
  }
  function openAddEvent(date: string) {
    setEditingEvent(null);
    setNewEventDate(date);
    setEventDialogOpen(true);
  }
  function openEditEvent(e: CalendarEventItem) {
    setEditingEvent(e);
    setNewEventDate(undefined);
    setEventDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Academic Calendar</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Publish semester periods and events for every batch — visible read-only across Placement and other portals.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Select
            value={batchId === "all" ? "all" : String(batchId)}
            onChange={(e) => {
              setBatchId(e.target.value === "all" ? "all" : Number(e.target.value));
              setSemester("all");
            }}
            className="min-w-35"
          >
            <option value="all">All batches</option>
            {(batches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            value={semester === "all" ? "all" : String(semester)}
            onChange={(e) => setSemester(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="min-w-35"
          >
            <option value="all">All semesters</option>
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
          <Button variant="primarySmall" onClick={openCreatePeriod}>
            + New period
          </Button>
        </div>
      </div>

      {periods.isLoading ? (
        <p className="text-[13px] text-subtle">Loading calendar…</p>
      ) : !selectedPeriod ? (
        <Card className="p-8 text-center">
          <p className="m-0 text-[13px] text-subtle">No academic calendar published for this batch/semester yet.</p>
          <Button variant="primarySmall" className="mt-3.5 w-auto" onClick={openCreatePeriod}>
            + Create the first period
          </Button>
        </Card>
      ) : (
        <CalendarPeriodView
          key={selectedPeriod.id}
          period={selectedPeriod}
          batchName={batchNameById.get(selectedPeriod.batchId) ?? `Batch #${selectedPeriod.batchId}`}
          periodActions={
            <Button variant="secondary" className="flex-1" onClick={() => openEditPeriod(selectedPeriod)}>
              Edit period
            </Button>
          }
          onAddEvent={openAddEvent}
          onEditEvent={openEditEvent}
        />
      )}

      {periodDialogOpen && (
        <CalendarPeriodDialog
          key={`period-${editingPeriod?.id ?? "new"}`}
          open={periodDialogOpen}
          onClose={() => setPeriodDialogOpen(false)}
          period={editingPeriod}
        />
      )}

      {selectedPeriod && eventDialogOpen && (
        <CalendarEventModal
          key={`event-${editingEvent?.id ?? newEventDate ?? "new"}`}
          open={eventDialogOpen}
          onClose={() => setEventDialogOpen(false)}
          academicCalendarId={selectedPeriod.id}
          defaultDate={newEventDate}
          event={editingEvent}
        />
      )}
    </div>
  );
}
