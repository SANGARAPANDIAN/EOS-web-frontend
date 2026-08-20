"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/Icon";
import { Button, Modal, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateFaculty, facultyKeys } from "@/modules/admin/api/faculty";
import { useDepartments } from "@/modules/admin/api/refData";
import {
  IMPORT_FIELDS,
  IMPORT_MAX_ROWS,
  autoMapColumns,
  downloadSample,
  downloadTemplate,
  parseSheet,
  validateRow,
  type ImportRow,
} from "@/modules/admin/lib/faculty-import";

interface FacultyImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "source" | "map" | "review";
type RowStatus = "valid" | "invalid" | "pending" | "success" | "failed";

interface ReviewRow {
  key: number;
  values: ImportRow;
  errors: Record<string, string>;
  status: RowStatus;
  submitError?: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "source", label: "Source" },
  { id: "map", label: "Map columns" },
  { id: "review", label: "Review & fix" },
];

function StepHeader({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex size-7 items-center justify-center rounded-admin-pill border-2 text-xs font-semibold ${
                index < currentIndex
                  ? "border-admin-primary bg-admin-primary text-white"
                  : index === currentIndex
                    ? "border-admin-primary text-admin-primary"
                    : "border-admin-border text-admin-subtle"
              }`}
            >
              {index < currentIndex ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span className={`text-sm font-medium ${index <= currentIndex ? "text-admin-primary-deep" : "text-admin-subtle"}`}>
              {step.label}
            </span>
            <span className="text-[11px] text-admin-subtle">Step {index + 1}</span>
          </div>
          {index < STEPS.length - 1 && (
            <div className={`mx-2 mb-5 h-px flex-1 ${index < currentIndex ? "bg-admin-primary" : "bg-admin-divider"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function FacultyImportModal({ open, onClose }: FacultyImportModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const { data: departments } = useDepartments();
  const createFaculty = useCreateFaculty();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("source");
  const [sourceMode, setSourceMode] = useState<"upload" | "paste">("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function resetAll() {
    setStep("source");
    setSourceMode("upload");
    setFileName(null);
    setPastedText("");
    setHeaders([]);
    setDataRows([]);
    setColumnMapping({});
    setReviewRows([]);
    setIsSubmitting(false);
    setSubmitted(false);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  function loadText(text: string, name: string | null) {
    const { headers: parsedHeaders, rows } = parseSheet(text);
    if (parsedHeaders.length === 0 || rows.length === 0) {
      show("Couldn't find any rows in that file.", "error");
      return;
    }
    if (rows.length > IMPORT_MAX_ROWS) {
      show(`This file has ${rows.length} rows — the limit is ${IMPORT_MAX_ROWS}.`, "error");
      return;
    }
    setFileName(name);
    setHeaders(parsedHeaders);
    setDataRows(rows);
    setColumnMapping(autoMapColumns(parsedHeaders));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadText(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadText(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  }

  function goToMapColumns() {
    if (sourceMode === "paste") {
      if (!pastedText.trim()) {
        show("Paste some rows first.", "error");
        return;
      }
      loadText(pastedText, null);
    }
    if (headers.length === 0) {
      show("Choose a file or paste rows first.", "error");
      return;
    }
    setStep("map");
  }

  const mappedFieldKeys = useMemo(() => Array.from(new Set(Object.values(columnMapping))).filter(Boolean), [columnMapping]);

  function buildReviewRows(): ReviewRow[] {
    return dataRows.map((cells, rowIndex) => {
      const values: ImportRow = {};
      headers.forEach((_, colIndex) => {
        const fieldKey = columnMapping[colIndex];
        if (fieldKey) values[fieldKey] = cells[colIndex] ?? "";
      });
      const { errors } = validateRow(values, departments ?? []);
      return {
        key: rowIndex,
        values,
        errors,
        status: Object.keys(errors).length > 0 ? "invalid" : "valid",
      };
    });
  }

  function goToReview() {
    if (mappedFieldKeys.length === 0) {
      show("Map at least one column first.", "error");
      return;
    }
    const required = IMPORT_FIELDS.filter((f) => f.required).map((f) => f.key);
    const missingRequired = required.filter((key) => !mappedFieldKeys.includes(key));
    if (missingRequired.length > 0) {
      show(`Map these required fields: ${missingRequired.join(", ")}`, "error");
      return;
    }
    setReviewRows(buildReviewRows());
    setSubmitted(false);
    setStep("review");
  }

  function updateCell(rowKey: number, fieldKey: string, value: string) {
    setReviewRows((prev) =>
      prev.map((row) => {
        if (row.key !== rowKey) return row;
        const values = { ...row.values, [fieldKey]: value };
        const { errors } = validateRow(values, departments ?? []);
        return { ...row, values, errors, status: Object.keys(errors).length > 0 ? "invalid" : "valid" };
      }),
    );
  }

  function removeRow(rowKey: number) {
    setReviewRows((prev) => prev.filter((row) => row.key !== rowKey));
  }

  const validCount = reviewRows.filter((r) => r.status === "valid" || r.status === "success").length;
  const invalidCount = reviewRows.filter((r) => r.status === "invalid").length;
  const failedCount = reviewRows.filter((r) => r.status === "failed").length;
  const successCount = reviewRows.filter((r) => r.status === "success").length;

  async function handleImport() {
    const toImport = reviewRows.filter((r) => r.status === "valid");
    if (toImport.length === 0) {
      show("No valid rows to import.", "error");
      return;
    }

    setIsSubmitting(true);
    setReviewRows((prev) => prev.map((row) => (row.status === "valid" ? { ...row, status: "pending" } : row)));

    const CONCURRENCY = 3;
    const queue = [...toImport];

    async function worker() {
      while (queue.length > 0) {
        const row = queue.shift();
        if (!row) return;
        const { payload } = validateRow(row.values, departments ?? []);
        if (!payload) continue;
        try {
          await createFaculty.mutateAsync(payload);
          setReviewRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, status: "success" } : r)));
        } catch (err: unknown) {
          setReviewRows((prev) =>
            prev.map((r) => (r.key === row.key ? { ...r, status: "failed", submitError: friendlyError(err) } : r)),
          );
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    setIsSubmitting(false);
    setSubmitted(true);
    queryClient.invalidateQueries({ queryKey: facultyKeys.all });
  }

  if (submitted) {
    const finalFailed = reviewRows.filter((r) => r.status === "failed").length;
    return (
      <Modal open={open} onClose={handleClose} title="Import Faculty">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span
            className={`flex size-12 items-center justify-center rounded-admin-pill ${
              finalFailed === 0 ? "bg-admin-success-bg text-admin-success-fg" : "bg-admin-warning-bg text-admin-warning-fg"
            }`}
          >
            <Icon name="check" size={24} />
          </span>
          <div>
            <p className="text-base font-bold text-admin-ink">
              {reviewRows.length - finalFailed} of {reviewRows.length} faculty imported
            </p>
            {finalFailed > 0 && <p className="mt-1 text-sm text-admin-muted">{finalFailed} row(s) failed — see details below.</p>}
          </div>
        </div>

        {finalFailed > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-admin-lg border border-admin-border">
            {reviewRows
              .filter((r) => r.status === "failed")
              .map((r) => (
                <div key={r.key} className="border-b border-admin-divider px-3 py-2 text-sm last:border-b-0">
                  <p className="font-medium text-admin-ink">
                    {r.values.first_name} {r.values.last_name} — {r.values.email}
                  </p>
                  <p className="text-xs text-admin-danger">{r.submitError}</p>
                </div>
              ))}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={resetAll}>
            Import more
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Faculty" widthClassName="max-w-2xl">
      <p className="mb-5 text-sm text-admin-muted">
        Map your spreadsheet&apos;s columns onto database fields, then fix anything that would not load.
      </p>

      <StepHeader current={step} />

      {step === "source" && (
        <div>
          <div className="mb-4 inline-flex rounded-admin-md border border-admin-border bg-admin-tint p-1">
            <button
              type="button"
              onClick={() => setSourceMode("upload")}
              className={`rounded-admin-sm px-3 py-1.5 text-sm font-medium ${
                sourceMode === "upload" ? "bg-admin-canvas text-admin-ink shadow-admin-resting" : "text-admin-subtle"
              }`}
            >
              Upload a file
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("paste")}
              className={`rounded-admin-sm px-3 py-1.5 text-sm font-medium ${
                sourceMode === "paste" ? "bg-admin-canvas text-admin-ink shadow-admin-resting" : "text-admin-subtle"
              }`}
            >
              Paste rows
            </button>
          </div>

          {sourceMode === "upload" ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-2 rounded-admin-lg border-2 border-dashed border-admin-border bg-admin-tint px-6 py-10 text-center"
            >
              <Icon name="upload" size={26} className="text-admin-primary" />
              <p className="text-sm font-semibold text-admin-ink">{fileName ?? "Drop a CSV or TSV file here"}</p>
              <p className="text-xs text-admin-muted">Up to {IMPORT_MAX_ROWS.toLocaleString()} rows · headers are detected automatically</p>
              <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                Browse files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste tab- or comma-separated rows, including a header row."
              rows={8}
              className="w-full rounded-admin-lg border border-admin-border p-3 text-sm text-admin-ink outline-none placeholder:text-admin-muted focus:border-admin-primary"
            />
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <button type="button" onClick={downloadTemplate} className="flex items-center gap-1.5 text-admin-primary hover:text-admin-primary-dark">
                <Icon name="download" size={14} /> Download template
              </button>
              <button type="button" onClick={downloadSample} className="text-admin-primary hover:text-admin-primary-dark">
                Load a sample
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={goToMapColumns}>
                Map columns
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "map" && (
        <div>
          <p className="mb-3 text-sm text-admin-muted">
            We matched columns we recognized — check them, and map anything left as &quot;Don&apos;t import&quot;.
          </p>
          <div className="max-h-96 overflow-y-auto rounded-admin-lg border border-admin-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-admin-divider bg-admin-tint">
                  <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Your column</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Sample value</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Maps to</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header, index) => (
                  <tr key={index} className="border-b border-admin-divider last:border-b-0">
                    <td className="px-3 py-2 font-medium text-admin-ink">{header || `Column ${index + 1}`}</td>
                    <td className="px-3 py-2 text-admin-muted">{dataRows[0]?.[index] ?? ""}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={columnMapping[index] ?? ""}
                        onChange={(e) => setColumnMapping((prev) => ({ ...prev, [index]: e.target.value }))}
                        className="h-9 text-sm"
                      >
                        <option value="">Don&apos;t import</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("source")}>
              Back
            </Button>
            <Button variant="primary" onClick={goToReview}>
              Review rows
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-admin-body">
              <span className="font-semibold text-admin-success-fg">{validCount + successCount} ready</span>
              {invalidCount > 0 && <span className="ml-2 font-semibold text-admin-danger">{invalidCount} need fixing</span>}
              {failedCount > 0 && <span className="ml-2 font-semibold text-admin-danger">{failedCount} failed</span>}
            </p>
          </div>

          <div className="max-h-80 overflow-auto rounded-admin-lg border border-admin-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-admin-divider bg-admin-tint">
                  <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">Status</th>
                  {mappedFieldKeys.map((key) => (
                    <th key={key} className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-bold tracking-wide text-admin-muted uppercase">
                      {IMPORT_FIELDS.find((f) => f.key === key)?.label ?? key}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {reviewRows.map((row) => (
                  <tr key={row.key} className="border-b border-admin-divider last:border-b-0">
                    <td className="px-3 py-2">
                      {row.status === "invalid" && (
                        <span className="rounded-admin-sm bg-admin-danger-bg px-1.5 py-0.5 text-[10px] font-semibold text-admin-danger uppercase">
                          Fix
                        </span>
                      )}
                      {row.status === "valid" && (
                        <span className="rounded-admin-sm bg-admin-success-bg px-1.5 py-0.5 text-[10px] font-semibold text-admin-success-fg uppercase">
                          Ready
                        </span>
                      )}
                      {row.status === "pending" && (
                        <span className="rounded-admin-sm bg-admin-tint-strong px-1.5 py-0.5 text-[10px] font-semibold text-admin-primary-deep uppercase">
                          …
                        </span>
                      )}
                      {row.status === "success" && (
                        <span className="flex items-center gap-1 text-admin-success-fg">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                      {row.status === "failed" && (
                        <span
                          className="rounded-admin-sm bg-admin-danger-bg px-1.5 py-0.5 text-[10px] font-semibold text-admin-danger uppercase"
                          title={row.submitError}
                        >
                          Failed
                        </span>
                      )}
                    </td>
                    {mappedFieldKeys.map((key) => (
                      <td key={key} className="px-2 py-1.5">
                        <input
                          value={row.values[key] ?? ""}
                          disabled={isSubmitting || row.status === "success" || row.status === "pending"}
                          onChange={(e) => updateCell(row.key, key, e.target.value)}
                          title={row.errors[key]}
                          className={`w-32 rounded-admin-control border px-2 py-1 text-xs outline-none focus:ring-1 disabled:bg-admin-tint ${
                            row.errors[key] ? "border-admin-danger-border focus:ring-admin-danger" : "border-admin-border focus:ring-admin-border-hover"
                          }`}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        disabled={isSubmitting}
                        aria-label="Remove row"
                        className="text-admin-subtle hover:text-admin-danger disabled:opacity-40"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidCount > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-admin-muted">
              <Icon name="close" size={12} /> Rows marked &quot;Fix&quot; will be skipped until corrected.
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep("map")} disabled={isSubmitting}>
              Back
            </Button>
            <Button variant="primary" onClick={handleImport} disabled={isSubmitting || validCount === 0}>
              {isSubmitting ? "Importing…" : `Import ${validCount} faculty`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
