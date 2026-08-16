"use client";

import { useRef, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { Button, EmptyState, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import type { FacultyDocument } from "@/modules/admin/api/facultyFiles";
import { formatDate } from "@/modules/admin/lib/faculty-format";
import { DOCUMENT_TYPE_OPTIONS, QUALIFICATION_DOCUMENT_TYPE_OPTIONS } from "@/modules/admin/lib/faculty-wizard-config";

const ALL_DOCUMENT_TYPE_OPTIONS = Array.from(new Set([...DOCUMENT_TYPE_OPTIONS, ...QUALIFICATION_DOCUMENT_TYPE_OPTIONS]));

// Mirrors the backend's ALLOWED_DOCUMENT_MIME_TYPES/MAX_DOCUMENT_BYTES — checked
// client-side too so the admin gets a clear message immediately instead of only
// after a failed upload.
const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_FORMAT_HINT = "PDF, JPG, or PNG · up to 10 MB";

interface DocumentsSectionProps {
  documents: FacultyDocument[] | undefined;
  documentsLoading: boolean;
  uploadDocument: UseMutationResult<FacultyDocument, unknown, { file: File; documentType: string }>;
  deleteDocument: UseMutationResult<{ id: number }, unknown, number>;
}

export function DocumentsSection({ documents, documentsLoading, uploadDocument, deleteDocument }: DocumentsSectionProps) {
  const { show } = useToast();
  const [newDocType, setNewDocType] = useState("");
  const [selectedDocFileName, setSelectedDocFileName] = useState<string | null>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);

  function handleUploadDocument() {
    const file = docUploadRef.current?.files?.[0];
    if (!newDocType || !file) {
      show("Choose a document type and a file first.", "error");
      return;
    }
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
      show(`That file type isn't supported. Please upload a ${DOCUMENT_FORMAT_HINT} file.`, "error");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      show(`That file is too large. Please upload a file ${DOCUMENT_FORMAT_HINT}.`, "error");
      return;
    }
    uploadDocument.mutate(
      { file, documentType: newDocType },
      {
        onSuccess: () => {
          show("Document uploaded.", "success");
          setNewDocType("");
          setSelectedDocFileName(null);
          if (docUploadRef.current) docUploadRef.current.value = "";
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function handleDeleteDocument(documentId: number) {
    deleteDocument.mutate(documentId, {
      onSuccess: () => show("Document removed.", "success"),
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-admin-ink">Documents</h3>

      <div className="mt-5 rounded-admin-lg border border-admin-border bg-admin-tint p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-admin-muted">Document type</label>
            <Select value={newDocType} onChange={(e) => setNewDocType(e.target.value)}>
              <option value="">Select type</option>
              {ALL_DOCUMENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={() => docUploadRef.current?.click()}>
            Choose file
          </Button>
          <input
            ref={docUploadRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => setSelectedDocFileName(e.target.files?.[0]?.name ?? null)}
          />
          {selectedDocFileName && (
            <span className="max-w-[220px] truncate text-sm text-admin-body" title={selectedDocFileName}>
              {selectedDocFileName}
            </span>
          )}
          <Button type="button" variant="primary" disabled={uploadDocument.isPending} onClick={handleUploadDocument}>
            {uploadDocument.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-admin-muted">Accepted formats: {DOCUMENT_FORMAT_HINT}.</p>
      </div>

      <div className="mt-5">
        {documentsLoading && <p className="text-sm text-admin-muted">Loading…</p>}
        {!documentsLoading && (documents?.length ?? 0) === 0 && (
          <EmptyState icon="folder_off" title="No documents uploaded yet." description="Choose a document type and a file above, then click Upload." />
        )}
        {!documentsLoading && documents && documents.length > 0 && (
          <div className="overflow-hidden rounded-admin-lg border border-admin-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-admin-divider bg-admin-tint">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">File</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Uploaded</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-admin-divider last:border-b-0">
                    <td className="px-4 py-3 text-admin-body">{doc.document_type}</td>
                    <td className="px-4 py-3 text-admin-body">
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-admin-primary hover:text-admin-primary-dark">
                          <Icon name="download" size={15} />
                          {doc.file_name}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-admin-subtle">
                          <Icon name="download" size={15} />
                          {doc.file_name} (unavailable)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-admin-muted">{formatDate(doc.uploaded_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        aria-label="Remove document"
                        className="text-admin-subtle hover:text-admin-danger"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
