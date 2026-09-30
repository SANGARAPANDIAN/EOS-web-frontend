"use client";

import { useState } from "react";
import { Badge, Button, SectionCard, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useStudentFamily } from "@/modules/admin/api/students";
import { useStudentParents, useUnlinkParentAccount } from "@/modules/admin/api/parentAccounts";
import { DlGrid, Stub } from "@/modules/admin/components/student-detail/shared";
import { AddParentDialog } from "@/modules/admin/components/student-detail/AddParentDialog";

function LinkedAccounts({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentParents(studentId, active);
  const unlink = useUnlinkParentAccount();
  const { show } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleUnlink(parentUserId: number) {
    unlink.mutate(
      { studentId, parentUserId },
      {
        onSuccess: () => show("Parent unlinked", "success"),
        onError: (err) => show(friendlyError(err), "error"),
      },
    );
  }

  return (
    <SectionCard
      title="Parent portal accounts"
      actions={
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Add parent
        </Button>
      }
    >
      {isLoading ? (
        <Stub message="Loading…" />
      ) : !data || data.length === 0 ? (
        <Stub message="No parent portal login linked yet." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-admin-md border border-admin-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-admin-ink">{p.email}</div>
                <div className="mt-0.5 text-[12.5px] text-admin-muted">
                  {p.relationship.charAt(0).toUpperCase() + p.relationship.slice(1)}
                  {p.phone ? ` · ${p.phone}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => handleUnlink(p.id)}
                  disabled={unlink.isPending}
                >
                  Unlink
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddParentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} studentId={studentId} />
    </SectionCard>
  );
}

export function ParentsSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { data, isLoading } = useStudentFamily(studentId, active);

  return (
    <div className="flex flex-col gap-6">
      <LinkedAccounts studentId={studentId} active={active} />

      {isLoading ? (
        <Stub message="Loading…" />
      ) : !data ? (
        <Stub message="No family details on record." />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SectionCard title="Father">
            <DlGrid
              pairs={[
                ["Name", data.father_name],
                ["Qualification", data.father_qualification],
                ["Occupation", data.father_occupation],
                ["Annual income", data.father_annual_income],
                ["Email", data.father_email],
                ["Mobile", data.father_mobile],
              ]}
            />
          </SectionCard>
          <SectionCard title="Mother">
            <DlGrid
              pairs={[
                ["Name", data.mother_name],
                ["Qualification", data.mother_qualification],
                ["Occupation", data.mother_occupation],
                ["Annual income", data.mother_annual_income],
                ["Email", data.mother_email],
                ["Mobile", data.mother_mobile],
              ]}
            />
          </SectionCard>
        </div>
      )}
    </div>
  );
}
