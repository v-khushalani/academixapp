import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSaira } from "@/lib/pdf-font";
import { examLabel } from "@/lib/exam-types";

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

function remark(pct: number) {
  if (pct >= 91) return "Outstanding performance. Keep it up!";
  if (pct >= 81) return "Excellent work with strong understanding.";
  if (pct >= 71) return "Very good. Consistent effort will take you higher.";
  if (pct >= 61) return "Good. Focus on weaker subjects to improve.";
  if (pct >= 51) return "Fair. Regular revision is recommended.";
  if (pct >= 33) return "Needs improvement. Extra practice required.";
  return "Needs serious attention. Please meet the teacher.";
}

export async function buildReportCardPdf(opts: {
  institute: ReportInstitute;
  student: { full_name: string; admission_no?: string | null; class?: string | null };
  batchName: string;
  examName?: string;
  rows: ReportRow[];
  rank?: number | null;
  outOf?: number;
}): Promise<Blob> {
  const { institute: inst, student, batchName, rows, rank, outOf } = opts;
  const examName = opts.examName || (rows[0] ? examLabel(rows[0].type) : "");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const FONT = await useSaira(doc);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const brand = hexToRgb(inst.primary_color);
  const tint: [number, number, number] = brand.map((c) => Math.round(c + (255 - c) * 0.9)) as [number, number, number];
  const logo = inst.logo_url ? await toDataUrl(inst.logo_url) : null;

  // outer border
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.8);
  doc.rect(6, 6, W - 12, H - 12);
  doc.setLineWidth(0.2);
  doc.rect(8, 8, W - 16, H - 16);

  // watermark
  if (logo) {
    try {
      const gs = (doc as unknown as { GState: new (o: object) => unknown }).GState;
      doc.saveGraphicsState();
      (doc as unknown as { setGState: (g: unknown) => void }).setGState(new gs({ opacity: 0.06 }));
      const s = W * 0.55;
      doc.addImage(logo, (W - s) / 2, (H - s) / 2 + 10, s, s, undefined, "FAST");
      doc.restoreGraphicsState();
    } catch {
      /* ignore */
    }
  }

  // header band
  doc.setFillColor(...brand);
  doc.rect(8, 8, W - 16, 36, "F");
  let hx = W / 2;
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.circle(M + 13, 26, 12, "F");
      doc.addImage(logo, M + 4, 17, 18, 18, undefined, "FAST");
      hx = W / 2 + 10;
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT, "bold");
  doc.setFontSize(19);
  doc.text(inst.name || "Institute", hx, 22, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);
  const sub = [inst.tagline, inst.address].filter(Boolean).join("  ·  ");
  if (sub) doc.text(doc.splitTextToSize(sub, W - 70)[0], hx, 28.5, { align: "center" });
  const contact = [inst.phone, inst.email].filter(Boolean).join("  ·  ");
  if (contact) doc.text(contact, hx, 34, { align: "center" });

  // exam title ribbon
  let y = 52;
  const title = `${examName ? examName.toUpperCase() + " · " : ""}PROGRESS REPORT`;
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  const tw = doc.getTextWidth(title) + 16;
  doc.setFillColor(...tint);
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.4);
  doc.roundedRect((W - tw) / 2, y - 6, tw, 10, 5, 5, "FD");
  doc.setTextColor(...brand);
  doc.text(title, W / 2, y + 0.8, { align: "center" });
  y += 10;

  // student info card
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220);
  doc.roundedRect(M, y, W - 2 * M, 20, 2, 2, "FD");
  const info: [string, string][] = [
    ["Student", student.full_name],
    ["Admission no.", student.admission_no || "—"],
    ["Batch", batchName || "—"],
    ["Class", student.class || "—"],
  ];
  doc.setFontSize(9.5);
  info.forEach(([k, v], i) => {
    const x = i % 2 === 0 ? M + 5 : W / 2 + 4;
    const yy = y + 8 + Math.floor(i / 2) * 7;
    doc.setFont(FONT, "normal");
    doc.setTextColor(110);
    doc.text(k, x, yy);
    doc.setFont(FONT, "bold");
    doc.setTextColor(25);
    doc.text(v, x + 28, yy);
  });
  y += 26;

  const scored = rows.filter((r) => r.marks != null);
  const got = scored.reduce((s, r) => s + Number(r.marks), 0);
  const max = scored.reduce((s, r) => s + Number(r.max_marks), 0);
  const pct = max > 0 ? (got / max) * 100 : 0;

  // summary tiles
  const tiles: [string, string][] = [
    ["TOTAL", max ? `${got} / ${max}` : "—"],
    ["PERCENTAGE", max ? `${pct.toFixed(1)}%` : "—"],
    ["GRADE", max ? grade(pct) : "—"],
    ["RANK", rank ? (outOf ? `${rank} / ${outOf}` : String(rank)) : "—"],
  ];
  const gap = 4;
  const tW = (W - 2 * M - gap * 3) / 4;
  tiles.forEach(([k, v], i) => {
    const x = M + i * (tW + gap);
    doc.setFillColor(...(i === 2 ? brand : tint));
    doc.roundedRect(x, y, tW, 18, 2, 2, "F");
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...((i === 2 ? [255, 255, 255] : [100, 100, 100]) as [number, number, number]));
    doc.text(k, x + tW / 2, y + 6, { align: "center" });
    doc.setFont(FONT, "bold");
    doc.setFontSize(13);
    doc.setTextColor(...((i === 2 ? [255, 255, 255] : brand) as [number, number, number]));
    doc.text(v, x + tW / 2, y + 14, { align: "center" });
  });
  y += 24;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["#", "Subject", "Marks obtained", "Max marks", "%", "Grade"]],
    body: rows.map((r, i) => {
      const p = r.marks != null ? (Number(r.marks) / r.max_marks) * 100 : null;
      return [
        String(i + 1),
        (r.subject || r.title).trim(),
        r.marks != null ? String(r.marks) : "Absent / NA",
        String(r.max_marks),
        p != null ? p.toFixed(1) : "—",
        p != null ? grade(p) : "—",
      ];
    }),
    foot: [["", "Grand total", String(got), String(max), max ? pct.toFixed(1) : "—", max ? grade(pct) : "—"]],
    styles: { font: FONT, fontSize: 10, cellPadding: 2.8, lineColor: [225, 225, 225], lineWidth: 0.1 },
    headStyles: { fillColor: brand, textColor: 255, fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: tint, textColor: brand, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", fontStyle: "bold" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;

  // remarks
  if (max) {
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W - 2 * M, 14, 2, 2);
    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brand);
    doc.text("Remarks", M + 4, y + 6);
    doc.setFont(FONT, "normal");
    doc.setTextColor(40);
    doc.text(remark(pct), M + 4, y + 11);
    y += 20;
  }

  // grade scale
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110);
  doc.text(
    "Grade scale:  A1 91-100  ·  A2 81-90  ·  B1 71-80  ·  B2 61-70  ·  C1 51-60  ·  C2 41-50  ·  D 33-40  ·  E below 33",
    W / 2,
    y,
    { align: "center" },
  );

  // signatures
  const sy = H - 36;
  doc.setDrawColor(150);
  doc.setLineWidth(0.3);
  const sw = 46;
  const xs = [M + 4, (W - sw) / 2, W - M - 4 - sw];
  ["Class teacher", "Parent", "Director / Principal"].forEach((l, i) => {
    doc.line(xs[i], sy, xs[i] + sw, sy);
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(l, xs[i] + sw / 2, sy + 5, { align: "center" });
  });

  // footer
  doc.setFillColor(...brand);
  doc.rect(8, H - 20, W - 16, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  const foot = [inst.address, inst.phone, inst.email].filter(Boolean).join("  ·  ");
  doc.text(doc.splitTextToSize(foot || inst.name, W - 2 * M)[0], W / 2, H - 13, { align: "center" });

  return doc.output("blob");
}
