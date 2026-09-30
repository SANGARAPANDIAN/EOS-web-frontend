/**
 * Generic CSV/TSV import parsing — shared by every "Import" wizard (Faculty,
 * Students, ...) so this delimited-text parsing/column-matching logic lives
 * in exactly one place instead of being copy-pasted per module.
 */

export interface ImportFieldDef {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}

export const IMPORT_MAX_ROWS = 5000;

export type ImportRow = Record<string, string>;

function detectDelimiter(text: string): "," | "\t" {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  return firstLine.includes("\t") ? "\t" : ",";
}

export function parseDelimitedText(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const delimiter = detectDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export function parseSheet(text: string): ParsedSheet {
  const all = parseDelimitedText(text);
  const [headers = [], ...rows] = all;
  return { headers: headers.map((h) => h.trim()), rows };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Matches a source header to one of `fields` by label or key. */
export function autoMapColumns(headers: string[], fields: ImportFieldDef[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalize(header);
    const match = fields.find((f) => normalize(f.label) === normalized || normalize(f.key) === normalized);
    if (match) mapping[index] = match.key;
  });
  return mapping;
}

export function buildTemplateCsv(fields: ImportFieldDef[]): string {
  return fields.map((f) => f.label).join(",") + "\n";
}

export function buildSampleCsv(fields: ImportFieldDef[], sampleRows: string[][]): string {
  const header = fields.map((f) => f.label).join(",");
  return [header, ...sampleRows.map((r) => r.join(","))].join("\n") + "\n";
}

export function downloadImportCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
