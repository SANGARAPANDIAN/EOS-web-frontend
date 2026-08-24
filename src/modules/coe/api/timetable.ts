import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ExamSessionCode } from "@/modules/coe/api/shared";

// src/modules/exams/exam-timetable/exam-timetable.controller.ts — confirmed:
// no conflict-detection, no draft/publish-version workflow (every exam gets
// one implicit version). Publish state lives on exam_subject_mapping.is_published,
// flipped only as a side-effect of this same create/update call.

export interface TimetableEntry {
  id: number;
  exam_subject_mapping_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  version_id: number;
  session: ExamSessionCode;
  venue_id: number | null;
  exam_subject_mapping: {
    id: number;
    exam_id: number;
    class_id: number;
    subject_id: number;
    is_published: boolean;
    published_at: string | null;
    is_elective: boolean;
  };
}

/** GET /exam-timetable takes no query params — always the full table. */
export function useExamTimetable() {
  return useQuery({
    queryKey: ["coe", "exam-timetable"],
    queryFn: () => apiClient.get<TimetableEntry[]>("/exam-timetable"),
  });
}

export interface CreateTimetableEntryInput {
  exam_subject_mapping_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  session: ExamSessionCode;
  is_published?: boolean;
}

export function useCreateTimetableEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimetableEntryInput) => apiClient.post<TimetableEntry>("/exam-timetable", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "exam-timetable"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "exam-subject-mapping"] });
    },
  });
}

export interface UpdateTimetableEntryInput {
  id: number;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  session?: ExamSessionCode;
  /** Flips the entry's exam_subject_mapping.is_published (and published_at) — see this file's top comment. */
  is_published?: boolean;
}

/** Used to drag an already-placed card to a different cell (reschedule). */
export function useUpdateTimetableEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTimetableEntryInput) => apiClient.patch<TimetableEntry>(`/exam-timetable/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "exam-timetable"] }),
  });
}

export function useDeleteTimetableEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<TimetableEntry>(`/exam-timetable/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "exam-timetable"] }),
  });
}
