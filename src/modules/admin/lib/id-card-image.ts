import type { Faculty } from "@/modules/admin/api/faculty";
import { EMPLOYMENT_STATUS_FROM_ENUM } from "@/modules/admin/lib/faculty-wizard-config";
import { formatDate, formatFacultyCode, fullName, initialsOf } from "@/modules/admin/lib/faculty-format";

// ISO/IEC 7810 ID-1 — the physical size every plastic ID card is cut to,
// 85.60 x 53.98mm, held in portrait here (the 53.98mm edge as the card's
// width) to match this design's photo-over-name layout. Both the on-screen
// preview (FlipIdCard) and the printed sheet size off of this exact ratio,
// so what's previewed is what a cut card will actually look like — no
// separate "close enough" aspect ratio invented for the screen.
export const CARD_W_MM = 53.98;
export const CARD_H_MM = 85.6;
export const CARD_ASPECT = CARD_W_MM / CARD_H_MM;

// Rendered at 300dpi so the same canvas doubles as print-quality artwork.
const DPI = 300;
export const CARD_W = Math.round((CARD_W_MM / 25.4) * DPI); // 638
export const CARD_H = Math.round((CARD_H_MM / 25.4) * DPI); // 1011

const NAVY = "rgb(23, 55, 128)";
const GREEN = "rgb(141, 198, 63)";
const GOLD = "rgb(247, 181, 0)";
const SLATE_600 = "rgb(71, 85, 105)";
const SLATE_900 = "rgb(15, 23, 42)";
const SLATE_200 = "rgb(226, 232, 240)";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Matches the college's real card template exactly: a layered gold/green
// wave crest sitting above a solid navy base, drawn as three overlapping
// wavy fills (each fully covering down to the bottom edge) so gold peeks
// above green which peeks above navy — not the plain straight stripes the
// very first version of this file drew.
function drawWaveBand(ctx: CanvasRenderingContext2D, topY: number) {
  const amp = 10;

  function wavePath(baseY: number) {
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.bezierCurveTo(CARD_W * 0.2, baseY - amp, CARD_W * 0.38, baseY + amp, CARD_W * 0.56, baseY);
    ctx.bezierCurveTo(CARD_W * 0.74, baseY - amp, CARD_W * 0.88, baseY + amp, CARD_W, baseY);
    ctx.lineTo(CARD_W, CARD_H);
    ctx.lineTo(0, CARD_H);
    ctx.closePath();
  }

  // Each wavePath() fills from its own wavy top edge all the way down to
  // the card's bottom edge — so layers must be painted smallest-topY-first,
  // largest (navy) last, or the last layer painted just covers the ones
  // before it instead of leaving them showing as thin slivers above it.
  ctx.fillStyle = GOLD;
  wavePath(topY);
  ctx.fill();

  ctx.fillStyle = GREEN;
  wavePath(topY + 10);
  ctx.fill();

  ctx.fillStyle = NAVY;
  wavePath(topY + 20);
  ctx.fill();
}

function drawHeader(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null) {
  const logoSize = 80;
  const textX = 26 + logoSize + 16;
  if (logo) ctx.drawImage(logo, 26, 30, logoSize, logoSize);

  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  ctx.font = "bold 30px Helvetica, Arial, sans-serif";
  const titleLines = wrapText(ctx, "Sri Eshwar College of Engineering", CARD_W - textX - 20);
  titleLines.forEach((line, i) => ctx.fillText(line, textX, 50 + i * 34));

  const subtextY = 50 + (titleLines.length - 1) * 34 + 40;
  ctx.fillStyle = SLATE_600;
  ctx.font = "17px Helvetica, Arial, sans-serif";
  ctx.fillText("An Autonomous Institution", textX, subtextY);
  ctx.fillText("Accredited by NAAC | NBA", textX, subtextY + 22);

  ctx.strokeStyle = SLATE_200;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(26, subtextY + 42);
  ctx.lineTo(CARD_W - 26, subtextY + 42);
  ctx.stroke();
}

