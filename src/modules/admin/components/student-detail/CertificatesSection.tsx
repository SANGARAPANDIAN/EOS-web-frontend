"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, SectionCard, useToast } from "@/modules/admin/components/ui";
import { formatDate } from "@/modules/admin/lib/students-format";
import { useStudentCertificates, useUpsertCertificate, useVerifyCertificate } from "@/modules/admin/api/students";
import { useCertificateTypes } from "@/modules/admin/api/admissions";
import { friendlyError } from "@/lib/utils/errors";
import { Stub } from "@/modules/admin/components/student-detail/shared";

/**
 * Merges the real, DB-backed certificate_types list with whatever rows
 * already exist for this student, so every type is always shown (even one
 * nobody has touched yet) — same "checklist over records" idea as the
 * admission wizard's own certificate checklist, just for a student who's
 * already past admission.
 */
export function CertificatesSection({ studentId, active }: { studentId: number; active: boolean }) {
  const { show } = useToast();
  const { data: certificateTypes, isLoading: typesLoading } = useCertificateTypes(active);
  const { data: certificates, isLoading: recordsLoading } = useStudentCertificates(studentId, active);
  const upsert = useUpsertCertificate();
  const verify = useVerifyCertificate();
  const [pendingTypeId, setPendingTypeId] = useState<number | null>(null);

  if (typesLoading || recordsLoading) return <Stub message="Loading…" />;
  if (!certificateTypes?.length) return <Stub message="No certificate types are configured yet." />;

  const byTypeId = new Map((certificates ?? []).map((c) => [c.certificate_type_id, c]));

  async function handleToggleAvailable(typeId: number, isAvailable: boolean) {
    setPendingTypeId(typeId);
    try {
      await upsert.mutateAsync({ student_id: studentId, certificate_type_id: typeId, is_available: isAvailable });
    } catch (err) {
      show(friendlyError(err), "error");
    } finally {
      setPendingTypeId(null);
    }
  }

  async function handleFile(typeId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingTypeId(typeId);
    try {
      await upsert.mutateAsync({ student_id: studentId, certificate_type_id: typeId, file });
      show("Attached.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    } finally {
      setPendingTypeId(null);
    }
  }

  async function handleVerifyToggle(certificateId: number, currentlyVerified: boolean) {
    setPendingTypeId(certificateId);
    try {
      await verify.mutateAsync({ certificateId, verified: !currentlyVerified, studentId });
    } catch (err) {
      show(friendlyError(err), "error");
    } finally {
      setPendingTypeId(null);
    }
  }

  return (
    <SectionCard title="Certificates" actions={<span className="text-xs text-admin-subtle">The originals collected at admission</span>}>
      <div className="flex flex-col divide-y divide-admin-divider">
        {certificateTypes.map((type) => {
          const record = byTypeId.get(type.id);
          const isAvailable = record?.is_available ?? false;
          const isPending = pendingTypeId === type.id || pendingTypeId === record?.id;
          return (
            <div key={type.id} className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex flex-1 items-center gap-2.5 text-sm text-admin-body">
                <Checkbox checked={isAvailable} disabled={isPending} onChange={(e) => handleToggleAvailable(type.id, e.target.checked)} />
                {type.name}
              </label>

              {record?.file_url && (
                <a href={record.file_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-admin-primary hover:underline">
                  View
                </a>
              )}

              {record?.file_url && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleVerifyToggle(record.id, !!record.verified_at)}
                  title={record.verified_at ? `Verified ${formatDate(record.verified_at)} — click to un-verify` : "Mark as verified against the original"}
                  className={`flex items-center gap-1 rounded-admin-pill px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                    record.verified_at ? "bg-admin-success-bg text-admin-success-fg" : "bg-admin-tint text-admin-muted hover:bg-admin-tint-strong"
                  }`}
                >
                  {record.verified_at ? <Icon name="check" size={14} /> : null}
                  {record.verified_at ? "Verified" : "Not verified"}
                </button>
              )}

              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" disabled={isPending} onChange={(e) => handleFile(type.id, e)} />
                <span className="flex items-center gap-1.5 rounded-admin-md border border-admin-border px-2.5 py-1 text-xs font-medium text-admin-body hover:bg-admin-tint">
                  <Icon name="upload" size={15} /> {record?.file_url ? "Replace" : "Attach"}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
