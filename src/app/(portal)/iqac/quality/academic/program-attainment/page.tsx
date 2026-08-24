"use client";

import { useState } from "react";
import { OutcomesPage } from "@/modules/iqac/components/academic/OutcomesPage";
import { useProgramAttainment, useExamFilters } from "@/modules/iqac/api/academicQuality";

export default function ProgramAttainmentPage() {
  const [batchId, setBatchId] = useState<number | null>(null);
  const attainment = useProgramAttainment(null, batchId);
  const filters = useExamFilters();

  return (
    <OutcomesPage
      crumb="IQAC · Academic Quality · Program attainment"
      name="Program attainment"
      blurb="Programme outcome attainment on the 3-point NBA scale — real program_outcomes/outcome_attainments data."
      attainment={attainment.data}
      isLoading={attainment.isLoading}
      showSubjectColumn={false}
      batchId={batchId}
      onBatchChange={setBatchId}
      batchOptions={filters.data?.batches ?? []}
    />
  );
}
