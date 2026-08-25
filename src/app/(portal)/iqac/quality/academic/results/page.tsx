"use client";

import { ResultsPage } from "@/modules/iqac/components/academic/ResultsPage";

/**
 * Literal-folder route for the real Results metric — restores what the
 * academic `[metric]` dispatcher lost when it was reduced to an
 * unconditional notFound() (see that file's comment). ResultsPage itself
 * was already fully built (real /me/iqac/academic-quality/results data, one
 * exam at a time via the batch/semester/exam cascade) but had no route
 * rendering it.
 */
export default function AcademicResultsPage() {
  return <ResultsPage />;
}
