"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal, Button, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { saveBlob } from "@/modules/placement/lib/download-file";
import { useImportApplications, type ImportApplicationsResult } from "@/modules/placement/api/applications";

interface ImportApplicationsModalProps {
  open: boolean;
  driveId: number;
  onClose: () => void;
}

/** Bulk-add applications from an uploaded CSV/Excel of student IDs or roll numbers — e.g. a company's shortlist. One multipart request via POST /drives/:id/applications/import. */
export function ImportApplicationsModal({ open, driveId, onClose }: ImportApplicationsModalProps) {
  const { show } = useToast();
  const importApplications = useImportApplications(driveId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportApplicationsResult | null>(null);

  function handleClose() {
    setFileName(null);
    setResult(null);
    onClose();
  }

  function handleDownloadTemplate() {
    saveBlob(new Blob(["Student ID or Roll No\n23IT001\n23CB002\n"], { type: "text/csv" }), "student-import-template.csv");
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    importApplications.mutate(file, {
      onSuccess: (res) => {
        setResult(res);
        show(res.added > 0 ? `${res.added} student(s) added.` : "No new students added.", res.added > 0 ? "success" : "error");
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import students" subtitle="Upload a CSV or Excel file of a company's shortlist.">
      <div className="flex flex-col gap-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-admin-lg border-2 border-dashed border-admin-border bg-admin-tint px-6 py-9 text-center hover:border-admin-border-hover"
        >
          <Icon name="upload_file" size={26} className="text-admin-primary" />
          <p className="text-sm font-semibold text-admin-ink">{fileName ?? "Click to choose a CSV or Excel file"}</p>
          <p className="text-xs text-admin-muted">A column of student IDs or roll numbers — extra columns are ignored.</p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelected} />
        </div>

        {importApplications.isPending && <p className="text-sm text-admin-muted">Importing…</p>}

        {result && (
          <div className="rounded-admin-lg border border-admin-border bg-admin-tint px-4 py-3 text-sm">
            <p className="font-semibold text-admin-success-fg">{result.added} added</p>
            {result.alreadyAdded.length > 0 && (
              <p className="mt-1 text-admin-muted">{result.alreadyAdded.length} already in drive: {result.alreadyAdded.join(", ")}</p>
            )}
            {result.notFound.length > 0 && (
              <p className="mt-1 text-admin-danger">{result.notFound.length} not found: {result.notFound.join(", ")}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-admin-divider pt-4">
          <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-sm text-admin-primary hover:text-admin-primary-dark">
            <Icon name="download" size={14} /> Download template
          </button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {result ? "Done" : "Cancel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
