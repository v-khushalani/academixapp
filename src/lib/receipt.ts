import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInstitute, type ReceiptTemplate } from "./academy-settings";
import { receiptNo } from "./payments";
import { useSaira } from "./pdf-font";
import { formatDate } from "./dates";

export type ReceiptInput = {
  receipt_no?: string | null;
  student_name: string;
  admission_no?: string | null;
  batch_name?: string | null;
  description?: string | null;
  amount: number;
  amount_paid: number;
  due_date?: string | null;
  paid_date?: string | null;
  method?: string | null;
  class_name?: string | null;
  parent_name?: string | null;
  received_now?: number | null;
};

/** Saira is embedded in the PDF, so the ₹ glyph renders correctly. */
const rs = (n: number) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

/** Indian numbering: crore / lakh / thousand / hundred. */
export function amountInWords(value: number): string {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return "Zero rupees only";
  const parts: string[] = [];
  const units: [number, string][] = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
    [100, "Hundred"],
  ];
  for (const [div, label] of units) {
    const q = Math.floor(n / div);
    if (q > 0) {
      parts.push(`${twoDigits(q)} ${label}`);
      n -= q * div;
    }
  }
  if (n > 0) parts.push(twoDigits(n));
  return `${parts.join(" ")} rupees only`;
}

/**
 * Builds the fee receipt in the institute's chosen template.
 * Only the amount received on this payment is shown on Classic / Compact.
 */
export async function buildReceipt(
  f: ReceiptInput,
  template?: ReceiptTemplate,
): Promise<{ doc: jsPDF; no: string }> {
  const inst = getInstitute();
  const tpl = template ?? inst.receipt_template ?? "classic";
  if (tpl === "compact") return buildCompact(f);
  const no = receiptNo(f.receipt_no);
  const detailed = tpl === "detailed";
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const FONT = await useSaira(doc);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 10;
  const received = Number(f.received_now ?? f.amount_paid) || 0;

  // ---- header band -------------------------------------------------------
  doc.setFillColor(23, 37, 84);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255);
  let left = M;
  if (inst.logo_url?.startsWith("data:image")) {
    try {
      doc.addImage(inst.logo_url, "PNG", M, 4.5, 17, 17, undefined, "FAST");
      left = M + 21;
    } catch {
      /* unreadable logo — fall back to text-only header */
    }
  }
  doc.setFont(FONT, "bold");
  doc.setFontSize(14);
  doc.text(inst.name || "Institute", left, 11);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  const contact = [inst.address, [inst.phone, inst.email].filter(Boolean).join("  ·  ")]
    .filter(Boolean)
    .join("\n");
  if (contact) doc.text(contact, left, 16, { maxWidth: W - left - M - 34 });
  doc.setFont(FONT, "bold");
  doc.setFontSize(9);
  doc.text("FEE RECEIPT", W - M, 11, { align: "right" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  if (inst.academic_year) doc.text(`AY ${inst.academic_year}`, W - M, 16, { align: "right" });

  // ---- receipt meta ------------------------------------------------------
  doc.setTextColor(20);
  doc.setFontSize(8.5);
  const paidOn = formatDate(f.paid_date ?? new Date());
  doc.text(`Receipt no.  ${no}`, M, 34);
  doc.text(`Date  ${paidOn}`, W - M, 34, { align: "right" });
  doc.text(`Mode  ${f.method || "Cash"}`, W - M, 39, { align: "right" });

  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  doc.text(`Received with thanks from ${f.parent_name || f.student_name}`, M, 44);
  doc.setFont(FONT, "normal");

  // ---- student block -----------------------------------------------------
  const details: string[][] = [["Student", f.student_name, "Adm. no.", f.admission_no ?? "—"]];
  const second = [
    f.class_name ? ["Class", f.class_name] : null,
    f.batch_name ? ["Batch", f.batch_name] : null,
  ].filter(Boolean) as string[][];
  if (second.length) details.push(second.flat().concat(second.length === 1 ? ["", ""] : []));
  autoTable(doc, {
    startY: 48,
    theme: "plain",
    styles: { font: FONT, fontSize: 8.5, cellPadding: 1.2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 24, textColor: 110 },
      2: { fontStyle: "bold", cellWidth: 24, textColor: 110 },
    },
    body: details,
  });

  // ---- amount received ---------------------------------------------------
  const afterStudent =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60) + 3;
  autoTable(doc, {
    startY: afterStudent,
    theme: "grid",
    headStyles: { font: FONT, fillColor: [238, 240, 246], textColor: 30, fontSize: 8.5 },
    styles: { font: FONT, fontSize: 8.5, cellPadding: 2 },
    head: [["Particulars", "Amount received"]],
    body: [[f.description ?? "Tuition fee", rs(received)]],
    columnStyles: {
      1: { halign: "right", cellWidth: 34, fontStyle: "bold" },
    },
  });

  let y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80) + 6;

  // big headline figure
  doc.setFont(FONT, "bold");
  doc.setFontSize(18);
  doc.text(rs(received), W - M, y + 4, { align: "right" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text("AMOUNT RECEIVED", W - M, y + 9, { align: "right" });
  doc.setTextColor(20);
  y += 16;

  doc.setFontSize(8.5);
  doc.setFont(FONT, "bold");
  doc.text(`Amount in words: `, M, y);
  doc.setFont(FONT, "normal");
  doc.text(amountInWords(received), M + 26, y, { maxWidth: W - 2 * M - 26 });
  y += 8;

  // ---- detailed template: fee summary ------------------------------------
  if (detailed) {
    const total = Number(f.amount) || 0;
    const paidTotal = Number(f.amount_paid) || 0;
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { font: FONT, fontSize: 8, cellPadding: 1.1 },
      columnStyles: {
        0: { textColor: 110, cellWidth: 40 },
        1: { halign: "right", fontStyle: "bold" },
      },
      body: [
        ["Instalment amount", rs(total)],
        ["Paid so far (incl. this)", rs(paidTotal)],
        ["Balance", rs(Math.max(0, total - paidTotal))],
        ["Due date", f.due_date ? formatDate(f.due_date) : "—"],
      ],
    });
  }

  drawFooter(doc, FONT, W, H, M);
  return { doc, no };
}

