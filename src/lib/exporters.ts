import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Column<T> = { key: keyof T | string; label: string; get?: (row: T) => unknown };

function download(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function value<T>(row: T, col: Column<T>): string {
  const raw = col.get ? col.get(row) : (row as Record<string, unknown>)[col.key as string];
  if (raw === null || raw === undefined) return "";
  if (raw instanceof Date) return raw.toISOString();
  return String(raw);
}

export function exportCSV<T>(filename: string, rows: T[], cols: Column<T>[]) {
  const data = rows.map((r) => {
    const o: Record<string, string> = {};
    for (const c of cols) o[c.label] = value(r, c);
    return o;
  });
  const csv = Papa.unparse(data);
  download(filename.endsWith(".csv") ? filename : `${filename}.csv`, csv, "text/csv;charset=utf-8");
}

export function exportPDF<T>(filename: string, title: string, rows: T[], cols: Column<T>[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Exported ${new Date().toLocaleString()}`, 14, 20);
  autoTable(doc, {
    startY: 26,
    head: [cols.map((c) => c.label)],
    body: rows.map((r) => cols.map((c) => value(r, c))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30] },
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}