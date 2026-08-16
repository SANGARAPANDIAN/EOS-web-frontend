// Shared PDF styler for all data exports/downloads across the admin console
// — one consistent look (branded header band, aligned tables, page numbers)
// instead of every export inventing its own layout. jsPDF/autotable are
// loaded dynamically so they're only pulled into the bundle when an export
// actually runs, and never touched during SSR.
export interface PdfKeyValueSection {
  type: "keyValue";
  title?: string;
  rows: [string, string][];
}

export interface PdfTableSection {
  type: "table";
  title?: string;
  columns: { header: string; key: string }[];
  rows: Record<string, string | number>[];
}

export type PdfSection = PdfKeyValueSection | PdfTableSection;

export interface PdfDocumentOptions {
  title: string;
  subtitle?: string;
  /** Short label/value pairs shown under the header band, e.g. Academic Year, Department filter. */
  meta?: [string, string][];
  sections: PdfSection[];
  filename: string;
}

const BRAND_BLUE: [number, number, number] = [29, 71, 174]; // --color-admin-primary
const SLATE_500: [number, number, number] = [108, 120, 137]; // --color-admin-muted
const SLATE_900: [number, number, number] = [22, 28, 39]; // --color-admin-ink
const ROW_STRIPE: [number, number, number] = [247, 250, 255]; // --color-admin-tint

export async function exportToPdf(options: PdfDocumentOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(options.title, marginX, 30);
  if (options.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(options.subtitle, marginX, 45);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const generatedLabel = `Generated ${new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  doc.text(generatedLabel, pageWidth - marginX, 30, { align: "right" });

  let cursorY = 80;

  if (options.meta && options.meta.length > 0) {
    doc.setTextColor(...SLATE_500);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(options.meta.map(([k, v]) => `${k}: ${v}`).join("      "), marginX, cursorY);
    cursorY += 18;
  }

  for (const section of options.sections) {
    if (cursorY > pageHeight - 100) {
      doc.addPage();
      cursorY = 40;
    }

    if (section.title) {
      doc.setTextColor(...SLATE_900);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(section.title, marginX, cursorY);
      cursorY += 12;
    }

    if (section.type === "keyValue") {
      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 3, textColor: SLATE_900 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 140, textColor: SLATE_500 } },
        body: section.rows,
      });
    } else {
      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [section.columns.map((c) => c.header)],
        body: section.rows.map((row) => section.columns.map((c) => String(row[c.key] ?? "—"))),
        theme: "grid",
        headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: SLATE_900 },
        alternateRowStyles: { fillColor: ROW_STRIPE },
        styles: { cellPadding: 5, lineColor: [214, 225, 245], lineWidth: 0.5 },
      });
    }

    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    cursorY = (lastTable?.finalY ?? cursorY) + 24;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 20, { align: "right" });
  }

  doc.save(options.filename);
}
