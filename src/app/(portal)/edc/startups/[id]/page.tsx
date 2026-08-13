"use client";

import { useParams } from "next/navigation";
import { useEdcEntrepreneurship } from "@/modules/edc/api/entrepreneurship";
import { EdcVentureDetail } from "@/modules/edc/EdcVentureDetail";

// Real data — same source as EDC Students (GET /me/edc-entrepreneurship,
// no separate ventures table exists), id is the real student_entrepreneurship.id.
export default function EdcVenturePage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useEdcEntrepreneurship();
  const row = data?.find((r) => r.id === Number(params.id));

  if (isLoading) return <div style={{ padding: 60, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>Loading…</div>;
  if (!row) return <div style={{ padding: 60, textAlign: "center", color: "#94A3B8", fontWeight: 600 }}>Not found.</div>;

  return <EdcVentureDetail row={row} backHref="/edc/startups" backLabel="All startups" />;
}
