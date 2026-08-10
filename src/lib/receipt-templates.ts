import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type ReceiptInput, amountInWords } from "./receipt";
import { formatDate } from "./dates";
import { type InstituteSettings } from "./academy-settings";

const rs = (n: number) => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN");

/** Clean, high-contrast modern receipt with a side-accent. */
export function buildModernReceipt(
  doc: jsPDF,
  inst: InstituteSettings,
  f: ReceiptInput,
  no: string,
  FONT: string,
): { doc: jsPDF; no: string } {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 12;
  const received = Number(f.received_now ?? f.amount_paid) || 0;

  // Modern blue accent line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1.5);
  doc.line(M, M, M, H - M);

  // Header
  doc.setTextColor(30);
  doc.setFont(FONT, "bold");
  doc.setFontSize(18);
  doc.text(inst.name || "Institute", M + 5, M + 5);
  
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(inst.tagline || "", M + 5, M + 9);
  
  // Right side meta
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.text("FEE RECEIPT", W - M, M + 4, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`#${no}`, W - M, M + 8, { align: "right" });
  doc.text(formatDate(f.paid_date ?? new Date()), W - M, M + 12, { align: "right" });

  // Details Grid
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.setFont(FONT, "bold");
  doc.text("Received From", M + 5, M + 22);
  doc.setFont(FONT, "normal");
  doc.text(f.parent_name || f.student_name, M + 5, M + 27);

  // AutoTable for info
  autoTable(doc, {
    startY: M + 32,
    margin: { left: M + 5 },
    theme: "plain",
    styles: { font: FONT, fontSize: 8.5, cellPadding: 1 },
    body: [
      ["Admission No:", f.admission_no || "—", "Class:", f.class_name || "—"],
      ["Batch:", f.batch_name || "—", "Payment Mode:", f.method || "Cash"]
    ],
    columnStyles: {
      0: { fontStyle: "bold", textColor: 120, cellWidth: 25 },
      2: { fontStyle: "bold", textColor: 120, cellWidth: 25 },
    }
  });

  const tableY = (doc as any).lastAutoTable.finalY + 8;

  // Main Amount Table
  autoTable(doc, {
    startY: tableY,
    margin: { left: M + 5 },
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], font: FONT, fontSize: 9 },
    bodyStyles: { font: FONT, fontSize: 9 },
    head: [["Description", "Amount"]],
    body: [[f.description || "Tuition fee", rs(received)]],
    columnStyles: {
      1: { halign: "right", cellWidth: 35 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Grand Total Box
  doc.setFillColor(243, 244, 246);
  doc.rect(W - M - 45, finalY, 45, 12, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text(rs(received), W - M - 5, finalY + 8, { align: "right" });
  
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("TOTAL PAID", W - M - 5, finalY + 16, { align: "right" });

  // Words
  doc.setTextColor(60);
  doc.setFontSize(8);
  doc.text(`Rupees ${amountInWords(received)}`, M + 5, finalY + 22, { maxWidth: W - M - 55 });

  // Signatory
  doc.setFont(FONT, "bold");
  doc.setTextColor(120);
  doc.text("Authorised Signatory", W - M, H - M - 5, { align: "right" });
  
  return { doc, no };
}

/** Elegant professional receipt with a bordered frame. */
export function buildProfessionalReceipt(
  doc: jsPDF,
  inst: InstituteSettings,
  f: ReceiptInput,
  no: string,
  FONT: string,
): { doc: jsPDF; no: string } {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 10;
  const received = Number(f.received_now ?? f.amount_paid) || 0;

  // Border
  doc.setDrawColor(200);
  doc.rect(M, M, W - 2*M, H - 2*M);

  // Logo Placeholder / Center Name
  doc.setFont(FONT, "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(inst.name.toUpperCase(), W/2, M + 12, { align: "center" });
  
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(inst.address || "", W/2, M + 17, { align: "center", maxWidth: W - 30 });

  doc.setDrawColor(230);
  doc.line(M + 5, M + 22, W - M - 5, M + 22);

  doc.setFont(FONT, "bold");
  doc.setFontSize(10);
  doc.text("OFFICIAL RECEIPT", M + 8, M + 30);
  
  doc.setFont(FONT, "normal");
  doc.text(`Date: ${formatDate(f.paid_date ?? new Date())}`, W - M - 8, M + 30, { align: "right" });
  doc.text(`Receipt No: ${no}`, W - M - 8, M + 35, { align: "right" });

  autoTable(doc, {
    startY: M + 42,
    margin: { left: M + 8, right: M + 8 },
    theme: "grid",
    styles: { font: FONT, fontSize: 9, cellPadding: 3 },
    body: [
      ["Student Name", f.student_name],
      ["Admission No", f.admission_no || "—"],
      ["Course / Batch", f.batch_name || "—"],
      ["Payment Mode", f.method || "Cash"]
    ],
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [250, 250, 250], cellWidth: 40 }
    }
  });

  const tableY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont(FONT, "bold");
  doc.text("Fee Details", M + 8, tableY);

  autoTable(doc, {
    startY: tableY + 3,
    margin: { left: M + 8, right: M + 8 },
    theme: "grid",
    headStyles: { fillColor: [40, 40, 40], font: FONT },
    body: [[f.description || "Institute fees", rs(received)]],
    columnStyles: {
      1: { halign: "right", cellWidth: 40, fontStyle: "bold" }
    }
  });

  const totalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(11);
  doc.text(`Total Paid: ${rs(received)}`, W - M - 8, totalY, { align: "right" });
  
  doc.setFontSize(8.5);
  doc.setFont(FONT, "normal");
  doc.text(`(Rupees ${amountInWords(received)})`, W - M - 8, totalY + 6, { align: "right" });

  doc.text("Management / Office Copy", M + 8, H - M - 8);
  
  return { doc, no };
}
