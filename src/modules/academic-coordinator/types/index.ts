/** Real backend shapes — verified directly against the feedback and academic-calendar modules, not assumed from the reference UI. */

export type FeedbackFormType = "general" | "end_semester";
export type FeedbackQuestionType = "rating" | "text";

/** Mirrors the live `feedback_course_type_enum` — also the key for the reusable feedback_question_templates bank. */
export type FeedbackCourseType = "THEORY" | "THEORY_WITH_PRACTICAL" | "THEORY_WITH_PRACTICAL_WITH_PROJECT" | "LABORATORY" | "ADDITIONAL";

export const FEEDBACK_COURSE_TYPE_LABELS: Record<FeedbackCourseType, string> = {
  THEORY: "Theory",
  THEORY_WITH_PRACTICAL: "Theory cum Practical",
  THEORY_WITH_PRACTICAL_WITH_PROJECT: "Theory, Practical & Project",
  LABORATORY: "Practical / Laboratory",
  ADDITIONAL: "Elective / Additional",
};

export interface FeedbackQuestionTemplate {
  id: number;
  questionText: string;
  isOptional: boolean;
  displayOrder: number;
}

export interface FeedbackQuestionInput {
  question_text: string;
  question_type?: FeedbackQuestionType;
  sequence_no?: number;
}

export interface FeedbackQuestion {
  id: number;
  form_id: number;
  question_text: string;
  question_type: FeedbackQuestionType;
  sequence_no: number;
}

export interface FeedbackForm {
  id: number;
  title: string;
  form_type: FeedbackFormType;
  class_id: number | null;
  batch_id: number | null;
  rating_scale_id: number | null;
  created_by_user_id: number;
  created_at: string;
  batchName: string | null;
  classSection: string | null;
  questionCount: number;
  /** null on every environment until the pending migration in academic_coordinator.query.md #1 runs. */
  category: FeedbackCourseType | null;
  /** Defaults to true (visible) until the same migration runs — see query.md for why. */
  isPublished: boolean;
}

export interface FeedbackFormDetail extends FeedbackForm {
  questions: FeedbackQuestion[];
}

export interface CreateFeedbackFormInput {
  title: string;
  class_id?: number;
  batch_id?: number;
  form_type?: FeedbackFormType;
  rating_scale_id?: number;
  category?: FeedbackCourseType;
  questions: FeedbackQuestionInput[];
}

export type UpdateFeedbackFormInput = Partial<Pick<CreateFeedbackFormInput, "title" | "class_id" | "batch_id" | "category">>;

/** Per-question aggregate for a "general" form's results (anonymous — no student identity ever returned). */
export interface FeedbackQuestionResult {
  id: number;
  question_text: string;
  sequence_no: number;
  question_type: FeedbackQuestionType;
  response_count: number;
  average_rating?: number | null;
  rating_distribution?: Record<number, number>;
  responses?: (string | null)[];
}

export interface FeedbackGeneralResults {
  form_id: number;
  title: string;
  form_type: "general";
  target_student_count: number;
  respondent_count: number;
  questions: FeedbackQuestionResult[];
}

/** One row per faculty+subject mapping in an end-of-semester matrix form. */
export interface FeedbackMatrixRow {
  mapping_id: number;
  faculty_id: number;
  faculty_name: string;
  subject_id: number;
  subject_name: string;
  questions: FeedbackQuestionResult[];
}

export interface FeedbackMatrixResults {
  form_id: number;
  title: string;
  form_type: "end_semester";
  target_student_count: number;
  respondent_count: number;
  rows: FeedbackMatrixRow[];
}

export type FeedbackResults = FeedbackGeneralResults | FeedbackMatrixResults;

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ───────────────────────────── Academic calendar ─────────────────────────────

export interface AcademicCalendarPeriod {
  id: number;
  batchId: number;
  semester: number;
  startDate: string;
  endDate: string;
}

export interface CreateAcademicCalendarPeriodInput {
  batch_id: number;
  semester: number;
  start_date: string;
  end_date: string;
}
export type UpdateAcademicCalendarPeriodInput = Partial<CreateAcademicCalendarPeriodInput>;

// ───────────────────────────── Faculty ─────────────────────────────

export interface FacultyListItem {
  id: number;
  name: string;
  designation: string | null;
  department: { id: number; name: string; code: string } | null;
  qualification: string | null;
  experienceYears: number | null;
  classesCount: number;
  attendancePercentage: number | null;
  email: string;
  phone: string | null;
}

export interface FacultyCourse {
  mappingId: number;
  subjectCode: string;
  subjectName: string;
  classLabel: string;
  weeklyHours: number;
}

export interface FacultyProfile {
  id: number;
  name: string;
  designation: string | null;
  department: { id: number; name: string; code: string } | null;
  qualification: string | null;
  specialization: string | null;
  employmentStatus: string | null;
  employmentType: string | null;
  status: string;
  officeRoom: string | null;
  dateOfJoining: string | null;
  email: string;
  phone: string | null;
  courses: FacultyCourse[];
  weeklyLoadHours: number;
  weeklyLoadCapHours: number;
}

export interface FacultyAllocationRow {
  mappingId: number;
  subjectCode: string;
  subjectName: string;
  batchId: number;
  departmentId: number;
  classLabel: string;
  facultyName: string;
  courseType: SubjectCourseType | null;
  weeklyHours: number;
  check: "OK" | "Overload";
}

