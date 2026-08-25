import { apiClient } from "@/lib/api/client";
import type { TimetableSlot } from "../types";

interface BackendTimetableSlot {
  id: number;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  academic_year: string;
  semester: number;
  class: { id: number; section: string; department: { code: string } };
  subject: { id: number; name: string; subject_code: string };
  faculty: { id: number; first_name: string; last_name: string; designation: string };
}

// start_time/end_time round-trip as full ISO datetimes pinned to an arbitrary reference date — only the HH:MM part is real.
function toTimeLabel(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match ? match[1] : iso;
}

function toSlot(s: BackendTimetableSlot): TimetableSlot {
  return {
    id: s.id,
    dayOfWeek: s.day_of_week,
    periodNumber: s.period_number,
    startTime: toTimeLabel(s.start_time),
    endTime: toTimeLabel(s.end_time),
    academicYear: s.academic_year,
    semester: s.semester,
    classId: s.class.id,
    classSection: s.class.section,
    departmentCode: s.class.department.code,
    subjectId: s.subject.id,
    subjectCode: s.subject.subject_code,
    subjectName: s.subject.name,
    facultyId: s.faculty.id,
    facultyName: `${s.faculty.first_name} ${s.faculty.last_name}`,
  };
}

export const timetableService = {
  /** Fetches every slot in one page — the whole institution has well under 100 real rows today. */
  async listAll(): Promise<TimetableSlot[]> {
    const res = await apiClient.get<{ data: BackendTimetableSlot[] }>("/me/timetable-slots", { limit: 100 });
    return res.data.map(toSlot);
  },
};
