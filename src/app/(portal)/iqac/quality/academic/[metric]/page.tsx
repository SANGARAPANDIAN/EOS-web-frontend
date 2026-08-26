import { notFound } from "next/navigation";

/**
 * Every Academic Quality metric now has its own literal-folder page
 * (attendance/results/cgpa/course-attainment/program-attainment), each of
 * which Next.js matches before this dynamic route — so this file only ever
 * receives a metric key that isn't one of the 5 real ones.
 */
export default function AcademicQualityMetricPage() {
  return notFound();
}
