"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCertificateTypes, useUploadApplicationDocument } from "@/modules/admin/api/admissions";
import { vkey } from "@/modules/admin/lib/admission-wizard";
import type { Category } from "@/modules/admin/config/admissionWizardSections";

/**
 * Renders the "Document checklist" category (student_certificates) as a
 * real tick/attach/preview list backed by GET /certificate-types, matching
 * the reference form's own three-separate-facts model (collected / scanned
 * / verified — only the first two are settable here; verification happens
 * later, on the student's own profile). Every upload goes to the private
 * student_documents bucket immediately; is_available/file_url ride in the
 * wizard's values/draft state as `${typeId}_available` / `${typeId}_file_url`
 * and are folded into the perfect-entry payload's `certificates` array.
 */
export function CertificateChecklistPanel({
  applicationId,
  category,
  values,
  setValue,
}: {
  applicationId: number;
  category: Category;
  values: Record<string, string>;
  setValue: (categoryId: string, fieldKey: string, val: string) => void;
}) {
  const { show } = useToast();
  const { data: certificateTypes, isLoading } = useCertificateTypes(true);
  const uploadDocument = useUploadApplicationDocument();
  // Signed preview links are only good for an hour and are never persisted
  // to the draft — after a resume, an already-attached document shows
  // "Attached" (no dead link) until re-uploaded or viewed from the
  // student's own Certificates panel post-admission.
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});

  if (isLoading) return <p className="text-sm text-admin-subtle">Loading document types…</p>;
  if (!certificateTypes?.length) {
    return <p className="text-sm text-admin-subtle">No certificate types are configured yet.</p>;
  }

  async function handleFile(typeId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const result = await uploadDocument.mutateAsync({ id: applicationId, certificateTypeId: typeId, file });
      setValue(category.id, `${typeId}_file_url`, result.file_url);
      setValue(category.id, `${typeId}_available`, "true");
      setPreviewUrls((p) => ({ ...p, [typeId]: result.preview_url }));
      show("Attached.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  const collected = certificateTypes.filter((t) => values[vkey(category.id, `${t.id}_available`)] === "true").length;

  return (
    <div className="flex flex-col gap-4">
      <span className="inline-flex w-fit items-center rounded-admin-pill bg-admin-tint-strong px-2.5 py-1 text-xs font-bold text-admin-primary-deep">
        {collected} of {certificateTypes.length} collected
      </span>

      <div className="flex flex-col divide-y divide-admin-divider rounded-admin-md border border-admin-border">
        {certificateTypes.map((type) => {
          const isAvailable = values[vkey(category.id, `${type.id}_available`)] === "true";
          const fileUrl = values[vkey(category.id, `${type.id}_file_url`)];
          const previewUrl = previewUrls[type.id];
          return (
            <div key={type.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <label className="flex flex-1 items-center gap-2.5 text-sm text-admin-body">
                <Checkbox checked={isAvailable} onChange={(e) => setValue(category.id, `${type.id}_available`, String(e.target.checked))} />
                {type.name}
              </label>
              {fileUrl &&
                (previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-admin-primary hover:text-admin-primary-dark"
                  >
                    <Icon name="description" size={14} /> View
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-admin-subtle">
                    <Icon name="description" size={14} /> Attached
                  </span>
                ))}
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => handleFile(type.id, e)} />
                <span className="flex items-center gap-1.5 rounded-admin-sm border border-admin-border px-2.5 py-1 text-xs font-semibold text-admin-body hover:bg-admin-tint">
                  <Icon name="upload" size={14} /> {fileUrl ? "Replace" : "Attach"}
                </span>
              </label>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-admin-subtle">
        Ticking records that the document was collected. Attaching a scan keeps a copy — PDF, JPG, PNG or WebP, up to
        5MB. Verifying a scan against the original happens later, from the student&apos;s own profile.
      </p>
    </div>
  );
}
