import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSaira } from "@/lib/pdf-font";
import { examLabel } from "@/lib/exam-types";
import { formatDate } from "@/lib/dates";

export type ReportInstitute = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  tagline?: string | null;
};

export type ReportRow = {
  title: string;
  subject: string | null;
  type: string;
  date: string;
  max_marks: number;
  marks: number | null;
};

function hexToRgb(hex?: string | null): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return [23, 37, 84];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function toDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:image")) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function grade(pct: number) {
  if (pct >= 91) return "A1";
  if (pct >= 81) return "A2";
  if (pct >= 71) return "B1";
  if (pct >= 61) return "B2";
  if (pct >= 51) return "C1";
  if (pct >= 41) return "C2";
  if (pct >= 33) return "D";
  return "E";
}

export async function buildReportCardPdf(opts: {
  institute: ReportInstitute;
  student: { full_name: string; admission_no?: string | null; class?: string | null };
  batchName: string;
  rows: ReportRow[];
  rank?: number | null;
}): Promise<Blob> {
  const { institute: inst, student, batchName, rows, rank } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const FONT = await useSaira(doc);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const brand = hexToRgb(inst.primary_color);
  const logo = inst.logo_url ? await toDataUrl(inst.logo_url) : null;

  // watermark
  if (logo) {
    try {
      const gs = (doc as unknown as { GState: new (o: object) => unknown }).GState;
      doc.saveGraphicsState();
      (doc as unknown as { setGState: (g: unknown) => void }).setGState(new gs({ opacity: 0.06 }));
      const s = W * 0.5;
      doc.addImage(logo, (W - s) / 2, (H - s) / 2, s, s, undefined, "FAST");
      doc.restoreGraphicsState();
    } catch {
      /* ignore */
    }
  }

  // header
  let y = 14;
  if (logo) {
    try {
      doc.addImage(logo, (W - 20) / 2, y, 20, 20, undefined, "FAST");
      y += 24;
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(...brand);
  doc.setFont(FONT, "bold");
  doc.setFontSize(18);
  doc.text(inst.name || "Institute", W / 2, y + 4, { align: "center" });
  y += 9;
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  if (inst.address) {
    const lines = doc.splitTextToSize(inst.address, W - 2 * M);
    doc.text(lines, W / 2, y, { align: "center" });
    y += lines.length * 4;
  }
  const contact = [inst.phone, inst.email].filter(Boolean).join("  ·  ");
  if (contact) {
    doc.text(contact, W / 2, y, { align: "center" });
    y += 4;
  }
  y += 2;
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  y += 8;
  doc.setTextColor(...brand);
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.text("PROGRESS REPORT CARD", W / 2, y, { align: "center" });
  y += 8;

  // student block
  doc.setTextColor(30);
  doc.setFontSize(10);
  const info: [string, string][] = [
    ["Student", student.full_name],
    ["Admission no.", student.admission_no || "—"],
    ["Batch", batchName || "—"],
    ["Class", student.class || "—"],
  ];
  info.forEach(([k, v], i) => {
    const x = i % 2 === 0 ? M : W / 2 + 4;
    const yy = y + Math.floor(i / 2) * 6;
    doc.setFont(FONT, "normal");
    doc.text(`${k}:`, x, yy);
    doc.setFont(FONT, "bold");
    doc.text(v, x + 26, yy);
  });
  y += 14;

  const scored = rows.filter((r) => r.marks != null);
  const got = scored.reduce((s, r) => s + Number(r.marks), 0);
  const max = scored.reduce((s, r) => s + Number(r.max_marks), 0);
  const pct = max > 0 ? (got / max) * 100 : 0;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Subject", "Exam", "Date", "Marks", "Max", "%", "Grade"]],
    body: rows.map((r) => {
      const p = r.marks != null ? (Number(r.marks) / r.max_marks) * 100 : null;
      return [
        r.subject || r.title,
        examLabel(r.type),
        formatDate(r.date),
        r.marks != null ? String(r.marks) : "Not entered",
        String(r.max_marks),
        p != null ? p.toFixed(1) : "—",
        p != null ? grade(p) : "—",
      ];
    }),
    foot: [["Total", "", "", String(got), String(max), max ? pct.toFixed(1) : "—", max ? grade(pct) : "—"]],
    styles: { font: FONT, fontSize: 9.5, cellPadding: 2.2 },
    headStyles: { fillColor: brand, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 10;
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...brand);
  doc.text(`Overall: ${max ? pct.toFixed(1) + "%" : "—"}   Grade: ${max ? grade(pct) : "—"}${rank ? `   Rank in batch: ${rank}` : ""}`, M, y);

  // signatures
  const sy = H - 34;
  doc.setDrawColor(150);
  doc.setLineWidth(0.3);
  doc.line(M, sy, M + 50, sy);
  doc.line(W - M - 50, sy, W - M, sy);
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Class teacher", M, sy + 5);
  doc.text("Director / Principal", W - M - 50, sy + 5);

  // footer
  doc.setDrawColor(...brand);
  doc.line(M, H - 16, W - M, H - 16);
  doc.setFontSize(8.5);
  const foot = [inst.address, inst.phone, inst.email].filter(Boolean).join("  ·  ");
  doc.text(doc.splitTextToSize(foot || inst.name, W - 2 * M), W / 2, H - 11, { align: "center" });

  return doc.output("blob");
}
