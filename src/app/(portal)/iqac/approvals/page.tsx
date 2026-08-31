"use client";

import { useMemo, useState } from "react";
import { Badge, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { PageCrumbs, StatTile, FilterSelect, FilterBarFooter, Pager } from "@/modules/iqac/components/PageControls";
import { useApprovalsList, useApprovalsStats, useToggleApproval, type ApprovalRow, type ApprovalStatus } from "@/modules/iqac/api/approvals";
import { useDepartmentsList } from "@/modules/iqac/api/departments";
import { exportToPdf } from "@/lib/utils/pdf-export";

const STATUS_LABEL: Record<ApprovalStatus, string> = { pending: "Pending", verified: "Verified", missing: "Missing" };
const STATUS_TONE: Record<ApprovalStatus, BadgeTone> = { pending: "neutral", verified: "accent", missing: "danger" };
const PAGE_SIZE = 10;

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

const EMPTY_FILTERS = { q: "", departmentId: "", status: "" as ApprovalStatus | "", category: "", submittedBy: "", month: "" };

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function IqacApprovalsPage() {
  const [f, setF] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const departments = useDepartmentsList();
  const stats = useApprovalsStats();
  const list = useApprovalsList({
    department_id: f.departmentId ? Number(f.departmentId) : undefined,
    status: f.status || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const toggle = useToggleApproval();
  const [actionError, setActionError] = useState<string | null>(null);

  const allRows = useMemo(() => list.data?.data ?? [], [list.data]);
  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return allRows.filter((r) => {
      const okQ = !q || `${r.name} ${r.category} ${r.department.name} ${r.uploaded_by.email}`.toLowerCase().includes(q);
      const okC = !f.category || r.category === f.category;
      const okBy = !f.submittedBy || r.uploaded_by.email === f.submittedBy;
      const okMonth = !f.month || r.created_at.slice(0, 7) === f.month;
      return okQ && okC && okBy && okMonth;
    });
  }, [allRows, f.q, f.category, f.submittedBy, f.month]);

  const categoryOptions = useMemo(() => Array.from(new Set(allRows.map((r) => r.category))), [allRows]);
  const submitterOptions = useMemo(() => Array.from(new Set(allRows.map((r) => r.uploaded_by.email))).sort(), [allRows]);

  function update<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  async function handleToggle(id: number) {
    setActionError(null);
    try {
      await toggle.mutateAsync(id);
    } catch (err: unknown) {
      setActionError((err as { message?: string })?.message ?? "Could not update this submission.");
    }
  }

  const columns = useMemo<DataTableColumn<ApprovalRow>[]>(
    () => [
      { key: "name", header: "Submission", width: "1.6fr", sortValue: (r) => r.name, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "category", header: "Type", sortValue: (r) => r.category, render: (r) => r.category },
      { key: "dept", header: "Dept", sortValue: (r) => r.department.code, render: (r) => r.department.code },
      { key: "by", header: "Submitted by", sortValue: (r) => r.uploaded_by.email, render: (r) => r.uploaded_by.email },
      { key: "date", header: "Date", sortValue: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
      { key: "evidence", header: "Evidence", sortValue: (r) => (r.file_url ? 1 : 0), render: (r) => (r.file_url ? "File attached" : "No file") },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
      {
        key: "action",
        header: "",
        width: "0.8fr",
        render: (r) =>
          r.status !== "missing" ? (
            <button
              type="button"
              onClick={() => handleToggle(r.id)}
              disabled={toggle.isPending}
              className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            >
              {r.status === "pending" ? "Approve" : "Reopen"}
            </button>
          ) : (
            "—"
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggle.isPending],
  );

  function handleExportCsv() {
    const header = ["Submission", "Type", "Dept", "Submitted by", "Date", "Evidence", "Status"];
    const body = rows.map((r) => [
      r.name,
      r.category,
      r.department.code,
      r.uploaded_by.email,
      new Date(r.created_at).toLocaleDateString("en-IN"),
      r.file_url ? "File attached" : "No file",
      STATUS_LABEL[r.status],
    ]);
    downloadCsv("approvals.csv", [header, ...body]);
  }

  function handleExportPdf() {
    void exportToPdf({
      title: "Data entry and approvals",
      subtitle: "Departmental submissions awaiting IQAC verification",
      filename: "approvals.pdf",
      sections: [
        {
          type: "table",
          columns: [
            { header: "Submission", key: "name" },
            { header: "Type", key: "category" },
            { header: "Dept", key: "dept" },
            { header: "Submitted by", key: "submitted_by" },
            { header: "Date", key: "date" },
            { header: "Evidence", key: "evidence" },
            { header: "Status", key: "status" },
          ],
          rows: rows.map((r) => ({
            name: r.name,
            category: r.category,
            dept: r.department.code,
            submitted_by: r.uploaded_by.email,
            date: new Date(r.created_at).toLocaleDateString("en-IN"),
            evidence: r.file_url ? "File attached" : "No file",
            status: STATUS_LABEL[r.status],
          })),
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <PageCrumbs items={["IQAC", "Approvals"]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Data entry and approvals</h1>
          <p className="mt-1 text-[13.5px] text-muted">Departmental submissions awaiting IQAC verification — real department_documents data.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Pending review" value={stats.data?.pending_count ?? "—"} sub="institution-wide" />
        <StatTile label="Approved" value={stats.data?.approved_count ?? "—"} sub="real status: verified" />
        <StatTile label="Departments reporting" value={stats.data?.departments_reporting ?? "—"} sub={stats.data ? `${stats.data.departments_pending} with pending items` : undefined} />
      </div>

      <div className="rounded-card border border-border-default bg-surface p-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Search</div>
            <input
              value={f.q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search submission, department or submitter"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <FilterSelect
            label="Status"
            value={f.status}
            onChange={(v) => update("status", v as ApprovalStatus | "")}
            options={[
              { value: "", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "verified", label: "Verified" },
              { value: "missing", label: "Missing" },
            ]}
          />
          <FilterSelect
            label="Department"
            value={f.departmentId}
            onChange={(v) => update("departmentId", v)}
            options={[{ value: "", label: "All departments" }, ...(departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))]}
          />
          <FilterSelect
            label="Submission type"
            value={f.category}
            onChange={(v) => update("category", v)}
            options={[{ value: "", label: "All types" }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4">
          <FilterSelect
            label="Criterion"
            value=""
            onChange={() => {}}
            disabled
            options={[{ value: "", label: "Not tracked in this system" }]}
          />
          <FilterSelect
            label="Submitted by"
            value={f.submittedBy}
            onChange={(v) => update("submittedBy", v)}
            options={[{ value: "", label: "All submitters" }, ...submitterOptions.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Month"
            value={f.month}
            onChange={(v) => update("month", v)}
            options={[{ value: "", label: "All months" }, ...(stats.data?.months ?? []).map((m) => ({ value: m, label: monthLabel(m) }))]}
          />
        </div>

        <FilterBarFooter
          rangeStart={rows.length > 0 ? 1 : 0}
          rangeEnd={rows.length}
          total={list.data?.meta.total ?? 0}
          onClear={() => {
            setF(EMPTY_FILTERS);
            setPage(1);
          }}
          clickable={false}
        />
      </div>

      {actionError && <div className="text-[13px] font-semibold text-danger-fg">{actionError}</div>}

      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} loading={list.isLoading} emptyMessage="No submissions match these filters." hoverableRows />

      {list.data && list.data.meta.totalPages > 1 && (
        <Pager page={page - 1} pageCount={list.data.meta.totalPages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
}
