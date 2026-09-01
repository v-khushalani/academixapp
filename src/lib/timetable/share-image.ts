import { toPng } from "html-to-image";

/**
 * Timetables are only ever shared on WhatsApp, as a picture. On phones the
 * PNG goes straight into WhatsApp through the share sheet. On desktop the
 * picture is copied to the clipboard and WhatsApp Web opens, so it can be
 * pasted into the group with Ctrl+V.
 */
export async function shareTableAsImage(
  node: HTMLElement | null,
  filename: string,
  caption: string,
): Promise<"shared" | "copied" | "failed"> {
  if (!node) return "failed";
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
    });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: caption });
      return "shared";
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch {
      return "failed";
    }
    window.open("https://web.whatsapp.com/", "_blank", "noopener,noreferrer");
    return "copied";
  } catch {
    return "failed";
  }
}
