"use client";

import { GradeDistributionPage } from "@/modules/iqac/components/academic/GradeDistributionPage";

/**
 * Literal-folder route for the "CGPA" metric slot — restores what the
 * academic `[metric]` dispatcher lost when it was reduced to an
 * unconditional notFound() (see that file's comment). A composite CGPA
 * isn't computable (see GradeDistributionPage's own doc comment); this
 * renders the real grade-band distribution it shows instead, same as
 * before it lost its route.
 */
export default function AcademicCgpaPage() {
  return <GradeDistributionPage />;
}
