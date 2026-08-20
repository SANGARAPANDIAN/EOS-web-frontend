"use client";

import { useMemo, useState } from "react";
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
import { useOffers, type Offer } from "@/modules/placement/api/offers";
import { useUpdateOfferResponse } from "@/modules/placement/api/applications";
import { offerResponseLabel, lpa, dateLabel } from "@/modules/placement/lib/format";
import { OfferFilters, type OfferFiltersValue, DEFAULT_OFFER_FILTERS } from "@/modules/placement/components/offers/OfferFilters";
import { UpdateOfferModal } from "@/modules/placement/components/offers/UpdateOfferModal";

const PAGE_SIZE = 10;

function statusTone(label: string): BadgeTone {
  if (label === "Accepted") return "success";
  if (label === "Declined") return "danger";
  return "warning";
}

export default function OffersPage() {
  const [filters, setFilters] = useState<OfferFiltersValue>(DEFAULT_OFFER_FILTERS);
  const debouncedQuery = useDebouncedValue(filters.query);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [updateTarget, setUpdateTarget] = useState<Offer | null>(null);

  const { data, isLoading, error } = useOffers();
  const { show } = useToast();
  const updateOfferResponse = useUpdateOfferResponse();

  const rows = useMemo(() => data ?? [], [data]);

  const departmentOptions = useMemo(() => {
    const codes = new Set(rows.map((r) => r.departmentCode).filter((c): c is string => !!c));
    return ["All departments", ...Array.from(codes).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q || (r.studentName ?? r.studentIdNo).toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
      const matchesStatus = filters.status === "All statuses" || offerResponseLabel(r.offerResponse) === filters.status;
      const matchesDept = filters.department === "All departments" || r.departmentCode === filters.department;
      return matchesQuery && matchesStatus && matchesDept;
    });
  }, [rows, debouncedQuery, filters.status, filters.department]);

  const pageRows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const total = rows.length;
  const accepted = rows.filter((r) => r.offerResponse === "accepted").length;
  const declined = rows.filter((r) => r.offerResponse === "declined").length;
  const pending = total - accepted - declined;
  const acceptedPct = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

  function handleExport() {
    downloadCsv(
      "offers.csv",
      [
        { header: "Student", value: (r: Offer) => r.studentName ?? r.studentIdNo },
        { header: "Register number", value: (r: Offer) => r.registerNo ?? r.rollNo ?? r.studentIdNo },
        { header: "Company", value: (r: Offer) => r.companyName },
        { header: "Role", value: (r: Offer) => r.jobRole ?? "" },
        { header: "CTC", value: (r: Offer) => lpa(r.offeredPackageLpa ?? r.packageLpa) },
        { header: "Released", value: (r: Offer) => dateLabel(r.releasedAt) },
        { header: "Status", value: (r: Offer) => offerResponseLabel(r.offerResponse) },
      ],
      filtered,
    );
  }

  function quickSetResponse(offer: Offer, response: "accepted" | "declined") {
    updateOfferResponse.mutate(
      { driveId: offer.driveId, studentId: offer.studentId, offerResponse: response },
      {
        onSuccess: () => show(response === "accepted" ? "Offer marked accepted." : "Offer marked declined.", "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  const columns: DataTableColumn<Offer>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div>
          <p className="font-semibold text-admin-ink">{r.studentName ?? r.studentIdNo}</p>
          <p className="text-xs text-admin-muted">{r.registerNo ?? r.rollNo ?? r.studentIdNo}</p>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (r) => (
        <div>
          <p className="text-admin-body">{r.companyName}</p>
          {r.jobRole && <p className="text-xs text-admin-muted">{r.jobRole}</p>}
        </div>
      ),
    },
    { key: "ctc", header: "CTC", mono: true, render: (r) => lpa(r.offeredPackageLpa ?? r.packageLpa) },
    { key: "released", header: "Released", render: (r) => dateLabel(r.releasedAt) },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const label = offerResponseLabel(r.offerResponse);
        return <Badge tone={statusTone(label)}>{label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="primary" onClick={() => setUpdateTarget(r)}>
            Update
          </Button>
          <Dropdown
            trigger={<IconButton icon="more_vert" size={34} iconSize={17} />}
            items={[
              { key: "accept", label: "Mark accepted", onSelect: () => quickSetResponse(r, "accepted"), disabled: r.offerResponse === "accepted" },
              { key: "decline", label: "Mark declined", onSelect: () => quickSetResponse(r, "declined"), disabled: r.offerResponse === "declined" },
              { key: "letter", label: "Offer letter", onSelect: () => show("No offer letter uploaded yet.", "error") },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Offers"
        description="Offer letters released, accepted and declined this cycle."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Icon name="download" size={16} /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Offers released" icon="workspace_premium" value={total} sub="Including multiple offers per student" />
        <KpiCard label="Accepted" icon="check_circle" value={accepted} delta={`${acceptedPct}%`} sub="acceptance" progress={acceptedPct} />
        <KpiCard label="Pending response" icon="hourglass_empty" value={pending} delta={`${pendingPct}%`} sub="of offers" progress={pendingPct} />
        <KpiCard label="Declined" icon="cancel" value={declined} sub={`${total > 0 ? Math.round((declined / total) * 100) : 0}% of offers`} />
      </div>

      <OfferFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        departmentOptions={departmentOptions}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        error={error instanceof ApiError ? error.message : error ? "Failed to load offers." : null}
        emptyTitle="No offers match these filters"
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

      <UpdateOfferModal open={updateTarget !== null} offer={updateTarget} onClose={() => setUpdateTarget(null)} />
    </div>
  );
}
