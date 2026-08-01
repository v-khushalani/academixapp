import { toPng } from "html-to-image";

/**
 * Timetables get shared in WhatsApp groups as a picture, not as a wall of text.
 * On phones this hands the PNG straight to the share sheet; on desktop it saves
 * the file and opens WhatsApp Web so it can be attached.
 */
export async function shareTableAsImage(
  node: HTMLElement | null,
  filename: string,
  caption: string,
): Promise<"shared" | "downloaded" | "failed"> {
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
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${filename}.png`;
    a.click();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(caption)}`,
      "_blank",
      "noopener,noreferrer",
    );
    return "downloaded";
  } catch {
    return "failed";
  }
}