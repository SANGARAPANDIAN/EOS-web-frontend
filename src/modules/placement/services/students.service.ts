import { apiClient } from "@/lib/api/client";
import type { ApplicationStatus, EligibleStudent, OfferResponseStatus, StudentProfile } from "../types";

interface BackendStudentProfile {
  id: number;
  student_id_no: string;
  roll_no: string | null;
  classes: { section: string; departments: { name: string; code: string } } | null;
  soa_applications: { first_name: string; last_name: string | null } | null;
}

interface BackendPaginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function toStudent(s: BackendStudentProfile): EligibleStudent {
  const soa = s.soa_applications;
  const classes = s.classes;
  return {
    id: s.id,
    studentIdNo: s.student_id_no,
    rollNo: s.roll_no,
    name: soa ? [soa.first_name, soa.last_name].filter(Boolean).join(" ") : undefined,
    classLabel: classes ? `${classes.departments.code} - ${classes.section}` : undefined,
    departmentName: classes?.departments.name,
  };
}

interface BackendStudentApplication {
  drive_id: number;
  company_name: string;
  job_role: string | null;
  status: ApplicationStatus;
  updated_at: string;
}

interface BackendStudentOffer {
  drive_id: number;
  company_name: string;
  job_role: string | null;
  offered_package: number | null;
  offer_response: OfferResponseStatus | null;
  updated_at: string;
}

interface BackendStudentProfileDetail {
  id: number;
  student_id_no: string;
  register_no: string | null;
  name: string;
  email: string;
  department_name: string | null;
  department_code: string | null;
  year: number | null;
  photo_url: string | null;
  resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  leetcode_url: string | null;
  hackerrank_url: string | null;
  codeforces_url: string | null;
  drives_applied: number;
  offers_count: number;
  status: ApplicationStatus | null;
  applications: BackendStudentApplication[];
  offers: BackendStudentOffer[];
}

function toStudentProfile(r: BackendStudentProfileDetail): StudentProfile {
  return {
    id: r.id,
    studentIdNo: r.student_id_no,
    registerNo: r.register_no,
    name: r.name,
    email: r.email,
    departmentName: r.department_name ?? undefined,
    departmentCode: r.department_code ?? undefined,
    year: r.year,
    photoUrl: r.photo_url,
    resumeUrl: r.resume_url,
    linkedinUrl: r.linkedin_url,
    githubUrl: r.github_url,
    leetcodeUrl: r.leetcode_url,
    hackerrankUrl: r.hackerrank_url,
    codeforcesUrl: r.codeforces_url,
    drivesApplied: r.drives_applied,
    offersCount: r.offers_count,
    status: r.status,
    applications: r.applications.map((a) => ({
      driveId: a.drive_id,
      companyName: a.company_name,
      jobRole: a.job_role ?? undefined,
      status: a.status,
      updatedAt: a.updated_at,
    })),
    offers: r.offers.map((o) => ({
      driveId: o.drive_id,
      companyName: o.company_name,
      jobRole: o.job_role ?? undefined,
      offeredPackageLpa: o.offered_package,
      offerResponse: o.offer_response,
      updatedAt: o.updated_at,
    })),
  };
}

export const studentsService = {
  // GET /student-profiles caps `limit` at 100 per page — unlike /drives
  // (small enough to fit one page), the full roster can exceed that, and
  // eligible-student counts/department breakdowns need to be accurate, so
  // this loops every page instead of taking just the first.
  async listAll(): Promise<EligibleStudent[]> {
    const first = await apiClient.get<BackendPaginated<BackendStudentProfile>>("/student-profiles", { limit: 100, page: 1 });
    const rows = [...first.data];
    for (let page = 2; page <= first.meta.totalPages; page++) {
      const res = await apiClient.get<BackendPaginated<BackendStudentProfile>>("/student-profiles", { limit: 100, page });
      rows.push(...res.data);
    }
    return rows.map(toStudent);
  },

  async getProfile(id: number): Promise<StudentProfile> {
    const row = await apiClient.get<BackendStudentProfileDetail>(`/drives/students/${id}/profile`);
    return toStudentProfile(row);
  },
};
