/**
 * Single source of truth for money on screen and in documents.
 * Every surface must read the same way — mixing "₹" and "Rs." looks like a bug.
 */
export function formatCurrency(n: number | string | null | undefined): string {
  return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
}

/** Alias kept for readability at call sites. */
export const inr = formatCurrency;

/**
 * PDF variant. jsPDF core fonts cannot draw "₹", so fall back to the ASCII
 * form only when the embedded Saira face failed to load.
 */
export function pdfCurrency(n: number | string | null | undefined, font: string): string {
  const value = Math.round(Number(n) || 0).toLocaleString("en-IN");
  return (font === "Saira" ? "₹" : "Rs. ") + value;
}