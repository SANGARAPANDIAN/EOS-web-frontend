import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";
import type { ApplicationStatus } from "./types";

// Interview's own lifecycle, separate from the linked application's
// progress status — "Result" is always read from that application, never
// duplicated here.
export type InterviewStatus = "scheduled" | "in_progress" | "completed";

export interface InterviewRow {
  id: number;
  studentId: number;
  driveId: number;
  interviewDate: string;
  studentName: string;
  studentIdNo: string;
  registerNo: string | null;
  departmentCode: string | null;
  companyName: string;
  jobRole?: string;
  roundLabel: string;
  slotLabel: string;
  panelMember: string;
  status: InterviewStatus;
  applicationStatus: ApplicationStatus | null;
  panelFeedback: string | null;
}

export interface CreateInterviewInput {
  studentId: number;
  driveId: number;
  interviewDate: string;
  roundLabel: string;
  slotLabel: string;
  panelMember: string;
}

export interface RescheduleInterviewInput {
  interviewDate?: string;
  roundLabel?: string;
  slotLabel?: string;
  panelMember?: string;
}

export interface RecordInterviewResultInput {
  result: ApplicationStatus;
  panelFeedback?: string;
}

interface BackendInterviewRow {
  id: number;
  student_id: number;
  drive_id: number;
  interview_date: string;
  student_name: string;
  student_id_no: string;
  register_no: string | null;
  department_code: string | null;
  company_name: string;
  job_role: string | null;
  round_label: string;
  slot_label: string;
  panel_member: string;
  status: InterviewStatus;
  application_status: ApplicationStatus | null;
  panel_feedback: string | null;
}

function toRow(r: BackendInterviewRow): InterviewRow {
  return {
    id: r.id,
    studentId: r.student_id,
    driveId: r.drive_id,
    interviewDate: r.interview_date,
    studentName: r.student_name,
    studentIdNo: r.student_id_no,
    registerNo: r.register_no,
    departmentCode: r.department_code,
    companyName: r.company_name,
    jobRole: r.job_role ?? undefined,
    roundLabel: r.round_label,
    slotLabel: r.slot_label,
    panelMember: r.panel_member,
    status: r.status,
    applicationStatus: r.application_status,
    panelFeedback: r.panel_feedback,
  };
}

export function useInterviews() {
  return useQuery({
    queryKey: placementKeys.interviews.list(),
    queryFn: async () => {
      const rows = await apiClient.get<BackendInterviewRow[]>("/interviews");
      return rows.map(toRow);
    },
  });
}

function useInvalidateInterviews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: placementKeys.interviews.all() });
    queryClient.invalidateQueries({ queryKey: placementKeys.drives.all() });
    queryClient.invalidateQueries({ queryKey: [...placementKeys.all, "student-report"] });
    queryClient.invalidateQueries({ queryKey: placementKeys.dashboard() });
  };
}

export function useCreateInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: async (input: CreateInterviewInput) =>
      toRow(
        await apiClient.post<BackendInterviewRow>("/interviews", {
          student_id: input.studentId,
          drive_id: input.driveId,
          interview_date: input.interviewDate,
          round_label: input.roundLabel,
          slot_label: input.slotLabel,
          panel_member: input.panelMember,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRescheduleInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: RescheduleInterviewInput }) =>
      toRow(
        await apiClient.patch<BackendInterviewRow>(`/interviews/${id}`, {
          interview_date: input.interviewDate,
          round_label: input.roundLabel,
          slot_label: input.slotLabel,
          panel_member: input.panelMember,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRecordInterviewResult() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: RecordInterviewResultInput }) =>
      toRow(
        await apiClient.patch<BackendInterviewRow>(`/interviews/${id}/result`, {
          result: input.result,
          panel_feedback: input.panelFeedback,
        }),
      ),
    onSuccess: invalidate,
  });
}
