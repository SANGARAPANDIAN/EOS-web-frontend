"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { QUALITY_DOMAINS } from "@/modules/iqac/qualityDomains";
import { EmptyRecordsPage } from "@/modules/iqac/components/EmptyRecordsPage";

const DOMAIN = QUALITY_DOMAINS.find((d) => d.key === "student")!;
const MIGRATION_FILE = "EOSbackend1/prisma/migrations/iqac_student_development_gaps.sql";

// Certifications/Competitions/Hackathons now have real dedicated pages
// (student_certificates/student_competitions/student_hackathon_participations
// are real tables) — nothing left in this domain needs the empty-state stub.
const CONFIG: Record<string, { columns: string[]; reason: string }> = {};

export default function StudentDevelopmentMetricPage() {
  const params = useParams<{ metric: string }>();
  const metric = DOMAIN.metrics.find((m) => m.key === params.metric);
  const config = metric ? CONFIG[metric.key] : undefined;
  if (!metric || !config) return notFound();

  return (
    <EmptyRecordsPage
      crumb={`IQAC · ${DOMAIN.label} · ${metric.label}`}
      name={metric.label}
      blurb={`${DOMAIN.label} · student achievement tracking — the proposed table below would make this real.`}
      columns={config.columns}
      reason={config.reason}
      migrationFile={MIGRATION_FILE}
    />
  );
}
