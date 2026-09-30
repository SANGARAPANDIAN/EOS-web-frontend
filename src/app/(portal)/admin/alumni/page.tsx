"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { friendlyError } from "@/lib/utils/errors";
import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import { useBatches } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import type { Batch } from "@/modules/academic-structure/types";
import {
  useGraduatedBatches,
  useGraduateBatch,
  useAlumniReconciliationStatus,
  useReconcileAlumniRoles,
  type GraduatedBatch,
} from "@/modules/admin/api/alumni";

interface BatchRow {
  batch: Batch;
  graduated: GraduatedBatch | null;
}

export default function AdminAlumniPage() {
  const { show } = useToast();
  const [graduating, setGraduating] = useState<Batch | null>(null);

  const batches = useBatches();
  const graduatedBatches = useGraduatedBatches();
  const graduateBatch = useGraduateBatch();

  const reconciliation = useAlumniReconciliationStatus();
  const reconcile = useReconcileAlumniRoles();

  const rows: BatchRow[] = useMemo(() => {
    const graduatedByBatchId = new Map((graduatedBatches.data?.data ?? []).map((g) => [g.batch_id, g]));
    return (batches.data ?? []).map((batch) => ({ batch, graduated: graduatedByBatchId.get(batch.id) ?? null }));
  }, [batches.data, graduatedBatches.data]);

  function handleGraduateConfirmed() {
    if (!graduating) return;
    const batch = graduating;
    setGraduating(null);
    graduateBatch
      .mutateAsync(batch.id)
      .then(() => show(`${batch.name} graduated.`, "success"))
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  function handleReconcile() {
    reconcile
      .mutateAsync()
      .then((result) => show(result.fixed > 0 ? `Fixed ${result.fixed} alumni login${result.fixed === 1 ? "" : "s"}.` : "Nothing to fix.", "success"))
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const columns: DataTableColumn<BatchRow>[] = [
    {
      key: "batch",
      header: "Batch",
      render: (row) => <span className="font-semibold text-admin-ink">{row.batch.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (row.graduated ? <Badge tone="success">Graduated</Badge> : <Badge tone="neutral">Active</Badge>),
    },
    {
      key: "members",
      header: "Alumni members",
      render: (row) => <span className="text-admin-body">{row.graduated ? row.graduated.member_count : "—"}</span>,
    },
    {
      key: "graduated_on",
      header: "Graduated on",
      render: (row) => (
        <span className="text-xs text-admin-muted">
          {row.graduated ? new Date(row.graduated.graduated_on).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) =>
        row.graduated ? null : (
          <Button
            variant="secondary"
            size="sm"
            disabled={graduateBatch.isPending}
            onClick={() => setGraduating(row.batch)}
          >
            Graduate now
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Alumni"
        description="Graduate a batch into the alumni system, and keep alumni logins in sync with their alumni status."
      />

      {reconciliation.data && reconciliation.data.out_of_sync > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-admin-lg border border-admin-warning-border bg-admin-warning-bg px-5 py-4">
          <div className="flex items-center gap-3">
            <Icon name="warning" size={20} className="text-admin-warning-fg" />
            <div>
              <p className="text-sm font-bold text-admin-ink">Alumni logins out of sync</p>
              <p className="text-[13px] text-admin-muted">
                {reconciliation.data.out_of_sync} alumni account(s) are marked as graduated but still log in with student-level access.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleReconcile} disabled={reconcile.isPending}>
            {reconcile.isPending ? "Fixing…" : "Fix now"}
          </Button>
        </div>
      )}

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.batch.id}
          isLoading={batches.isLoading || graduatedBatches.isLoading}
          error={batches.isError || graduatedBatches.isError ? "Couldn't load batches. Try again." : null}
          emptyTitle="No batches yet"
        />
      </div>

      <ConfirmDialog
        open={graduating != null}
        title="Graduate this batch?"
        description={
          graduating
            ? `Every active student in "${graduating.name}" becomes an alumnus — their login role changes to Alumni and they gain access to the Alumni portal instead of the Student portal. This cannot be undone from here.`
            : undefined
        }
        confirmLabel="Graduate"
        destructive
        onConfirm={handleGraduateConfirmed}
        onCancel={() => setGraduating(null)}
      />
    </div>
  );
}
