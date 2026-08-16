import { fetchFacultyById, type Faculty } from "@/modules/admin/api/faculty";
import { EMPLOYMENT_STATUS_FROM_ENUM } from "@/modules/admin/lib/faculty-wizard-config";
import { formatDate, formatFacultyCode, fullName, initialsOf } from "@/modules/admin/lib/faculty-format";

// Renders a print-quality PNG of the faculty ID card, front and back shown
// side by side on one sheet (like a typical Aadhaar-style front/back
// preview) — matching the physical Sri Eshwar College of Engineering card
// template: same logo/college identity, same bottom wave band and back-side
// layout, with the photo and faculty-specific fields.
//
// Card is portrait (narrow width, tall height), sized down from the
// original real-card-accurate 638x1011 render (width -30%, height -50%) —
// that render left a large dead gap between the content and the bottom wave
// band on both sides; this layout is rebuilt so content and band sit close
// together at this smaller size instead of just scaling the old one.
const CARD_W = 447;
const CARD_H = 506;
const GAP = 24;
const PADDING = 20;
const LABEL_H = 24;
const CORNER_RADIUS = 12;

const NAVY = "rgb(23, 55, 128)";
const GREEN = "rgb(141, 198, 63)";
const GOLD = "rgb(247, 181, 0)";
const SLATE_600 = "rgb(71, 85, 105)";
const SLATE_900 = "rgb(15, 23, 42)";
const SLATE_200 = "rgb(226, 232, 240)";
const CANVAS_BG = "rgb(241, 245, 249)";

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

function drawWaveBand(ctx: CanvasRenderingContext2D, topY: number) {
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, topY, CARD_W, 6);
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, topY + 6, CARD_W, 6);
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, topY + 12, CARD_W, CARD_H - (topY + 12));
}

function drawHeader(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null) {
  const logoSize = 38;
  const textX = 16 + logoSize + 9;
  if (logo) ctx.drawImage(logo, 16, 13, logoSize, logoSize);

  ctx.textAlign = "left";
  ctx.fillStyle = NAVY;
  ctx.font = "bold 16px Helvetica, Arial, sans-serif";
  ctx.fillText("Sri Eshwar", textX, 27);
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.fillText("College of Engineering", textX, 41);

  ctx.fillStyle = SLATE_600;
  ctx.font = "7px Helvetica, Arial, sans-serif";
  ctx.fillText("An Autonomous Institution", textX, 52);
  ctx.fillText("Accredited by NAAC | NBA", textX, 62);
}

