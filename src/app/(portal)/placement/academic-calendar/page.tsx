"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, Select, PendingNotice, SectionCard } from "@/modules/admin/components/ui";
import { useBatches } from "@/modules/placement/api/refData";
import { useAcademicCalendarPeriods } from "@/modules/shared/academic-calendar/api";
import { CalendarPeriodView } from "@/modules/shared/academic-calendar/CalendarPeriodView";
import { CalendarEventModal } from "@/modules/shared/academic-calendar/CalendarEventModal";
import { useAuth } from "@/lib/auth/AuthContext";
import type { CalendarEventItem } from "@/modules/shared/academic-calendar/types";

export default function PlacementAcademicCalendarPage() {
  const { session } = useAuth();
  const batches = useBatches();
  const periods = useAcademicCalendarPeriods();

  const [batchId, setBatchId] = useState<number | "all">("all");
  const [semester, setSemester] = useState<number | "all">("all");
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined);

  const batchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of batches.data ?? []) map.set(b.id, b.name);
    return map;
  }, [batches.data]);

  const filteredPeriods = useMemo(
    () => (periods.data ?? []).filter((p) => (batchId === "all" || p.batchId === batchId) && (semester === "all" || p.semester === semester)),
    [periods.data, batchId, semester],
  );

  const semesterOptions = useMemo(() => {
    const set = new Set((periods.data ?? []).filter((p) => batchId === "all" || p.batchId === batchId).map((p) => p.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [periods.data, batchId]);

  const selectedPeriod = useMemo(
    () => (filteredPeriods.length === 0 ? null : filteredPeriods.reduce((latest, p) => (p.endDate > latest.endDate ? p : latest), filteredPeriods[0])),
    [filteredPeriods],
  );

  function openAddEvent(date: string) {
    setEditingEvent(null);
    setNewEventDate(date);
    setEventModalOpen(true);
  }
  // Placement may only edit/delete events it created itself (server-enforced) —
  // opening the modal for someone else's event would just 403 on save, so a
  // non-owned event isn't wired to onEditEvent at all.
  function openEditEvent(e: CalendarEventItem) {
    if (e.createdByUserId !== session?.user.id) return;
    setEditingEvent(e);
    setNewEventDate(undefined);
    setEventModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Academic Calendar"
        description="Institution events, plus the placement dates this cell adds. Shared entries stay owned by the Academic Coordinator and Principal."
        actions={
          <>
            {selectedPeriod && (
              <button
                type="button"
                onClick={() => openAddEvent(new Date().toISOString().slice(0, 10))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-admin-primary px-4 py-2 text-sm font-bold text-white"
              >
                <Icon name="add" size={16} /> Add event
              </button>
            )}
            <Select
              value={batchId === "all" ? "all" : String(batchId)}
              onChange={(e) => {
                setBatchId(e.target.value === "all" ? "all" : Number(e.target.value));
                setSemester("all");
              }}
            >
              <option value="all">All batches</option>
              {(batches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select value={semester === "all" ? "all" : String(semester)} onChange={(e) => setSemester(e.target.value === "all" ? "all" : Number(e.target.value))}>
              <option value="all">All semesters</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {periods.isLoading ? (
        <PendingNotice reason="Loading calendar…" height={140} />
      ) : !selectedPeriod ? (
        <SectionCard title="No calendar published">
          <p className="text-sm text-admin-muted">No academic calendar published for this batch/semester yet.</p>
        </SectionCard>
      ) : (
        <CalendarPeriodView
          key={selectedPeriod.id}
          period={selectedPeriod}
          batchName={batchNameById.get(selectedPeriod.batchId) ?? `Batch #${selectedPeriod.batchId}`}
          onAddEvent={openAddEvent}
          onEditEvent={openEditEvent}
        />
      )}

      {selectedPeriod && eventModalOpen && (
        <CalendarEventModal
          key={`event-${editingEvent?.id ?? newEventDate ?? "new"}`}
          open={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          academicCalendarId={selectedPeriod.id}
          defaultDate={newEventDate}
          event={editingEvent}
          canDelete={editingEvent?.createdByUserId === session?.user.id}
        />
      )}
    </div>
  );
}
