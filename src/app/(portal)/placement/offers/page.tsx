"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { useOffers } from "@/modules/placement/hooks/useOffers";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import { UpdateOfferModal } from "@/modules/placement/components/offers/UpdateOfferModal";
import type { Offer, OfferResponseStatus } from "@/modules/placement/types";

const PAGE_SIZE = 10;

function statusLabel(response: OfferResponseStatus | null): string {
  if (response === "accepted") return "Accepted";
  if (response === "declined") return "Declined";
  return "Pending";
}

function statusTone(response: OfferResponseStatus | null): "accent" | "accentDark" | "neutral" {
  if (response === "accepted") return "accentDark";
  if (response === "declined") return "neutral";
  return "accent";
}

function lpa(value: number | undefined): string {
  return value == null ? "—" : `₹${value.toFixed(1)} LPA`;
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type SortKey = "student" | "reg" | "company" | "role" | "ctc" | "released" | "status";

function sortValue(r: Offer, key: SortKey): string | number {
  switch (key) {
    case "student":
      return r.studentName ?? r.studentIdNo;
    case "reg":
      return r.registerNo ?? r.rollNo ?? r.studentIdNo;
    case "company":
      return r.companyName;
    case "role":
      return r.jobRole ?? "";
    case "ctc":
      return r.offeredPackageLpa ?? r.packageLpa ?? -1;
    case "released":
      return r.releasedAt;
    case "status":
      return statusLabel(r.offerResponse);
  }
}

export default function OffersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [department, setDepartment] = useState("All departments");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [updateTarget, setUpdateTarget] = useState<Offer | null>(null);

  const { data, isLoading, error } = useOffers();
  const { show } = useToast();

  function resetPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortableHeader(label: string, key: SortKey) {
    return (
      <button type="button" onClick={() => toggleSort(key)} className="flex items-center gap-1 uppercase">
        {label}
        {sortKey === key && <Icon name={sortDir === "asc" ? "arrow_upward" : "arrow_downward"} size={12} />}
      </button>
    );
  }

  const rows = useMemo(() => data ?? [], [data]);

  const departmentOptions = useMemo(() => {
    const codes = new Set(rows.map((r) => r.departmentCode).filter((c): c is string => !!c));
    return ["All departments", ...Array.from(codes).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchesQuery = !q || (r.studentName ?? r.studentIdNo).toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
      const matchesStatus = status === "All statuses" || statusLabel(r.offerResponse) === status;
      const matchesDept = department === "All departments" || r.departmentCode === department;
      return matchesQuery && matchesStatus && matchesDept;
    });
    if (sortKey) {
      list.sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, query, status, department, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const total = rows.length;
  const accepted = rows.filter((r) => r.offerResponse === "accepted").length;
  const declined = rows.filter((r) => r.offerResponse === "declined").length;
  const pending = total - accepted - declined;
  const acceptedPct = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const declinedPct = total > 0 ? Math.round((declined / total) * 100) : 0;

  function handleExport() {
    const header = ["Student", "Register number", "Company", "Role", "CTC", "Released", "Status"];
    const body = filtered.map((r) => [
      r.studentName ?? r.studentIdNo,
      r.registerNo ?? r.rollNo ?? r.studentIdNo,
      r.companyName,
      r.jobRole ?? "—",
      lpa(r.offeredPackageLpa ?? r.packageLpa),
      dateLabel(r.releasedAt),
      statusLabel(r.offerResponse),
    ]);
    downloadCsv("offers.csv", [header, ...body]);
  }

  const columns: DataTableColumn<Offer>[] = [
    { key: "student", header: sortableHeader("Student", "student"), width: "1.1fr", render: (r) => <span className="font-bold text-ink">{r.studentName ?? r.studentIdNo}</span> },
    { key: "reg", header: sortableHeader("Register no.", "reg"), width: "1fr", render: (r) => <span className="font-mono text-[12px]">{r.registerNo ?? r.rollNo ?? r.studentIdNo}</span> },
    { key: "company", header: sortableHeader("Company", "company"), width: "1fr", render: (r) => <>{r.companyName}</> },
    { key: "role", header: sortableHeader("Role", "role"), width: "1.2fr", render: (r) => <>{r.jobRole ?? "—"}</> },
    { key: "ctc", header: sortableHeader("CTC", "ctc"), width: "0.8fr", render: (r) => <span className="font-mono text-[12px]">{lpa(r.offeredPackageLpa ?? r.packageLpa)}</span> },
    { key: "released", header: sortableHeader("Released", "released"), width: "1fr", render: (r) => <>{dateLabel(r.releasedAt)}</> },
    { key: "status", header: sortableHeader("Status", "status"), width: "0.9fr", render: (r) => <Badge tone={statusTone(r.offerResponse)}>{statusLabel(r.offerResponse)}</Badge> },
    {
      key: "actions",
      header: "",
      width: "1.2fr",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="primarySmall" onClick={() => setUpdateTarget(r)}>
            Update
          </Button>
          <Button variant="secondary" onClick={() => show("No offer letter uploaded yet.", "error")}>
            Letter
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Offers</h1>
          <p className="mt-1.5 text-[13px] text-muted">Offer letters released, accepted and declined this cycle.</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          Export
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(206px,1fr))] gap-3">
        <StatCard label="Offers released" value={total} sub="Including multiple offers per student" />
        <StatCard label="Accepted" value={accepted} sub={`${acceptedPct}% acceptance`} barPercent={acceptedPct} />
        <StatCard label="Pending response" value={pending} sub={`${pendingPct}% of offers`} barPercent={pendingPct} />
        <StatCard label="Declined" value={declined} sub={`${declinedPct}% of offers`} />
      </div>

      <DataTable
        title="Offers"
        titleNote={
          <div className="flex gap-2.5">
            <Input value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} placeholder="Search offers" className="h-[34px] min-w-55" />
            <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="h-[34px]">
              {["All statuses", "Accepted", "Pending", "Declined"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select value={department} onChange={(e) => resetPage(setDepartment)(e.target.value)} className="h-[34px]">
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              className="h-[34px]"
              onClick={() => {
                setQuery("");
                setStatus("All statuses");
                setDepartment("All departments");
                setSortKey(null);
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        }
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        loading={isLoading}
        hoverableRows
        emptyMessage={error ? "Failed to load offers." : "No offers match these filters."}
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <UpdateOfferModal open={updateTarget !== null} offer={updateTarget} onClose={() => setUpdateTarget(null)} />
    </div>
  );
}
