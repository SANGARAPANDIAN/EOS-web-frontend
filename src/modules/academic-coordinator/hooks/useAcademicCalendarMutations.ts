import { useMutation, useQueryClient } from "@tanstack/react-query";
import { academicCalendarService } from "../services/academic-calendar.service";
import { coordinatorKeys } from "../query-keys";
import type {
  CreateAcademicCalendarPeriodInput,
  CreateCalendarEventInput,
  UpdateAcademicCalendarPeriodInput,
  UpdateCalendarEventInput,
} from "../types";

export function useCreateCalendarPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAcademicCalendarPeriodInput) => academicCalendarService.createPeriod(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.academicCalendar.periods() }),
  });
}

export function useUpdateCalendarPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAcademicCalendarPeriodInput }) => academicCalendarService.updatePeriod(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.academicCalendar.periods() }),
  });
}

export function useDeleteCalendarPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => academicCalendarService.deletePeriod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.academicCalendar.periods() }),
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => academicCalendarService.createEvent(input),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.academicCalendar.events(variables.academic_calendar_id) }),
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: number; academicCalendarId: number; input: UpdateCalendarEventInput }) =>
      academicCalendarService.updateEvent(variables.id, variables.input),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.academicCalendar.events(variables.academicCalendarId) }),
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; academicCalendarId: number }) => academicCalendarService.deleteEvent(id),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.academicCalendar.events(variables.academicCalendarId) }),
  });
}
