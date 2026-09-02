import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import { ApiError } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export interface HodExaminationClass {
  class_id: number;
  batch_id: number;
  semester: number;
  year_label: string;
  section: string;
}

export interface HodExaminationFilters {
  department: { id: number; name: string; code: string };
  batches: { id: number; label: string }[];
  classes: HodExaminationClass[];
  exam_types: { id: number; name: string; category: string }[];
}

/** GET /hod/examinations/filters */
export function useHodExaminationFilters() {
  return useQuery({
    queryKey: ["hod", "examinations", "filters"],
    queryFn: () => apiClient.get<HodExaminationFilters>("/hod/examinations/filters"),
  });
}

export interface HodExaminationSubject {
  id: number;
  code: string;
  name: string;
}

export interface HodExaminationRow {
  student_id: number;
  register_no: string;
  name: string | null;
  marks: (number | null)[];
  /** Only populated for external/university exam types — letter grade per subject, replacing raw marks in the UI. */
  grades: (string | null)[] | null;
  average_percent: number | null;
}

export interface HodExaminationGrid {
  department: { id: number; name: string; code: string };
  class: { id: number; section: string; semester: number; year_label: string; batch_label: string };
  exam_type: { id: number; name: string; category: string };
  candidates: number;
  papers: number;
  subjects: HodExaminationSubject[];
  rows: HodExaminationRow[];
}

/** GET /hod/examinations/grid?class_id=&exam_type_id= */
export function useHodExaminationGrid(classId: number | null, examTypeId: number | null) {
  return useQuery({
    queryKey: ["hod", "examinations", "grid", classId, examTypeId],
    queryFn: () =>
      apiClient.get<HodExaminationGrid>("/hod/examinations/grid", {
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
export async function downloadHodExaminationGrid(
  classId: number,
  examTypeId: number,
  filename: string,
): Promise<void> {
  const token = getToken();
  const url = new URL(`${API_BASE_URL}/hod/examinations/grid/export`);
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
