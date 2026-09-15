// One printed on-duty letter per student — same fixed letterhead/structure
// for everyone, only the student's name/department/team and the event's
// own details change. Uses jsPDF's plain text API directly (no canvas):
// the letter is pure text, so there's nothing a canvas layer would buy here
// that direct doc.text() calls at fixed mm coordinates don't already give,
// same reasoning as generateFacultyIdCardsPdf's "why jsPDF directly" choice.
export interface OdLetterStudent {
  student_id: number;
  name: string;
  dept_name: string | null;
  discipline_name: string | null;
  letter_number: string;
}

export interface OdLetterFormFields {
  event: string;
  organizing_institution: string;
  event_from_date: string;
  event_to_date: string;
  od_from_date: string;
  od_to_date: string;
  level: string;
  team_category?: string;
}

const INSTITUTION_NAME = "Sri Eshwar College of Engineering";
const INSTITUTION_SUB = "(Approved by AICTE, New Delhi & Affiliated to Anna University)";
const INSTITUTION_ADDRESS = "Kondampatti(P.O), Vadasithur(Via), Kinathukadavu, Coimbatore-641 202.";
const INSTITUTION_PHONE = "Ph : 04259 200300";
const LOGO_URL = "/college-logo.png";

function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

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

/**
 * Builds one A4 PDF, one page per student, each an on-duty request letter
 * addressed to that student's own department head. `students` must already
 * carry that student's issued `letter_number` (see useIssueOdLetterNumbers)
 * — this function never invents or reuses a number itself.
 */
export async function generateOdLettersPdf(
  students: OdLetterStudent[],
  form: OdLetterFormFields,
): Promise<void> {
  if (students.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const logoDataUrl = await loadImageAsPngDataUrl(LOGO_URL);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 22;
  const contentWidth = pageWidth - marginX * 2;
  const today = new Date();
  const todayLabel = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  const eventFrom = formatDisplayDate(form.event_from_date);
  const eventTo = formatDisplayDate(form.event_to_date);
  const odFrom = formatDisplayDate(form.od_from_date);
  const odTo = formatDisplayDate(form.od_to_date);

  students.forEach((student, index) => {
    if (index > 0) doc.addPage();
    let y = 18;

    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", marginX, y - 8, 18, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(INSTITUTION_NAME, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(INSTITUTION_SUB, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(INSTITUTION_ADDRESS, pageWidth / 2, y, { align: "center" });
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(INSTITUTION_PHONE, pageWidth / 2, y, { align: "center" });
    y += 4;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 9;

    const teamName = [student.discipline_name ?? "Sports", "Team", form.team_category].filter(Boolean).join(" ");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(student.letter_number, marginX, y);
    doc.text(`Date: ${todayLabel}`, pageWidth - marginX, y, { align: "right" });
    y += 10;

    doc.text("From", marginX, y);
    y += 6;
    for (const line of [teamName, INSTITUTION_NAME + ",", "Kinathukadavu,", "Coimbatore – 641 202."]) {
      doc.text(line, marginX, y);
      y += 5.5;
    }
    y += 4;

    doc.text("To", marginX, y);
    y += 6;
    for (const line of [
      "The Head of the Department,",
      `${student.dept_name ?? "—"},`,
      INSTITUTION_NAME + ",",
      "Kinathukadavu,",
      "Coimbatore – 641 202.",
    ]) {
      doc.text(line, marginX, y);
      y += 5.5;
    }
    y += 4;

    doc.text("Through", marginX, y);
    y += 6;
    for (const line of [
      "The Director of Physical Education,",
      INSTITUTION_NAME + ",",
      "Kinathukadavu,",
      "Coimbatore – 641 202.",
    ]) {
      doc.text(line, marginX, y);
      y += 5.5;
    }
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Sub: Requisition for On-Duty to attend sports event Reg.,", marginX, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    const para1 = `I am writing to inform you that the ${form.organizing_institution} is organising ${form.event} from ${eventFrom} to ${eventTo} at ${form.organizing_institution}.`;
    const para1Lines = doc.splitTextToSize(para1, contentWidth);
    doc.text(para1Lines, marginX, y);
    y += para1Lines.length * 5.5 + 4;

    const para2 = `Therefore, I kindly request you to provide us with on duty from (${odFrom} to ${odTo}) to attend the aforesaid event.`;
    const para2Lines = doc.splitTextToSize(para2, contentWidth);
    doc.text(para2Lines, marginX, y);
    y += para2Lines.length * 5.5 + 12;

    doc.text("Thanking You,", marginX, y);
    y += 16;

    doc.text("With Regards", pageWidth - marginX, y, { align: "right" });
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text(`(${student.name})`, pageWidth - marginX, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text("Head of the Department", marginX, 280);
  });

  const filename =
    students.length === 1 ? `od-letter-${students[0].student_id}.pdf` : `od-letters-${students.length}.pdf`;
  doc.save(filename);
}
