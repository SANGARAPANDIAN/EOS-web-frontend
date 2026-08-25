"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { QUALITY_DOMAINS } from "@/modules/iqac/qualityDomains";
import { EmptyRecordsPage } from "@/modules/iqac/components/EmptyRecordsPage";

const DOMAIN = QUALITY_DOMAINS.find((d) => d.key === "faculty")!;
const MIGRATION_FILE = "EOSbackend1/prisma/migrations/iqac_faculty_development_gaps.sql";

// FDP/STTP/Research/Patents/Certifications now all have real dedicated pages
// (faculty_development_programs/faculty_research_projects+members/
// faculty_patents+inventors/faculty_certifications are real tables).
const CONFIG: Record<string, { columns: string[]; reason: string }> = {};

export default function FacultyDevelopmentMetricPage() {
  const params = useParams<{ metric: string }>();
  const metric = DOMAIN.metrics.find((m) => m.key === params.metric);
  const config = metric ? CONFIG[metric.key] : undefined;
  if (!metric || !config) return notFound();

  return (
    <EmptyRecordsPage
      crumb={`IQAC · ${DOMAIN.label} · ${metric.label}`}
      name={metric.label}
      blurb={`${DOMAIN.label} · faculty capability tracking — the proposed table below would make this real.`}
      columns={config.columns}
      reason={config.reason}
      migrationFile={MIGRATION_FILE}
    />
  );
}