// Front layout intentionally leaves real blank space above the wave band
// (bandTop is a fixed position, not content-driven) — that's how the
// college's actual card looks, not a gap to be designed away.
async function drawFront(ctx: CanvasRenderingContext2D, faculty: Faculty, logo: HTMLImageElement | null) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawHeader(ctx, logo);

  const photoW = 280;
  const photoH = 270;
  const photoX = (CARD_W - photoW) / 2;
  const photoY = 190;
  const photo = faculty.profile_url ? await loadImage(faculty.profile_url) : null;

  if (photo) {
    ctx.drawImage(photo, photoX, photoY, photoW, photoH);
  } else {
    ctx.fillStyle = SLATE_200;
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.fillStyle = SLATE_600;
    ctx.font = "bold 64px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(initialsOf(faculty), CARD_W / 2, photoY + photoH / 2 + 22);
  }
  ctx.strokeStyle = "rgb(40,40,40)";
  ctx.lineWidth = 2;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  let cursorY = photoY + photoH + 65;
  ctx.textAlign = "center";
  ctx.fillStyle = SLATE_900;
  ctx.font = "bold 36px Helvetica, Arial, sans-serif";
  ctx.fillText(fullName(faculty), CARD_W / 2, cursorY);

  cursorY += 38;
  ctx.fillStyle = SLATE_600;
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.fillText(`Faculty ID: ${formatFacultyCode(faculty.id)}`, CARD_W / 2, cursorY);

  cursorY += 62;
  ctx.fillStyle = SLATE_900;
  ctx.font = "bold 34px Helvetica, Arial, sans-serif";
  ctx.fillText(faculty.designation, CARD_W / 2, cursorY);

  cursorY += 46;
  ctx.font = "bold 32px Helvetica, Arial, sans-serif";
  const deptLines = wrapText(ctx, faculty.department?.name ?? "", CARD_W - 90);
  deptLines.forEach((line, i) => ctx.fillText(line, CARD_W / 2, cursorY + i * 38));

  drawWaveBand(ctx, 800);
}

// Back's label/value rows sit side by side on one line (label at labelX,
// value at valueX) rather than value wrapping below its label — matching
// the real card's two-column layout, not the stacked layout the very
// first version of this file used.
function drawBack(ctx: CanvasRenderingContext2D, faculty: Faculty) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const address = [faculty.address_line, faculty.city, faculty.state, faculty.postal_code].filter(Boolean).join(", ");

  const rows: [string, string][] = [
    ["Date of Birth", formatDate(faculty.date_of_birth)],
    [
      "Employment Status",
      faculty.employment_status ? EMPLOYMENT_STATUS_FROM_ENUM[faculty.employment_status] ?? faculty.employment_status : "—",
    ],
    ["Phone", faculty.phone ?? "—"],
    ["Email", faculty.email],
    ["Address", address || "—"],
  ];

  const labelX = 40;
  const valueX = 300;
  const valueMaxWidth = CARD_W - valueX - 30;
  const ROW_GAP = 72;
  let cursorY = 140;

  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = SLATE_600;
    ctx.font = "20px Helvetica, Arial, sans-serif";
    ctx.fillText(label, labelX, cursorY);

    ctx.fillStyle = SLATE_900;
    ctx.font = "bold 21px Helvetica, Arial, sans-serif";
    const lines = wrapText(ctx, value, valueMaxWidth);
    lines.forEach((line, i) => ctx.fillText(line, valueX, cursorY + i * 26));
    cursorY += ROW_GAP + Math.max(0, lines.length - 1) * 26;
  }

  cursorY += 60;
  ctx.strokeStyle = SLATE_600;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(labelX, cursorY);
  ctx.lineTo(labelX + 170, cursorY);
  ctx.moveTo(CARD_W - labelX - 170, cursorY);
  ctx.lineTo(CARD_W - labelX, cursorY);
  ctx.stroke();

  ctx.fillStyle = SLATE_600;
  ctx.font = "17px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Holder Sign", labelX, cursorY + 26);
  ctx.textAlign = "right";
  ctx.fillText("Principal", CARD_W - labelX, cursorY + 26);

  const bandTop = 800;
  drawWaveBand(ctx, bandTop);

  // The college's real footer block, verbatim — not a placeholder line.
  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = "bold 24px Helvetica, Arial, sans-serif";
  let footerY = bandTop + 48;
  ctx.fillText("SRI ESHWAR COLLEGE OF ENGINEERING", CARD_W / 2, footerY);

  ctx.fillStyle = "white";
  ctx.font = "16px Helvetica, Arial, sans-serif";
  footerY += 32;
  const footerLines = [
    "Accredited by NAAC with 'A' Grade",
    "Approved by AICTE, New Delhi · Affiliated to Anna University, Chennai",
    "Kondampatti Post, Vadasithur via, Kinathukadavu, Coimbatore - 641202",
    "Phone: 04259 200300 · Email: sece@sece.ac.in",
  ];
  for (const line of footerLines) {
    const wrapped = wrapText(ctx, line, CARD_W - 60);
    wrapped.forEach((w) => {
      ctx.fillText(w, CARD_W / 2, footerY);
      footerY += 22;
    });
  }
}

