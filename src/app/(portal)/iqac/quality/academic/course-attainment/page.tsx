"use client";

import { useState } from "react";
import { OutcomesPage } from "@/modules/iqac/components/academic/OutcomesPage";
import { useCourseAttainment, useExamFilters } from "@/modules/iqac/api/academicQuality";

export default function CourseAttainmentPage() {
  const [batchId, setBatchId] = useState<number | null>(null);
  const attainment = useCourseAttainment(null, batchId);
  const filters = useExamFilters();

  return (
    <OutcomesPage
      crumb="IQAC · Academic Quality · Course attainment"
      name="Course attainment"
      blurb="Course outcome attainment on the 3-point NBA scale — real course_outcomes/outcome_attainments data."
      attainment={attainment.data}
      isLoading={attainment.isLoading}
      showSubjectColumn
      batchId={batchId}
      onBatchChange={setBatchId}
      batchOptions={filters.data?.batches ?? []}
    />
  );
}
