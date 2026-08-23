import { apiClient } from "@/lib/api/client";
import type {
  ApplicationStatus,
  CreateInterviewInput,
  InterviewRow,
  InterviewStatus,
  RecordInterviewResultInput,
  RescheduleInterviewInput,
} from "../types";

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

export const interviewsService = {
  async list(): Promise<InterviewRow[]> {
    const rows = await apiClient.get<BackendInterviewRow[]>("/interviews");
    return rows.map(toRow);
  },

  async create(input: CreateInterviewInput): Promise<InterviewRow> {
    const row = await apiClient.post<BackendInterviewRow>("/interviews", {
      student_id: input.studentId,
      drive_id: input.driveId,
      interview_date: input.interviewDate,
      round_label: input.roundLabel,
      slot_label: input.slotLabel,
      panel_member: input.panelMember,
    });
    return toRow(row);
  },

  async reschedule(id: number, input: RescheduleInterviewInput): Promise<InterviewRow> {
    const row = await apiClient.patch<BackendInterviewRow>(`/interviews/${id}`, {
      interview_date: input.interviewDate,
      round_label: input.roundLabel,
      slot_label: input.slotLabel,
      panel_member: input.panelMember,
    });
    return toRow(row);
  },

  async recordResult(id: number, input: RecordInterviewResultInput): Promise<InterviewRow> {
    const row = await apiClient.patch<BackendInterviewRow>(`/interviews/${id}/result`, {
      result: input.result,
      panel_feedback: input.panelFeedback,
    });
    return toRow(row);
  },
};
