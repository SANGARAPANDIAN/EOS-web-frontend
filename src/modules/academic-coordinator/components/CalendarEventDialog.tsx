"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCreateCalendarEvent, useDeleteCalendarEvent, useUpdateCalendarEvent } from "../hooks/useAcademicCalendarMutations";
import type { CalendarEventItem, CalendarEventType } from "../types";

interface CalendarEventDialogProps {
  open: boolean;
  onClose: () => void;
  academicCalendarId: number;
  /** Pre-fills the date when creating a new event from a clicked calendar cell. */
  defaultDate?: string;
  event: CalendarEventItem | null;
}

export function CalendarEventDialog({ open, onClose, academicCalendarId, defaultDate, event }: CalendarEventDialogProps) {
  const { show } = useToast();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventDate, setEventDate] = useState(event?.eventDate.slice(0, 10) ?? defaultDate ?? "");
  const [eventType, setEventType] = useState<CalendarEventType>(event?.eventType ?? "event");
  const [startTime, setStartTime] = useState(event?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(event?.endTime ?? "17:00");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdit = event != null;
  const isPending = createEvent.isPending || updateEvent.isPending;

  function handleSave() {
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return setError("Title is required.");
    if (!eventDate) return setError("Event date is required.");
    if (endTime <= startTime) return setError("End time must be after start time.");

    const base = { title: trimmedTitle, description: description.trim() || undefined, event_date: eventDate, event_type: eventType, start_time: startTime, end_time: endTime };

    (isEdit
      ? updateEvent.mutateAsync({ id: event.id, academicCalendarId, input: base })
      : createEvent.mutateAsync({ academic_calendar_id: academicCalendarId, ...base }))
      .then(() => {
        show(isEdit ? "Event updated" : "Event added", "success");
        onClose();
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again."));
  }

  function handleDelete() {
    if (!event || deleteEvent.isPending) return;
    deleteEvent
      .mutateAsync({ id: event.id, academicCalendarId })
      .then(() => {
        show("Event deleted", "success");
        onClose();
      })
      .catch((err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong.", "error");
        setConfirmingDelete(false);
      });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={isEdit ? "Edit event" : "New calendar event"} className="max-w-md">
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
        </div>
        <div className="flex gap-2.5">
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Date *</label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Type *</label>
            <Select value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEventType)}>
              <option value="event">Event</option>
              <option value="holiday">Holiday</option>
            </Select>
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Start time *</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">End time *</label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}

        <div className={`mt-4.5 flex items-center border-t border-border-default pt-3.5 ${isEdit ? "justify-between" : "justify-end"}`}>
          {isEdit && (
            <Button
              variant="secondary"
              className="w-auto border-danger-border px-3.5 py-2 text-danger-fg"
              onClick={() => setConfirmingDelete(true)}
              disabled={deleteEvent.isPending}
            >
              {deleteEvent.isPending ? "Deleting…" : "Delete"}
            </Button>
          )}
          <div className="flex gap-2.5">
            <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primarySmall" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add event"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this event?"
        description="This removes it from the published calendar immediately."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