async function renderCardCanvases(faculty: Faculty, logo: HTMLImageElement | null) {
  const frontCanvas = document.createElement("canvas");
  frontCanvas.width = CARD_W;
  frontCanvas.height = CARD_H;
  const frontCtx = frontCanvas.getContext("2d");
  if (frontCtx) await drawFront(frontCtx, faculty, logo);

  const backCanvas = document.createElement("canvas");
  backCanvas.width = CARD_W;
  backCanvas.height = CARD_H;
  const backCtx = backCanvas.getContext("2d");
  if (backCtx) drawBack(backCtx, faculty);

  return { frontCanvas, backCanvas };
}

/**
 * Renders one faculty member's front/back as PNG data URLs — used by the
 * on-screen FlipIdCard preview. The exact same drawFront/drawBack calls
 * back the printed PDF below, so the preview is pixel-for-pixel what
 * downloading actually produces, never a second hand-built approximation
 * that could drift out of sync with it. `faculty` must carry the back-side
 * fields (DOB/address/etc.) — summary rows from a list screen don't have
 * them; fetch the full record first (see fetchFacultyById).
 */
export async function renderFacultyCardImages(faculty: Faculty): Promise<{ front: string; back: string }> {
  const logo = await loadImage("/college-logo.png");
  const { frontCanvas, backCanvas } = await renderCardCanvases(faculty, logo);
  return { front: frontCanvas.toDataURL("image/png"), back: backCanvas.toDataURL("image/png") };
}

/**
 * Builds one print-ready A4 PDF — one page per faculty member, front and
 * back placed side by side at the card's true physical size (ISO/IEC 7810
 * ID-1, 53.98 x 85.6mm) near the top of the page, with a light dashed cut
 * guide around each. Never stretched to fill the sheet: the printing team
 * needs the actual card scale to cut against, not an arbitrary layout.
 * `facultyList` must already carry the back-side fields — callers that
 * only have summary rows should re-fetch via fetchFacultyById first (see
 * FacultyIdCardModal, which fetches once and reuses it for both the
 * preview and this download).
 */
export async function generateFacultyIdCardsPdf(facultyList: Faculty[]): Promise<void> {
  if (facultyList.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const logo = await loadImage("/college-logo.png");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const gapMm = 8;
  const totalWidth = CARD_W_MM * 2 + gapMm;
  const marginX = (pageWidth - totalWidth) / 2;
  const topY = 18;
  const frontX = marginX;
  const backX = marginX + CARD_W_MM + gapMm;

  for (let i = 0; i < facultyList.length; i++) {
    const faculty = facultyList[i];
    if (i > 0) doc.addPage();

    const { frontCanvas, backCanvas } = await renderCardCanvases(faculty, logo);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("FRONT", frontX, topY - 4);
    doc.text("BACK", backX, topY - 4);

    doc.addImage(frontCanvas.toDataURL("image/png"), "PNG", frontX, topY, CARD_W_MM, CARD_H_MM);
    doc.addImage(backCanvas.toDataURL("image/png"), "PNG", backX, topY, CARD_W_MM, CARD_H_MM);

    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1.2, 1], 0);
    doc.rect(frontX, topY, CARD_W_MM, CARD_H_MM);
    doc.rect(backX, topY, CARD_W_MM, CARD_H_MM);
    doc.setLineDashPattern([], 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${fullName(faculty)} · ${formatFacultyCode(faculty.id)}`, pageWidth / 2, topY + CARD_H_MM + 10, {
      align: "center",
    });
  }

  const filename =
    facultyList.length === 1
      ? `id-card-${formatFacultyCode(facultyList[0].id)}.pdf`
      : `id-cards-${facultyList.length}.pdf`;
  doc.save(filename);
}
