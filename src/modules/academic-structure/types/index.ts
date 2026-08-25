/** Real backend shapes — verified directly against GET /departments|courses|batches|classes, not assumed. */

export interface HodSummary {
  id: number;
  first_name: string;
  last_name: string;
  designation: string | null;
}

/** GET /me/faculty?department_id= row shape — richer than HodSummary, used to populate the HoD picker. */
export interface FacultyOption {
  id: number;
  prefix: string | null;
  first_name: string;
  last_name: string;
  designation: string | null;
  status: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Department {
  id: number;
  name: string;
  code: string;
  created_at: string;
  head_of_department_faculty_id: number | null;
  faculty_departments_head_of_department_faculty_idTofaculty: HodSummary | null;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  department_id: number;
  duration_years: number;
  created_at: string;
  accreditation_status: string | null;
  accreditation_valid_until: string | null;
}

export interface Batch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

export interface SchoolClass {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number | null;
  classroom: string | null;
}

export interface ClassSubject {
  id: number;
  semester: number;
  is_elective: boolean;
  subjects: {
    id: number;
    name: string;
    subject_code: string;
    credits: number | null;
  };
}

/** Starting suggestions only — not a closed set. The db column is a plain varchar(10); any label is valid once A-D are taken. */
export const SECTION_LETTERS = ["A", "B", "C", "D"] as const;

export interface CreateDepartmentInput {
  name: string;
  code: string;
}
export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export interface AssignHodInput {
  faculty_id: number | null;
}

export interface CreateCourseInput {
  name: string;
  code: string;
  department_id: number;
  duration_years?: number;
}
export type UpdateCourseInput = Partial<CreateCourseInput>;

export interface CreateBatchInput {
  name: string;
  start_year: number;
  end_year: number;
}
export type UpdateBatchInput = Partial<CreateBatchInput>;

export interface CreateClassInput {
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester?: number;
}
export type UpdateClassInput = Partial<CreateClassInput>;

/** Structured 409 "in use" blocker payload — thrown by the backend as the ApiError's parsed detail when present. */
export interface InUseDetails {
  courses?: number;
  classes?: number;
  students?: number;
}
