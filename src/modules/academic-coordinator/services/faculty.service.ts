import { apiClient, type QueryParams } from "@/lib/api/client";
import type { FacultyAllocationRow, FacultyCourse, FacultyListItem, FacultyProfile, FacultyWorkload, FacultyWorkloadSummaryRow } from "../types";

interface BackendDepartment {
  id: number;
  name: string;
  code: string;
}

interface BackendFacultyListItem {
  id: number;
  name: string;
  designation: string | null;
  department: BackendDepartment | null;
  qualification: string | null;
  experience_years: number | null;
  classes_count: number;
  attendance_percentage: number | null;
  email: string;
  phone: string | null;
}

interface BackendFacultyCourse {
  mapping_id: number;
  subject_code: string;
  subject_name: string;
  class_label: string;
  weekly_hours: number;
}

interface BackendFacultyProfile {
  id: number;
  name: string;
  designation: string | null;
  department: BackendDepartment | null;
  qualification: string | null;
  specialization: string | null;
  employment_status: string | null;
  employment_type: string | null;
  status: string;
  office_room: string | null;
  date_of_joining: string | null;
  email: string;
  phone: string | null;
  courses: BackendFacultyCourse[];
  weekly_load_hours: number;
  weekly_load_cap_hours: number;
}

interface BackendAllocationRow {
  mapping_id: number;
  subject_code: string;
  subject_name: string;
  batch_id: number;
  department_id: number;
  class_label: string;
  faculty_name: string;
  course_type: FacultyAllocationRow["courseType"];
  weekly_hours: number;
  check: "OK" | "Overload";
}

interface BackendWorkloadSummaryRow {
  faculty_id: number;
  faculty_name: string;
  weekly_hours: number;
  weekly_load_cap_hours: number;
  percent: number;
}

function toListItem(f: BackendFacultyListItem): FacultyListItem {
  return {
    id: f.id,
    name: f.name,
    designation: f.designation,
    department: f.department,
    qualification: f.qualification,
    experienceYears: f.experience_years,
    classesCount: f.classes_count,
    attendancePercentage: f.attendance_percentage,
    email: f.email,
    phone: f.phone,
  };
}

function toCourse(c: BackendFacultyCourse): FacultyCourse {
  return { mappingId: c.mapping_id, subjectCode: c.subject_code, subjectName: c.subject_name, classLabel: c.class_label, weeklyHours: c.weekly_hours };
}

function toProfile(f: BackendFacultyProfile): FacultyProfile {
  return {
    id: f.id,
    name: f.name,
    designation: f.designation,
    department: f.department,
    qualification: f.qualification,
    specialization: f.specialization,
    employmentStatus: f.employment_status,
    employmentType: f.employment_type,
    status: f.status,
    officeRoom: f.office_room,
    dateOfJoining: f.date_of_joining,
    email: f.email,
    phone: f.phone,
    courses: f.courses.map(toCourse),
    weeklyLoadHours: f.weekly_load_hours,
    weeklyLoadCapHours: f.weekly_load_cap_hours,
  };
}

function toAllocation(a: BackendAllocationRow): FacultyAllocationRow {
  return {
    mappingId: a.mapping_id,
    subjectCode: a.subject_code,
    subjectName: a.subject_name,
    batchId: a.batch_id,
    departmentId: a.department_id,
    classLabel: a.class_label,
    facultyName: a.faculty_name,
    courseType: a.course_type,
    weeklyHours: a.weekly_hours,
    check: a.check,
  };
}

function toSummaryRow(s: BackendWorkloadSummaryRow): FacultyWorkloadSummaryRow {
  return { facultyId: s.faculty_id, facultyName: s.faculty_name, weeklyHours: s.weekly_hours, weeklyLoadCapHours: s.weekly_load_cap_hours, percent: s.percent };
}

export interface ListFacultyParams {
  q?: string;
  department_id?: number;
}

export const facultyService = {
  async list(params: ListFacultyParams = {}): Promise<{ total: number; faculty: FacultyListItem[] }> {
    const res = await apiClient.get<{ total: number; faculty: BackendFacultyListItem[] }>("/me/coordinator/faculty", params as QueryParams);
    return { total: res.total, faculty: res.faculty.map(toListItem) };
  },

  async profile(id: number): Promise<FacultyProfile> {
    const f = await apiClient.get<BackendFacultyProfile>(`/me/coordinator/faculty/${id}`);
    return toProfile(f);
  },

  async workload(): Promise<FacultyWorkload> {
    const res = await apiClient.get<{ allocations: BackendAllocationRow[]; summary: BackendWorkloadSummaryRow[] }>(
      "/me/coordinator/faculty/workload",
    );
    return { allocations: res.allocations.map(toAllocation), summary: res.summary.map(toSummaryRow) };
  },
};
