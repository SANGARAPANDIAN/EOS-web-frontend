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
  /** A photo (e.g. a profile picture) shown in the header band, top-right — the band grows a bit taller to fit it. Silently skipped if it fails to load. */
  photoUrl?: string | null;
  /** Adds the college logo + institution name to every page's footer, next to "Page X of Y". Opt-in — most exports don't need letterhead branding. */
  footerBrand?: boolean;
}

const BRAND_BLUE: [number, number, number] = [29, 71, 174]; // --color-admin-primary
const SLATE_500: [number, number, number] = [108, 120, 137]; // --color-admin-muted
const SLATE_900: [number, number, number] = [22, 28, 39]; // --color-admin-ink
const ROW_STRIPE: [number, number, number] = [247, 250, 255]; // --color-admin-tint

const INSTITUTION_NAME = "Sri Eshwar College of Engineering";
const LOGO_URL = "/college-logo.png";

/**
 * jsPDF's built-in "helvetica" (one of the PDF Standard 14 fonts, Latin-only)
 * has no ₹ glyph — feeding it straight into doc.text() silently renders as
 * "¹" instead of the rupee sign. Any report that shows money should format
 * it through this, not through a currency formatter meant for on-screen
 * HTML (₹ renders fine there — this is a PDF/font-specific problem only).
 */
export function formatMoneyForPdf(value: string | number): string {
  const amount = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value));
  return `Rs. ${amount}`;
}

/**
 * Re-draws any loadable image (any source format/origin) onto a canvas and
 * reads it back as a PNG data URL — jsPDF's addImage needs to know the
 * image format up front, and re-encoding through canvas sidesteps ever
 * having to detect it (a remote profile photo could be JPEG or PNG).
 * Resolves null on any failure (missing file, CORS, 404) so a broken photo
 * just means "no photo in the report", never a failed export.
 */
function loadImageAsPngDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportToPdf(options: PdfDocumentOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const [photoDataUrl, logoDataUrl] = await Promise.all([
    options.photoUrl ? loadImageAsPngDataUrl(options.photoUrl) : Promise.resolve(null),
    options.footerBrand ? loadImageAsPngDataUrl(LOGO_URL) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  // Only taller when there's actually a photo to fit — every other export
  // that doesn't pass photoUrl keeps the exact same 60pt band as before.
  const headerHeight = photoDataUrl ? 74 : 60;

  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
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
  const photoSize = 50;
  const generatedX = photoDataUrl ? pageWidth - marginX - photoSize - 12 : pageWidth - marginX;
  doc.text(generatedLabel, generatedX, 30, { align: "right" });

  if (photoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - marginX - photoSize, (headerHeight - photoSize) / 2, photoSize, photoSize, 4, 4, "F");
    doc.addImage(
      photoDataUrl,
      "PNG",
      pageWidth - marginX - photoSize,
      (headerHeight - photoSize) / 2,
      photoSize,
      photoSize,
    );
  }

  let cursorY = headerHeight + 20;

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

    if (logoDataUrl) {
      const logoSize = 16;
      doc.addImage(logoDataUrl, "PNG", marginX, pageHeight - 20 - logoSize + 3, logoSize, logoSize);
      doc.text(INSTITUTION_NAME, marginX + logoSize + 8, pageHeight - 20);
    }
  }

  doc.save(options.filename);
}
