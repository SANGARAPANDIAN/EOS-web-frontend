"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { downloadCsv } from "@/lib/utils/csv";
import { friendlyError } from "@/lib/utils/errors";
import { ApiError } from "@/types/api";
import {
  PageHeader,
  Button,
  IconButton,
  Badge,
  type BadgeTone,
  KpiCard,
  DataTable,
  NumberedPagination,
  Dropdown,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useStudentReport,
  useStudentReportDownload,
  useUpdatePlacementStatus,
  useSetStudentCareerPath,
  type StudentReportRow,
  type CareerPath,
} from "@/modules/placement/api/studentReport";
import { useBatches } from "@/modules/placement/api/refData";
import { eligibilityLabel as sharedEligibilityLabel, careerPathLabel, rosterStatusLabel, yearLabel } from "@/modules/placement/lib/format";
import { generateStudentReportPdf } from "@/modules/placement/lib/student-report-pdf";
import {
  StudentFilters,
  DEFAULT_STUDENT_FILTERS,
  type StudentFiltersValue,
} from "@/modules/placement/components/students/StudentFilters";

const PAGE_SIZE = 10;

function statusTone(label: string): BadgeTone {
  if (label === "Placed") return "success";
  if (label === "Not placed") return "danger";
  if (label === "In process") return "warning";
  return "neutral";
}

const eligibilityLabel = sharedEligibilityLabel;

function eligibilityTone(label: string): BadgeTone {
  if (label === "Eligible") return "success";
  if (label === "Not eligible") return "danger";
  if (label === "Opted out") return "neutral";
  return "neutral";
}

const CAREER_PATH_OPTIONS: { value: CareerPath; label: string }[] = [
  { value: "placement", label: "Placement" },
  { value: "venture", label: "Venture" },
  { value: "higher_studies", label: "Higher Studies" },
];

function careerPathTone(path: CareerPath | null): BadgeTone {
  if (path === "placement") return "success";
  if (path === "venture" || path === "higher_studies") return "warning";
  return "neutral";
}

