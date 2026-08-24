"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { MetricBackNav, MetricHeader, MetricCards, DepartmentRollup, MetricFilterBar } from "@/modules/iqac/components/academic/MetricPageChrome";
import { AddPublicationEntryModal } from "@/modules/iqac/components/facultyDevelopment/AddPublicationEntryModal";
import {
  useLeadingPublicationVenues,
  usePublicationDepartments,
  usePublicationsQuality,
  useIndexingOptions,
  type PublicationVenueRow,
} from "@/modules/iqac/api/facultyDevelopment";

const CITATION_BUCKETS = [
  { value: "all", label: "All citations" },
  { value: "0", label: "No citations yet" },
  { value: "1to10", label: "1–10 citations" },
  { value: "above10", label: "Above 10 citations" },
];

function inCitationBucket(citations: number, bucket: string): boolean {
  if (bucket === "all") return true;
  if (bucket === "0") return citations === 0;
  if (bucket === "1to10") return citations >= 1 && citations <= 10;
  return citations > 10;
}

export default function PublicationsPage() {
  const router = useRouter();
  const [addingEntry, setAddingEntry] = useState(false);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [indexing, setIndexing] = useState("all");
  const [citationBucket, setCitationBucket] = useState("all");
  const [sort, setSort] = useState("all");

  const venues = useLeadingPublicationVenues(indexing !== "all" ? indexing : undefined);
  const departments = usePublicationDepartments();
  const quality = usePublicationsQuality();
  const indexingOptions = useIndexingOptions();

  const allVenues = useMemo(() => venues.data ?? [], [venues.data]);

  const maxPapersByDept = useMemo(() => Math.max(1, ...(departments.data ?? []).map((d) => d.papers)), [departments.data]);
  const rollupItems = (departments.data ?? []).map((d) => ({
    code: d.department.code,
    value: String(d.papers),
    pct: Math.round((d.papers / maxPapersByDept) * 100),
  }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVenues.filter((v) => {
      const okQ = !q || v.venue.toLowerCase().includes(q);
      const okD = dept == null || v.department_codes.includes(dept);
      const okC = inCitationBucket(v.citations, citationBucket);
      return okQ && okD && okC;
    });
  }, [allVenues, search, dept, citationBucket]);

  const ordered = useMemo(() => {
    const rows = [...filtered];
    if (sort === "papers") rows.sort((a, b) => b.papers - a.papers);
    if (sort === "citations") rows.sort((a, b) => b.citations - a.citations);
    return rows;
  }, [filtered, sort]);

  const totalPapers = allVenues.reduce((sum, v) => sum + v.papers, 0);
  const totalCitations = allVenues.reduce((sum, v) => sum + v.citations, 0);

  const columns = useMemo<DataTableColumn<PublicationVenueRow>[]>(
    () => [
      { key: "venue", header: "Journal / Venue", width: "1.8fr", sortValue: (r) => r.venue, render: (r) => <span className="font-bold text-ink">{r.venue}</span> },
      { key: "papers", header: "Papers", align: "right", sortValue: (r) => r.papers, render: (r) => r.papers },
      { key: "citations", header: "Citations", align: "right", sortValue: (r) => r.citations, render: (r) => r.citations },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <MetricBackNav crumb="IQAC · Faculty Development · Publications" />
      <MetricHeader
        name="Publications"
        blurb="Scopus and peer-reviewed publications authored by faculty — real faculty_publications data."
        addLabel="+ Add faculty entry"
        onAdd={() => setAddingEntry(true)}
      />

      {addingEntry && <AddPublicationEntryModal onClose={() => setAddingEntry(false)} onCreated={() => venues.refetch()} />}

      <MetricCards
        cards={[
          { label: "This year", value: quality.data?.this_year ?? "—", foot: "institution level, all departments" },
          { label: "Last year", value: quality.data?.last_year ?? "—", foot: "prior calendar year" },
          { label: "Target", value: quality.data?.target ?? "—", foot: quality.data?.target != null ? "approved by the IQAC for this AY" : "not yet set by IQAC for this AY" },
          {
            label: "Attainment",
            value: quality.data?.attainment != null ? `${quality.data.attainment}%` : "—",
            foot: "requires a target to compute",
            hasBar: quality.data?.attainment != null,
            barPct: quality.data?.attainment ?? 0,
          },
        ]}
      />

      <MetricFilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search publications by journal / venue, indexing or citations"
        selects={[
          {
            label: "DEPARTMENT",
            value: dept ?? "all",
            onChange: (v) => setDept(v === "all" ? null : v),
            options: [{ value: "all", label: "All departments" }, ...rollupItems.map((d) => ({ value: d.code, label: d.code }))],
          },
          {
            label: "INDEXING",
            value: indexing,
            onChange: setIndexing,
            options: [{ value: "all", label: "All indexing" }, ...(indexingOptions.data ?? []).map((i) => ({ value: i, label: i }))],
          },
          {
            label: "CITATIONS",
            value: citationBucket,
            onChange: setCitationBucket,
            options: CITATION_BUCKETS,
          },
          {
            label: "SORT BY",
            value: sort,
            onChange: setSort,
            options: [
              { value: "all", label: "Default order" },
              { value: "papers", label: "Most papers" },
              { value: "citations", label: "Most citations" },
            ],
          },
        ]}
        countLabel={`${dept ?? "All departments"} · showing ${ordered.length} of ${allVenues.length} venues`}
        onClear={() => {
          setSearch("");
          setDept(null);
          setIndexing("all");
          setCitationBucket("all");
          setSort("all");
        }}
      />

      <DepartmentRollup items={rollupItems} selected={dept} onSelect={setDept} footLabel="papers on file" />

      <DataTable
        title="Leading venues"
        columns={columns}
        data={ordered}
        rowKey={(r) => r.venue}
        loading={venues.isLoading}
        emptyMessage="No publications found."
        onRowClick={(r) => router.push(`/iqac/quality/faculty/publications/${encodeURIComponent(r.venue)}`)}
      />
    </div>
  );
}
