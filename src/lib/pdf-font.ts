import type jsPDF from "jspdf";
import sairaRegular from "@/assets/fonts/saira-regular.ttf.asset.json";
import sairaBold from "@/assets/fonts/saira-bold.ttf.asset.json";

/**
 * jsPDF ships WinAnsi core fonts only. We embed Saira (the app typeface) so PDFs
 * match the product and print ₹ correctly. Fonts are fetched once and cached.
 */
let cache: Promise<{ regular: string; bold: string } | null> | null = null;

async function toBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function load() {
  cache ??= Promise.all([
    fetch(sairaRegular.url).then((res) => res.arrayBuffer()).then((buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))),
    fetch(sairaBold.url).then((res) => res.arrayBuffer()).then((buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))),
  ])
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