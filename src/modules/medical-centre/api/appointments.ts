import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/**
 * Medical centre appointments — the staff side of the booking workflow.
 *
 * Two concepts that are deliberately NOT the same thing:
 *
 *  - a **time part** (`AppointmentWindow`) is what staff open on a date, e.g.
 *    10:00–13:00. It is a stored row.
 *  - a **slot** (`AppointmentSlot`) is one bookable 30-minute division of a
 *    time part, e.g. 10:00–10:30. Slots are derived server-side from the
 *    window and never stored, so editing a window can never leave orphaned
 *    slot rows behind.
 *
 * Bookings land as `pending` and stay out of the OPD queue entirely. Only
 * `approve` creates the medical_visits row that puts the patient in the queue.
 */

export type AppointmentWindowStatus = "open" | "closed";
export type AppointmentStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PatientKind = "student" | "faculty" | "staff";

export interface AppointmentWindow {
  id: number;
  /** YYYY-MM-DD */
  slot_date: string;
  /** HH:mm, 24-hour */
  start_time: string;
  /** HH:mm, 24-hour */
  end_time: string;
  slot_minutes: number;
  capacity_per_slot: number;
  status: AppointmentWindowStatus;
  /** Derived: how many slots this time part divides into. */
  slot_count: number;
  /** Live bookings (pending + approved) across the whole time part. */
  booked_count: number;
  pending_count: number;
}

export interface AppointmentSlot {
  /** HH:mm, 24-hour */
  slot_start: string;
  /** HH:mm, 24-hour */
  slot_end: string;
  capacity: number;
  /** pending + approved — what counts against capacity. */
  booked: number;
  pending: number;
  approved: number;
  full: boolean;
}

export interface AppointmentDayWindow {
  window: AppointmentWindow;
  slots: AppointmentSlot[];
}

/** Everything the Bookings tab needs for one date, grouped time part by time part. */
export interface AppointmentDay {
  slot_date: string;
  windows: AppointmentDayWindow[];
}

export interface SlotBooking {
  id: number;
  status: AppointmentStatus;
  patient_kind: PatientKind;
  name: string;
  /** Roll/register number for a student, staff code for faculty. */
  identifier: string | null;
  department: string | null;
  reason: string | null;
  booked_at: string;
  decided_at: string | null;
  decision_note: string | null;
  /** The OPD queue row this became, once approved. */
  visit_id: number | null;
}

const BASE = "/me/medical-centre-appointments";
const WINDOWS_KEY = ["me", "medical-centre-appointments", "windows"] as const;
const SLOTS_KEY = ["me", "medical-centre-appointments", "slots"] as const;
const BOOKINGS_KEY = ["me", "medical-centre-appointments", "bookings"] as const;

/**
 * GET /windows?from=&to= — every time part in a date range.
 *
 * The Date & time slots calendar loads a whole month at once so each day cell
 * can show whether it has sessions without a request per cell.
 */
export function useAppointmentWindows(from: string, to: string) {
  return useQuery({
    queryKey: [...WINDOWS_KEY, from, to],
    queryFn: () => apiClient.get<AppointmentWindow[]>(`${BASE}/windows`, { from, to }),
  });
}

export interface CreateWindowInput {
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_minutes?: number;
  capacity_per_slot?: number;
}

/** POST /windows — add one time part to a date. */
export function useCreateAppointmentWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWindowInput) => apiClient.post<AppointmentWindow>(`${BASE}/windows`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      queryClient.invalidateQueries({ queryKey: SLOTS_KEY });
    },
  });
}

export interface UpdateWindowInput {
  start_time?: string;
  end_time?: string;
  slot_minutes?: number;
  capacity_per_slot?: number;
  status?: AppointmentWindowStatus;
}

/** PATCH /windows/:id */
export function useUpdateAppointmentWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWindowInput & { id: number }) =>
      apiClient.patch<AppointmentWindow>(`${BASE}/windows/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      queryClient.invalidateQueries({ queryKey: SLOTS_KEY });
    },
  });
}

/**
 * DELETE /windows/:id
 *
 * Refused server-side (409) if the time part still has live bookings — the
 * people who booked have to be dealt with first, rather than silently losing
 * their appointments.
 */
export function useDeleteAppointmentWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number }>(`${BASE}/windows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WINDOWS_KEY });
      queryClient.invalidateQueries({ queryKey: SLOTS_KEY });
    },
  });
}

/**
 * GET /slots?date= — the derived slot structure for one date.
 *
 * Returns each time part with its own list of 30-minute slots and their live
 * booked counts, which is exactly how the Bookings tab renders it: grouped per
 * time part, not as one flat list.
 */
export function useAppointmentDay(date: string | null) {
  return useQuery({
    queryKey: [...SLOTS_KEY, date],
    queryFn: () => apiClient.get<AppointmentDay>(`${BASE}/slots`, { date: date! }),
    enabled: Boolean(date),
  });
}

/** GET /bookings?date=&start= — who booked one specific slot. */
export function useSlotBookings(date: string | null, start: string | null) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, date, start],
    queryFn: () => apiClient.get<SlotBooking[]>(`${BASE}/bookings`, { date: date!, start: start! }),
    enabled: Boolean(date && start),
  });
}

/**
 * POST /bookings/:id/approve — the only path into the OPD queue.
 *
 * Invalidates the OPD queue too, since approving adds a row to it.
 */
export function useApproveBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      apiClient.post<{ id: number; status: AppointmentStatus; visit_id: number }>(`${BASE}/bookings/${id}/approve`, {
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY });
      queryClient.invalidateQueries({ queryKey: SLOTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-opd-queue"] });
      queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-dashboard"] });
    },
  });
}

/** POST /bookings/:id/reject */
export function useRejectBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      apiClient.post<{ id: number; status: AppointmentStatus }>(`${BASE}/bookings/${id}/reject`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY });
      queryClient.invalidateQueries({ queryKey: SLOTS_KEY });
    },
  });
}
