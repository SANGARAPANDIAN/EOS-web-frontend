"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { QUALITY_DOMAINS } from "@/modules/iqac/qualityDomains";
import { EmptyChecklistPage } from "@/modules/iqac/components/EmptyChecklistPage";

const DOMAIN = QUALITY_DOMAINS.find((d) => d.key === "accreditation")!;
const MIGRATION_FILE = "EOSbackend1/prisma/migrations/iqac_accreditation_gaps.sql";

// NAAC/AQAR/SSR/NBA progress all now have real dedicated pages
// (iqac_accreditation_criteria/evidence_items for NAAC/AQAR/SSR;
// nba_criteria/nba_evidence_items, already real, for NBA) — nothing left
// in this domain needs the empty-checklist stub.
const REASONS: Record<string, string> = {};

export default function AccreditationMetricPage() {
  const params = useParams<{ metric: string }>();
  const metric = DOMAIN.metrics.find((m) => m.key === params.metric);
  if (!metric) return notFound();

  return (
    <EmptyChecklistPage
      crumb={`IQAC · ${DOMAIN.label} · ${metric.label}`}
      name={metric.label}
      blurb={`${DOMAIN.label} · criterion and evidence tracking — the proposed table below would make this real.`}
      reason={REASONS[metric.key] ?? "Not computable from current data."}
      migrationFile={MIGRATION_FILE}
    />
  );
}