/** Half-page slip — the same facts, far less ink. */
async function buildCompact(f: ReceiptInput): Promise<{ doc: jsPDF; no: string }> {
  const inst = getInstitute();
  const no = receiptNo(f.receipt_no);
  const doc = new jsPDF({ unit: "mm", format: [148, 105], orientation: "landscape" });
  const FONT = await useSaira(doc);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 9;
  const received = Number(f.received_now ?? f.amount_paid) || 0;

  let left = M;
  if (inst.logo_url?.startsWith("data:image")) {
    try {
      doc.addImage(inst.logo_url, "PNG", M, M - 2, 12, 12, undefined, "FAST");
      left = M + 15;
    } catch {
      /* ignore unreadable logo */
    }
  }
  doc.setTextColor(20);
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  doc.text(inst.name || "Institute", left, M + 4);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(110);
  const contact = [inst.phone, inst.email].filter(Boolean).join("  ·  ");
  if (contact) doc.text(contact, left, M + 8.5);
  doc.setTextColor(20);
  doc.setFont(FONT, "bold");
  doc.setFontSize(8.5);
  doc.text("FEE RECEIPT", W - M, M + 4, { align: "right" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.text(`${no}  ·  ${formatDate(f.paid_date ?? new Date())}`, W - M, M + 8.5, {
    align: "right",
  });

  doc.setDrawColor(225);
  doc.line(M, M + 12, W - M, M + 12);

  autoTable(doc, {
    startY: M + 15,
    theme: "plain",
    margin: { left: M, right: M },
    styles: { font: FONT, fontSize: 8.5, cellPadding: 1 },
    columnStyles: { 0: { textColor: 110, cellWidth: 26 } },
    body: [
      ["Student", `${f.student_name}${f.admission_no ? `  (${f.admission_no})` : ""}`],
      ["Class / Batch", [f.class_name, f.batch_name].filter(Boolean).join("  ·  ") || "—"],
      ["Towards", f.description ?? "Tuition fee"],
      ["Mode", f.method || "Cash"],
    ],
  });

  const y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 45) + 4;
  doc.setFont(FONT, "bold");
  doc.setFontSize(16);
  doc.text(rs(received), W - M, y + 4, { align: "right" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(110);
  doc.text("AMOUNT RECEIVED", W - M, y + 8, { align: "right" });
  doc.setTextColor(20);
  doc.setFontSize(7.5);
  doc.text(amountInWords(received), M, y + 8, { maxWidth: W - 2 * M - 40 });

  drawFooter(doc, FONT, W, H, M);
  return { doc, no };
}

/** Institute line on the left, Academix credit on the right. */
function drawFooter(doc: jsPDF, FONT: string, W: number, H: number, M: number) {
  doc.setDrawColor(220);
  doc.line(M, H - 16, W - M, H - 16);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text("Computer-generated receipt  ·  Powered by Academix", M, H - 11);
  doc.text("Authorised signatory", W - M, H - 11, { align: "right" });
  doc.setTextColor(20);
}

/** Generates the receipt PDF and triggers download. Returns the receipt number used. */
export async function downloadReceipt(f: ReceiptInput): Promise<string> {
  const { doc, no } = await buildReceipt(f);
  doc.save(`${no}.pdf`);
  return no;
}

/** Receipt as a File, for the native share sheet (WhatsApp attachment). */
export async function receiptFile(f: ReceiptInput): Promise<{ file: File; no: string }> {
  const { doc, no } = await buildReceipt(f);
  const blob = doc.output("blob");
  return { file: new File([blob], `${no}.pdf`, { type: "application/pdf" }), no };
}

/** Data URL of a sample receipt — used by the template preview in Settings. */
export async function receiptPreviewUrl(template: ReceiptTemplate): Promise<string> {
  const { doc } = await buildReceipt(
    {
      receipt_no: "RCPT-PREVIEW",
      student_name: "Aarav Sharma",
      admission_no: "ADM-1042",
      class_name: "Class 10",
      batch_name: "Class 10 — Morning",
      parent_name: "Rajesh Sharma",
      description: "Tuition fee — Instalment 2 of 4",
      amount: 12000,
      amount_paid: 9000,
      received_now: 6000,
      due_date: new Date().toISOString().slice(0, 10),
      paid_date: new Date().toISOString().slice(0, 10),
      method: "UPI",
    },
    template,
  );
  return doc.output("datauristring");
}
