import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getInstitute } from "./academy-settings";
import { inr, receiptNo } from "./payments";

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
};

/** Generates an A5-ish fee receipt PDF and triggers download. Returns the receipt number used. */
export function downloadReceipt(f: ReceiptInput): string {
  const inst = getInstitute();
  const no = receiptNo(f.receipt_no);
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFontSize(15);
  doc.text(inst.name || "Institute", W / 2, 16, { align: "center" });
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  const contact = [inst.address, [inst.phone, inst.email].filter(Boolean).join(" · ")]
    .filter(Boolean)
    .join("\n");
  if (contact) doc.text(contact, W / 2, 21, { align: "center" });
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text("FEE RECEIPT", W / 2, contact ? 32 : 28, { align: "center" });

  const due = Number(f.amount) - Number(f.amount_paid);
  autoTable(doc, {
    startY: contact ? 36 : 32,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      ["Receipt no.", no],
      ["Date", f.paid_date ?? new Date().toISOString().slice(0, 10)],
      ["Student", f.student_name],
      ["Admission no.", f.admission_no ?? "—"],
      ["Batch", f.batch_name ?? "—"],
      ["Towards", f.description ?? "Tuition fee"],
      ["Mode", f.method ?? "—"],
      ["Total billed", inr(Number(f.amount))],
      ["Amount received", inr(Number(f.amount_paid))],
      ["Balance", inr(due > 0 ? due : 0)],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 } },
  });

  const y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60) + 12;
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text("This is a computer-generated receipt.", 12, y);
  doc.text("Authorised signatory", W - 12, y, { align: "right" });
  doc.save(`${no}.pdf`);
  return no;
}