async function drawFront(ctx: CanvasRenderingContext2D, faculty: Faculty, logo: HTMLImageElement | null) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawHeader(ctx, logo);

  const photoW = 170;
  const photoH = 185;
  const photoX = (CARD_W - photoW) / 2;
  const photoY = 76;
  const photo = faculty.profile_url ? await loadImage(faculty.profile_url) : null;

  if (photo) {
    ctx.drawImage(photo, photoX, photoY, photoW, photoH);
    ctx.strokeStyle = "rgb(40,40,40)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(photoX, photoY, photoW, photoH);
  } else {
    ctx.fillStyle = SLATE_200;
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.strokeStyle = "rgb(40,40,40)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(photoX, photoY, photoW, photoH);
    ctx.fillStyle = SLATE_600;
    ctx.font = "bold 32px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(initialsOf(faculty), CARD_W / 2, photoY + photoH / 2 + 11);
  }

  let cursorY = photoY + photoH + 32;
  ctx.textAlign = "center";
  ctx.fillStyle = SLATE_900;
  ctx.font = "bold 16px Helvetica, Arial, sans-serif";
  ctx.fillText(fullName(faculty).toUpperCase(), CARD_W / 2, cursorY);

  cursorY += 22;
  ctx.fillStyle = SLATE_600;
  ctx.font = "12px Helvetica, Arial, sans-serif";
  ctx.fillText(faculty.designation, CARD_W / 2, cursorY);

  cursorY += 18;
  ctx.font = "11px Helvetica, Arial, sans-serif";
  const deptLines = wrapText(ctx, faculty.department?.name ?? "", CARD_W - 40);
  deptLines.forEach((line, i) => ctx.fillText(line, CARD_W / 2, cursorY + i * 14));
  cursorY += deptLines.length * 14 + 10;

  ctx.fillStyle = NAVY;
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.fillText(formatFacultyCode(faculty.id), CARD_W / 2, cursorY);

  drawWaveBand(ctx, cursorY + 30);
}

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

  let cursorY = 40;
  const labelX = 20;
  const valueMaxWidth = CARD_W - labelX * 2;
  const ROW_GAP = 60;

  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = SLATE_600;
    ctx.font = "bold 11px Helvetica, Arial, sans-serif";
    ctx.fillText(label, labelX, cursorY);

    ctx.fillStyle = SLATE_900;
    ctx.font = "11px Helvetica, Arial, sans-serif";
    const lines = wrapText(ctx, value, valueMaxWidth);
    lines.forEach((line, i) => ctx.fillText(line, labelX, cursorY + 16 + i * 14));
    cursorY += ROW_GAP + Math.max(0, lines.length - 1) * 14;
  }

  cursorY += 26;
  ctx.strokeStyle = SLATE_600;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(labelX, cursorY);
  ctx.lineTo(labelX + 110, cursorY);
  ctx.moveTo(CARD_W - labelX - 110, cursorY);
  ctx.lineTo(CARD_W - labelX, cursorY);
  ctx.stroke();

  ctx.fillStyle = SLATE_600;
  ctx.font = "9px Helvetica, Arial, sans-serif";
  ctx.fillText("Holder Sign", labelX, cursorY + 14);
  ctx.fillText("Principal", CARD_W - labelX - 110, cursorY + 14);

  drawWaveBand(ctx, cursorY + 40);
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.font = "8px Helvetica, Arial, sans-serif";
  const footerLines = wrapText(ctx, "Sri Eshwar College of Engineering · Coimbatore · www.sece.ac.in", CARD_W - 30);
  const footerStartY = CARD_H - 10 - (footerLines.length - 1) * 11;
  footerLines.forEach((line, i) => ctx.fillText(line, CARD_W / 2, footerStartY + i * 11));
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCardOnto(ctx: CanvasRenderingContext2D, card: HTMLCanvasElement, x: number, y: number) {
  ctx.save();
  roundRectPath(ctx, x, y, CARD_W, CARD_H, CORNER_RADIUS);
  ctx.clip();
  ctx.drawImage(card, x, y);
  ctx.restore();

  ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, x, y, CARD_W, CARD_H, CORNER_RADIUS);
  ctx.stroke();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders one PNG per faculty showing the front and back of their ID card
 * side by side on one sheet, portrait orientation, sized and laid out to
 * match the physical reference card. Always re-fetches each faculty's full
 * record first: the list/bulk-select screens that feed this only carry
 * summary fields, but the back side needs DOB/address/etc., which only the
 * single-faculty endpoint returns.
 */
export async function generateFacultyIdCardImages(facultyList: Faculty[]): Promise<void> {
  const [logo, fullRecords] = await Promise.all([
    loadImage("/college-logo.png"),
    Promise.all(facultyList.map((f) => fetchFacultyById(f.id).catch(() => f))),
  ]);

  for (const faculty of fullRecords) {
    const frontCanvas = document.createElement("canvas");
    frontCanvas.width = CARD_W;
    frontCanvas.height = CARD_H;
    const frontCtx = frontCanvas.getContext("2d");
    if (!frontCtx) continue;
    await drawFront(frontCtx, faculty, logo);

    const backCanvas = document.createElement("canvas");
    backCanvas.width = CARD_W;
    backCanvas.height = CARD_H;
    const backCtx = backCanvas.getContext("2d");
    if (!backCtx) continue;
    drawBack(backCtx, faculty);

    // Front and back side by side on one sheet, like a typical
    // Aadhaar-style front/back preview — not stacked.
    const combined = document.createElement("canvas");
    combined.width = CARD_W * 2 + GAP + PADDING * 2;
    combined.height = CARD_H + LABEL_H + PADDING * 2;
    const ctx = combined.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, combined.width, combined.height);

    const frontX = PADDING;
    const backX = PADDING + CARD_W + GAP;
    const cardY = PADDING + LABEL_H;

    ctx.textAlign = "left";
    ctx.fillStyle = SLATE_600;
    ctx.font = "bold 14px Helvetica, Arial, sans-serif";
    ctx.fillText("FRONT", frontX, PADDING + 18);
    ctx.fillText("BACK", backX, PADDING + 18);

    drawCardOnto(ctx, frontCanvas, frontX, cardY);
    drawCardOnto(ctx, backCanvas, backX, cardY);

    const blob = await canvasToBlob(combined);
    if (blob) downloadBlob(blob, `id-card-${formatFacultyCode(faculty.id)}.png`);
  }
}
