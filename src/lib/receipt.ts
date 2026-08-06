import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInstitute } from "./academy-settings";
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

/** Builds the A5 receipt. Only the amount received on this payment is shown. */
export function buildReceipt(f: ReceiptInput): { doc: jsPDF; no: string } {
  const inst = getInstitute();
  const no = receiptNo(f.receipt_no);
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 10;
  const received = Number(f.received_now ?? f.amount_paid) || 0;

  // ---- header band -------------------------------------------------------
  doc.setFillColor(23, 37, 84);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(inst.name || "Institute", M, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const contact = [inst.address, [inst.phone, inst.email].filter(Boolean).join("  ·  ")]
    .filter(Boolean)
    .join("\n");
  if (contact) doc.text(contact, M, 16, { maxWidth: W - 2 * M - 34 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FEE RECEIPT", W - M, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  if (inst.academic_year) doc.text(`AY ${inst.academic_year}`, W - M, 16, { align: "right" });

  // ---- receipt meta ------------------------------------------------------
  doc.setTextColor(20);
  doc.setFontSize(8.5);
  const paidOn = f.paid_date ?? new Date().toISOString().slice(0, 10);
  doc.text(`Receipt no.  ${no}`, M, 34);
  doc.text(`Date  ${paidOn}`, W - M, 34, { align: "right" });
  doc.text(`Mode  ${(f.method || "cash").toUpperCase()}`, W - M, 39, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Received with thanks from ${f.parent_name || f.student_name}`, M, 44);
  doc.setFont("helvetica", "normal");

  // ---- student block -----------------------------------------------------
  autoTable(doc, {
    startY: 48,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1.2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 24, textColor: 110 },
      2: { fontStyle: "bold", cellWidth: 24, textColor: 110 },
    },
    body: [
      ["Student", f.student_name, "Adm. no.", f.admission_no ?? "—"],
      ["Class", f.class_name ?? "—", "Batch", f.batch_name ?? "—"],
    ],
  });

  // ---- amount received ---------------------------------------------------
  const afterStudent =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60) + 3;
  autoTable(doc, {
    startY: afterStudent,
    theme: "grid",
    headStyles: { fillColor: [238, 240, 246], textColor: 30, fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    head: [["Particulars", "Amount received"]],
    body: [[f.description ?? "Tuition fee", rs(received)]],
    columnStyles: {
      1: { halign: "right", cellWidth: 34, fontStyle: "bold" },
    },
  });

  let y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80) + 6;

  // big headline figure
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(rs(received), W - M, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text("AMOUNT RECEIVED", W - M, y + 9, { align: "right" });
  doc.setTextColor(20);
  y += 16;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Amount in words: `, M, y);
  doc.setFont("helvetica", "normal");
  doc.text(amountInWords(received), M + 26, y, { maxWidth: W - 2 * M - 26 });

  // ---- footer ------------------------------------------------------------
  doc.setDrawColor(220);
  doc.line(M, H - 20, W - M, H - 20);
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text("This is a computer-generated receipt.", M, H - 14);
  doc.text("Authorised signatory", W - M, H - 14, { align: "right" });
  return { doc, no };
}

/** Generates the receipt PDF and triggers download. Returns the receipt number used. */
export function downloadReceipt(f: ReceiptInput): string {
  const { doc, no } = buildReceipt(f);
  doc.save(`${no}.pdf`);
  return no;
}

/** Receipt as a File, for the native share sheet (WhatsApp attachment). */
export function receiptFile(f: ReceiptInput): { file: File; no: string } {
  const { doc, no } = buildReceipt(f);
  const blob = doc.output("blob");
  return { file: new File([blob], `${no}.pdf`, { type: "application/pdf" }), no };
}