export default function StudentsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<StudentFiltersValue>(DEFAULT_STUDENT_FILTERS);
  const debouncedQuery = useDebouncedValue(filters.query);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const { data: batches } = useBatches();
  const { data, isLoading, error } = useStudentReport(filters.batchId === "all" ? undefined : filters.batchId);
  const { show } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const excelDownload = useStudentReportDownload();
  const updatePlacementStatus = useUpdatePlacementStatus();
  const setStudentCareerPath = useSetStudentCareerPath();

  const rows = useMemo(() => data ?? [], [data]);

  const departmentOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.departmentCode ?? r.departmentName).filter((n): n is string => !!n));
    return ["All departments", ...Array.from(names).sort()];
  }, [rows]);

  const yearOptions = useMemo(() => {
    const years = new Set(rows.map((r) => r.year).filter((y): y is number => y != null));
    return ["All years", ...Array.from(years).sort().map(yearLabel)];
  }, [rows]);

  const classOptions = useMemo(() => {
    const labels = new Set(rows.map((r) => r.classLabel).filter((c): c is string => !!c));
    return ["All classes", ...Array.from(labels).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery =
        !q ||
        (r.name ?? "").toLowerCase().includes(q) ||
        r.studentIdNo.toLowerCase().includes(q) ||
        (r.rollNo ?? "").toLowerCase().includes(q) ||
        (r.registerNo ?? "").toLowerCase().includes(q);
      const matchesDept = filters.department === "All departments" || r.departmentCode === filters.department || r.departmentName === filters.department;
      const matchesYear = filters.year === "All years" || yearLabel(r.year) === filters.year;
      const matchesStatus = filters.status === "All statuses" || rosterStatusLabel(r.status) === filters.status;
      const matchesClass = filters.classLabel === "All classes" || r.classLabel === filters.classLabel;
      return matchesQuery && matchesDept && matchesYear && matchesStatus && matchesClass;
    });
  }, [rows, debouncedQuery, filters.department, filters.year, filters.status, filters.classLabel]);

  const pageRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const total = rows.length;
  const placedCount = rows.filter((r) => r.status === "placed").length;
  const placedPct = total > 0 ? Math.round((placedCount / total) * 100) : 0;
  const departmentCount = new Set(rows.map((r) => r.departmentCode ?? r.departmentName).filter(Boolean)).size;
  const eligibleCount = rows.filter((r) => r.placementEligible === true).length;
  const assessedCount = rows.filter((r) => r.placementEligible !== null).length;
  const optedOutCount = rows.filter((r) => r.placementOptedOut).length;

  function setEligible(r: StudentReportRow, eligible: boolean) {
    updatePlacementStatus.mutate(
      { studentId: r.id, input: { placementEligible: eligible } },
      {
        onSuccess: () => show(eligible ? "Marked eligible." : "Marked not eligible.", "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function setOptedOut(r: StudentReportRow, optedOut: boolean) {
    updatePlacementStatus.mutate(
      { studentId: r.id, input: { placementOptedOut: optedOut } },
      {
        onSuccess: () => show(optedOut ? "Marked opted out." : "Cleared opt-out.", "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function setCareerPath(r: StudentReportRow, careerPath: CareerPath) {
    setStudentCareerPath.mutate(
      { studentId: r.id, careerPath },
      {
        onSuccess: () => show(`Marked as ${careerPathLabel(careerPath)}.`, "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function handleDownloadExcel() {
    excelDownload.mutate(
      { format: "excel", batchId: filters.batchId === "all" ? undefined : filters.batchId, classLabel: filters.classLabel === "All classes" ? undefined : filters.classLabel },
      { onError: (err: unknown) => show(friendlyError(err), "error") },
    );
  }

  // Built entirely client-side from `filtered` (the exact rows the table is
  // showing) instead of a round trip to the backend's PDFKit renderer —
  // that renderer drew every row at a fixed height with no wrap-aware
  // sizing, so a long department name overlapped into the next row.
  async function handleDownloadPdf() {
    setIsGeneratingPdf(true);
    try {
      await generateStudentReportPdf(filtered, {
        batchLabel: filters.batchId === "all" ? undefined : batches?.find((b) => b.id === filters.batchId)?.name,
        classLabel: filters.classLabel === "All classes" ? undefined : filters.classLabel,
      });
    } catch (err: unknown) {
      show(friendlyError(err), "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function handleExportCsv() {
    downloadCsv(
      "students.csv",
      [
        { header: "Register number", value: (r: StudentReportRow) => r.registerNo ?? r.rollNo ?? r.studentIdNo },
        { header: "Student", value: (r: StudentReportRow) => r.name ?? r.studentIdNo },
        { header: "Department", value: (r: StudentReportRow) => r.departmentCode ?? r.departmentName ?? "" },
        { header: "Year", value: (r: StudentReportRow) => yearLabel(r.year) },
        { header: "Eligibility", value: (r: StudentReportRow) => eligibilityLabel(r) },
        { header: "Applied", value: (r: StudentReportRow) => r.drivesApplied },
        { header: "Offers", value: (r: StudentReportRow) => r.offersCount },
        { header: "Status", value: (r: StudentReportRow) => rosterStatusLabel(r.status) },
      ],
      filtered,
    );
  }

  const columns: DataTableColumn<StudentReportRow>[] = [
    { key: "reg", header: "Register number", mono: true, render: (r) => r.registerNo ?? r.rollNo ?? r.studentIdNo },
    {
      key: "name",
      header: "Student",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-ink">{r.name ?? r.studentIdNo}</p>
          {r.classLabel && <p className="text-xs text-admin-muted">{r.classLabel}</p>}
        </div>
      ),
    },
    { key: "dept", header: "Department", render: (r) => r.departmentCode ?? r.departmentName ?? "—" },
    { key: "year", header: "Year", render: (r) => yearLabel(r.year) },
    {
      key: "eligibility",
      header: "Eligibility",
      render: (r) => {
        const label = eligibilityLabel(r);
        return <Badge tone={eligibilityTone(label)}>{label}</Badge>;
      },
    },
    {
      key: "careerPath",
      header: "Career path",
      render: (r) => <Badge tone={careerPathTone(r.careerPath)}>{careerPathLabel(r.careerPath)}</Badge>,
    },
    { key: "apps", header: "Applied", mono: true, render: (r) => r.drivesApplied },
    { key: "offers", header: "Offers", mono: true, render: (r) => r.offersCount },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const label = rosterStatusLabel(r.status);
        return <Badge tone={statusTone(label)}>{label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={<IconButton icon="more_vert" size={34} iconSize={17} />}
            items={[
              r.placementEligible === true
                ? { key: "not-eligible", label: "Mark not eligible", onSelect: () => setEligible(r, false) }
                : { key: "eligible", label: "Mark eligible", onSelect: () => setEligible(r, true) },
              r.placementOptedOut
                ? { key: "clear-opt-out", label: "Clear opt-out", onSelect: () => setOptedOut(r, false) }
                : { key: "opt-out", label: "Mark opted out", onSelect: () => setOptedOut(r, true) },
              ...CAREER_PATH_OPTIONS.filter((o) => o.value !== r.careerPath).map((o) => ({
                key: `career-path-${o.value}`,
                label: `Mark as ${o.label}`,
                onSelect: () => setCareerPath(r, o.value),
              })),
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Students"
        description={`Application history and placement status across ${total.toLocaleString()} registered students.`}
        actions={
          <>
            <Button variant="secondary" onClick={handleExportCsv}>
              <Icon name="csv" size={16} /> CSV
            </Button>
            <Button variant="secondary" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
              <Icon name="picture_as_pdf" size={16} /> {isGeneratingPdf ? "Exporting…" : "Export PDF"}
            </Button>
            <Button variant="secondary" onClick={handleDownloadExcel} disabled={excelDownload.isPending}>
              <Icon name="table" size={16} /> {excelDownload.isPending ? "Exporting…" : "Export Excel"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Registered students" icon="groups" value={total} sub={`Across ${departmentCount} departments`} />
        <KpiCard
          label="Eligible this cycle"
          icon="verified"
          value={eligibleCount}
          sub={assessedCount > 0 ? `${assessedCount} of ${total.toLocaleString()} assessed so far` : "Mark students eligible from the table below"}
        />
        <KpiCard label="Placed" icon="workspace_premium" value={placedCount} delta={`${placedPct}%`} sub={`of ${total.toLocaleString()} registered`} progress={placedPct} />
        <KpiCard
          label="Opted out"
          icon="remove_circle"
          value={optedOutCount}
          sub={optedOutCount > 0 ? `${optedOutCount} of ${total.toLocaleString()} registered` : "None recorded yet"}
        />
      </div>

      <StudentFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        batches={batches}
        departmentOptions={departmentOptions}
        yearOptions={yearOptions}
        classOptions={classOptions}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/placement/students/${r.id}`)}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load student report." : null}
        emptyTitle="No students match these filters"
        footer={
          <NumberedPagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      />
    </div>
  );
}
