import { toPercentage, gradeOf } from "@/lib/utils/marks";

export interface ExamMarkExamType {
  name: string;
  category: "internal" | "external";
  code: string | null;
}

export interface ExamMarkRecord {
  id: number;
  marks_obtained: string | null;
  max_marks: string;
  exam_subject_mapping: {
    id: number;
    exam_id: number;
    subject_id: number;
    is_published: boolean;
    published_at: string | null;
    exams: {
      id: number;
      academic_year: string;
      semester: number;
      exam_types: ExamMarkExamType | null;
    };
    subjects: { id: number; name: string; subject_code: string };
  };
}

export interface SubjectMarkCell {
  obtained: number | null;
  max: number | null;
  percentage: number | null;
  isPublished: boolean;
}

export interface SubjectMarksColumn {
  code: string;
  label: string;
}

export interface SubjectMarksRow {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  cells: Record<string, SubjectMarkCell>;
  endSemGrade: string | null;
  endSemPublished: boolean;
}

// Preferred left-to-right order for internal exam types; anything unrecognised
// (a future exam_type not seeded when this was written) sorts after these,
// alphabetically, rather than being dropped.
const COLUMN_ORDER = ["CIA1", "CIA2", "QUIZ", "CIA3"];
// "Internal" is CIA3's display label per the requested "CIA 1 | CIA 2 | Quiz |
// Internal | End Sem" column set — there is no exam_type literally named
// "Internal" in the seed data.
const COLUMN_LABEL: Record<string, string> = { CIA1: "CIA 1", CIA2: "CIA 2", QUIZ: "Quiz", CIA3: "Internal" };

function columnCodeOf(examType: ExamMarkExamType): string {
  return examType.code ?? examType.name.toUpperCase().replace(/\s+/g, "_");
}

/**
 * Pivots flat exam_marks rows (one row per subject x exam-type) into one row
 * per subject with a column per internal exam type, plus a single always-
 * present "End Sem" grade-only column — the shared shape every role's
 * SubjectMarksTable renders identically. End Sem never shows raw marks, and
 * only shows a grade once COE has published the university exam mapping.
 */
export function buildSubjectMarksRows(
  records: ExamMarkRecord[],
  semester: number | null,
): { columns: SubjectMarksColumn[]; rows: SubjectMarksRow[] } {
  const inSemester = semester == null ? records : records.filter((r) => r.exam_subject_mapping.exams.semester === semester);

  const columnCodes = new Set<string>();
  const bySubject = new Map<number, SubjectMarksRow>();

  for (const r of inSemester) {
    const mapping = r.exam_subject_mapping;
    const examType = mapping.exams.exam_types;
    if (!examType) continue;

    const subjectId = mapping.subjects.id;
    let row = bySubject.get(subjectId);
    if (!row) {
      row = {
        subjectId,
        subjectCode: mapping.subjects.subject_code,
        subjectName: mapping.subjects.name,
        cells: {},
        endSemGrade: null,
        endSemPublished: false,
      };
      bySubject.set(subjectId, row);
    }

    const obtained = r.marks_obtained != null ? Number(r.marks_obtained) : null;
    const max = r.max_marks != null ? Number(r.max_marks) : null;
    const percentage = toPercentage(obtained, max);

    if (examType.category === "external") {
      row.endSemPublished = mapping.is_published;
      row.endSemGrade = mapping.is_published ? gradeOf(percentage) : null;
      continue;
    }

    const code = columnCodeOf(examType);
    columnCodes.add(code);
    row.cells[code] = { obtained, max, percentage, isPublished: mapping.is_published };
  }

  const columns: SubjectMarksColumn[] = Array.from(columnCodes)
    .sort((a, b) => {
      const ai = COLUMN_ORDER.indexOf(a);
      const bi = COLUMN_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map((code) => ({ code, label: COLUMN_LABEL[code] ?? code }));

  const rows = Array.from(bySubject.values()).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));

  return { columns, rows };
}
