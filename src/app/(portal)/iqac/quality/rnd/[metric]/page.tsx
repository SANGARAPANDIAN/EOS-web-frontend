"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { QUALITY_DOMAINS } from "@/modules/iqac/qualityDomains";
import { EmptyRecordsPage } from "@/modules/iqac/components/EmptyRecordsPage";

const DOMAIN = QUALITY_DOMAINS.find((d) => d.key === "rnd")!;
const MIGRATION_FILE = "EOSbackend1/research_development_rename.query.md";

// Publications/Research/Patents all have real dedicated pages — this only
// ever serves an as-yet-unbuilt metric under this domain, same as every
// sibling domain's own [metric] catch-all.
const CONFIG: Record<string, { columns: string[]; reason: string }> = {};

export default function ResearchDevelopmentMetricPage() {
  const params = useParams<{ metric: string }>();
  const metric = DOMAIN.metrics.find((m) => m.key === params.metric);
  const config = metric ? CONFIG[metric.key] : undefined;
  if (!metric || !config) return notFound();

  return (
    <EmptyRecordsPage
      crumb={`IQAC · ${DOMAIN.label} · ${metric.label}`}
      name={metric.label}
      blurb={`${DOMAIN.label} — the proposed table below would make this real.`}
      columns={config.columns}
      reason={config.reason}
      migrationFile={MIGRATION_FILE}
    />
  );
}
