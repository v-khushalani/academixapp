import type jsPDF from "jspdf";
import sairaRegular from "@/assets/fonts/saira-regular.ttf.asset.json";
import sairaBold from "@/assets/fonts/saira-bold.ttf.asset.json";

/**
 * jsPDF ships WinAnsi core fonts only. We embed Saira (the app typeface) so PDFs
 * match the product and print ₹ correctly. Fonts are fetched once and cached.
 */
let cache: Promise<{ regular: string; bold: string } | null> | null = null;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function load() {
function load() {
  cache ??= Promise.all([toBase64(sairaRegular.url), toBase64(sairaBold.url)])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((err) => {
      console.error("Failed to load PDF fonts:", err);
      return null;
    });
  return cache;
}

/** Registers Saira on the doc and returns the font family name to use. */
export async function useSaira(doc: jsPDF): Promise<string> {
  const fonts = await load();
  if (!fonts) return "helvetica";
  doc.addFileToVFS("Saira-Regular.ttf", fonts.regular);
  doc.addFont("Saira-Regular.ttf", "Saira", "normal");
  doc.addFileToVFS("Saira-Bold.ttf", fonts.bold);
  doc.addFont("Saira-Bold.ttf", "Saira", "bold");
  doc.setFont("Saira", "normal");
  return "Saira";
}