export interface FacultyWorkloadSummaryRow {
  facultyId: number;
  facultyName: string;
  weeklyHours: number;
  weeklyLoadCapHours: number;
  percent: number;
}

export interface FacultyWorkload {
  allocations: FacultyAllocationRow[];
  summary: FacultyWorkloadSummaryRow[];
}

// ───────────────────────────── Timetable ─────────────────────────────

export interface TimetableSlot {
  id: number;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: number;
  classId: number;
  classSection: string;
  departmentCode: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  facultyId: number;
  facultyName: string;
}

// ───────────────────────────── Attendance ─────────────────────────────

export interface AttendanceSubjectColumn {
  id: number;
  name: string;
  subjectCode: string;
}

export interface AttendanceRow {
  student: { id: number; rollNo: string | null; studentIdNo: string; name: string };
  subjectPercentages: Record<number, number | null>;
  overallPercentage: number | null;
  status: "Shortage" | "Adequate";
}

export interface ClassAttendance {
  classId: number;
  subjects: AttendanceSubjectColumn[];
  rows: AttendanceRow[];
}

// ───────────────────────────── Course Progress ─────────────────────────────

export interface LessonPlanSession {
  id: number;
  sequenceNo: number;
  unitTitle: string | null;
  topic: string;
  isCovered: boolean;
  sessionDate: string;
}

export interface CourseProgress {
  id: number;
  subjectCode: string;
  subjectName: string;
  classId: number;
  batchId: number;
  departmentId: number;
  classLabel: string;
  facultyName: string;
  semester: number;
  sessions: LessonPlanSession[];
  totalSessions: number;
  coveredSessions: number;
  percentComplete: number | null;
}

// ───────────────────────────── Results ─────────────────────────────

export interface ResultsSubject {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  passPercentage: number | null;
}

export interface ResultsRow {
  student: { id: number; rollNo: string | null; name: string };
  cgpa: number | null;
  backlogs: number;
  standing: "Top performer" | "At risk" | "On track" | "No results yet";
}

export interface ClassResults {
  classId: number;
  passPercentage: number | null;
  classAverage: number | null;
  highestMark: number | null;
  lowestMark: number | null;
  studentsWithBacklogs: number;
  subjects: ResultsSubject[];
  rows: ResultsRow[];
}

// ───────────────────────────── Academic Audit ─────────────────────────────

export type AuditStatus = "Completed" | "Pending" | "Overdue" | "Not started";

export interface AuditMilestone {
  label: string;
  status: AuditStatus;
}

export interface DepartmentAudit {
  departmentId: number;
  semester: number;
  batchId: number;
  percentComplete: number;
  milestones: AuditMilestone[];
}

// ───────────────────────────── Subjects (reference UI calls these "Courses") ─────────────────────────────

export type SubjectCourseType = "THEORY" | "PRACTICAL" | "THEORY_WITH_PRACTICAL" | "PROJECT" | "MANDATORY" | "AUDIT";
export type SubjectCategory = "CORE" | "ELECTIVE" | "OPEN_ELECTIVE" | "MANDATORY" | "VALUE_ADDED";

export const SUBJECT_COURSE_TYPE_LABELS: Record<SubjectCourseType, string> = {
  THEORY: "Theory",
  PRACTICAL: "Practical",
  THEORY_WITH_PRACTICAL: "Theory with Practical",
  PROJECT: "Project",
  MANDATORY: "Mandatory",
  AUDIT: "Audit",
};

export const SUBJECT_CATEGORY_LABELS: Record<SubjectCategory, string> = {
  CORE: "Core",
  ELECTIVE: "Elective",
  OPEN_ELECTIVE: "Open Elective",
  MANDATORY: "Mandatory",
  VALUE_ADDED: "Value Added",
};

export interface Subject {
  id: number;
  name: string;
  subjectCode: string;
  departmentId: number | null;
  credits: number | null;
  shortCode: string | null;
  courseType: SubjectCourseType | null;
  category: SubjectCategory | null;
  hours: number | null;
  semester: number | null;
  createdAt: string;
}

export interface CreateSubjectInput {
  name: string;
  subject_code: string;
  department_id?: number;
  credits?: number;
  short_code?: string;
  course_type?: SubjectCourseType;
  category?: SubjectCategory;
  hours?: number;
  semester?: number;
}
export type UpdateSubjectInput = Partial<CreateSubjectInput>;

export type CalendarEventType = "holiday" | "event";

export interface CalendarEventItem {
  id: number;
  academicCalendarId: number;
  eventDate: string;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  startTime: string | null;
  endTime: string | null;
}

export interface CreateCalendarEventInput {
  academic_calendar_id: number;
  title: string;
  description?: string;
  event_date: string;
  event_type: CalendarEventType;
  start_time: string;
  end_time: string;
}
export type UpdateCalendarEventInput = Partial<Omit<CreateCalendarEventInput, "academic_calendar_id">>;

// ───────────────────────────── Map (Course Mapping) ─────────────────────────────

export interface MappingSubject {
  id: number;
  subjectCode: string;
  shortCode: string | null;
  name: string;
  courseType: SubjectCourseType | null;
  category: SubjectCategory | null;
  credits: number | null;
  departmentId: number | null;
}

export interface MappedSubject extends MappingSubject {
  mappedClasses: number;
}

export interface MappingSemesterBucket {
  semester: number;
  totalClasses: number;
  mapped: MappedSubject[];
}

export interface DepartmentMapping {
  departmentId: number;
  semesters: MappingSemesterBucket[];
  pool: MappingSubject[];
}
