import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import { ApiError } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

// Mirrors modules/hod/api/examinations.ts exactly, pointed at
// /me/advisor-examinations/* instead of /hod/examinations/* — same grid,
// scoped server-side to the advisor's own mentee class(es) (class_mentors)
// instead of a whole department. Replaces the old subject-records-based
// Examination & Results screen, which could only show subjects the advisor
// personally taught — see AdvisorExaminationsService's own doc comment for
// why a real class-wide endpoint needed to exist before this could work.

export interface AdvisorExaminationClass {
  class_id: number;
  batch_id: number | null;
  batch_label: string;
  department: { id: number; name: string; code: string } | null;
  semester: number;
  year_label: string;
  section: string;
}

export interface AdvisorExaminationFilters {
  classes: AdvisorExaminationClass[];
  exam_types: { id: number; name: string; category: string }[];
}

/** GET /me/advisor-examinations/filters */
export function useAdvisorExaminationFilters() {
  return useQuery({
    queryKey: ["advisor", "examinations", "filters"],
    queryFn: () => apiClient.get<AdvisorExaminationFilters>("/me/advisor-examinations/filters"),
  });
}

export interface AdvisorExaminationSubject {
  id: number;
  code: string;
  name: string;
}

export interface AdvisorExaminationRow {
  student_id: number;
  register_no: string;
  name: string | null;
  marks: (number | null)[];
  /** Only populated for external/university exam types — letter grade per subject, replacing raw marks in the UI. */
  grades: (string | null)[] | null;
  average_percent: number | null;
}

export interface AdvisorExaminationGrid {
  department: { id: number; name: string; code: string };
  class: { id: number; section: string; semester: number; year_label: string; batch_label: string };
  exam_type: { id: number; name: string; category: string };
  candidates: number;
  papers: number;
  subjects: AdvisorExaminationSubject[];
  rows: AdvisorExaminationRow[];
}

/** GET /me/advisor-examinations/grid?class_id=&exam_type_id= */
export function useAdvisorExaminationGrid(classId: number | null, examTypeId: number | null) {
  return useQuery({
    queryKey: ["advisor", "examinations", "grid", classId, examTypeId],
    queryFn: () =>
      apiClient.get<AdvisorExaminationGrid>("/me/advisor-examinations/grid", {
        class_id: classId ?? undefined,
        exam_type_id: examTypeId ?? undefined,
      }),
    enabled: classId !== null && examTypeId !== null,
  });
}

/**
 * The export endpoint returns a raw .xlsx (not the JSON envelope apiClient
 * expects), and a plain <a href> download wouldn't carry the Bearer token —
 * so this fetches it as a blob with the auth header attached, then triggers
 * a normal browser download from an in-memory object URL.
 */
export async function downloadAdvisorExaminationGrid(classId: number, examTypeId: number, filename: string): Promise<void> {
  const token = getToken();
  const url = new URL(`${API_BASE_URL}/me/advisor-examinations/grid/export`);
  url.searchParams.set("class_id", String(classId));
  url.searchParams.set("exam_type_id", String(examTypeId));

  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body ?? {
        success: false,
        statusCode: res.status,
        errorCode: "UNKNOWN_ERROR",
        message: "Could not download the results.",
        timestamp: new Date().toISOString(),
        path: "",
      },
    );
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
