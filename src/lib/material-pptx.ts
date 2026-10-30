// Browser-only: builds an institute-branded, editable .pptx from slide markdown.
// Slide format: each "## Title" starts a slide; "- " lines are bullets; "> " lines are a key-point callout.
import type { MaterialBrand } from "@/lib/material-render";

export const SLIDES_MARKER = "<!-- slides -->";
export const isSlides = (content: string) => content.trimStart().startsWith(SLIDES_MARKER);

type Slide = { title: string; bullets: { text: string; level: number }[]; note: string[] };

export function parseSlides(md: string): Slide[] {
  const slides: Slide[] = [];
  let cur: Slide | null = null;
  for (const raw of md.replace(SLIDES_MARKER, "").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^#{1,3}\s+(.*)/);
    if (h) { cur = { title: clean(h[1]), bullets: [], note: [] }; slides.push(cur); continue; }
    if (!cur || !line.trim() || /^<!--/.test(line.trim())) continue;
    const q = line.match(/^\s*>\s?(.*)/);
    if (q) { cur.note.push(clean(q[1])); continue; }
    const b = line.match(/^(\s*)[-*•]\s+(.*)/) ?? line.match(/^(\s*)\d+[.)]\s+(.*)/);
    if (b) cur.bullets.push({ text: clean(b[2]), level: Math.min(2, Math.floor(b[1].length / 2)) });
    else cur.bullets.push({ text: clean(line), level: 0 });
  }
  return slides.filter((s) => s.title || s.bullets.length);
}

function clean(s: string) {
  return s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`([^`]*)`/g, "$1")
    .replace(/\$\$?([^$]+)\$\$?/g, "$1").trim();
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(null); r.readAsDataURL(blob); });
  } catch { return null; }
}

export async function downloadSlidesPptx(brand: MaterialBrand, content: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = brand.title;
  pptx.company = brand.name;
  const C = (brand.color || "#013062").replace("#", "").slice(0, 6).toUpperCase();
  const logo = brand.logo ? await toDataUrl(brand.logo) : null;
  const footer = [brand.address, brand.phone, brand.email].filter(Boolean).join("  •  ");
  const meta = [brand.classLevel && `Class ${brand.classLevel}`, brand.subject].filter(Boolean).join("  •  ");
  const W = 13.333, H = 7.5;

  // Cover
  const cover = pptx.addSlide();
  cover.background = { color: C };
  if (logo) cover.addImage({ data: logo, x: W / 2 - 0.75, y: 0.7, w: 1.5, h: 1.5, sizing: { type: "contain", w: 1.5, h: 1.5 } });
  cover.addText(brand.name, { x: 0.5, y: 2.4, w: W - 1, h: 0.7, align: "center", fontSize: 26, bold: true, color: "FFFFFF", fontFace: "Calibri" });
  cover.addText(brand.chapter || brand.title, { x: 0.5, y: 3.2, w: W - 1, h: 1.4, align: "center", fontSize: 48, bold: true, color: "FFFFFF", fontFace: "Georgia", fit: "shrink" });
  if (meta) cover.addText(meta, { x: 0.5, y: 4.7, w: W - 1, h: 0.5, align: "center", fontSize: 20, color: "FFFFFF", fontFace: "Calibri" });
  if (footer) cover.addText(footer, { x: 0.5, y: H - 0.8, w: W - 1, h: 0.4, align: "center", fontSize: 13, color: "FFFFFF", fontFace: "Calibri" });

  parseSlides(content).forEach((s, i) => {
    const sl = pptx.addSlide();
    sl.background = { color: "FFFFFF" };
    if (logo) sl.addImage({ data: logo, x: W / 2 - 2, y: H / 2 - 2, w: 4, h: 4, transparency: 92, sizing: { type: "contain", w: 4, h: 4 } });
    sl.addShape("rect", { x: 0, y: 0, w: W, h: 1.15, fill: { color: C }, line: { color: C } });
    if (logo) sl.addImage({ data: logo, x: 0.35, y: 0.18, w: 0.8, h: 0.8, sizing: { type: "contain", w: 0.8, h: 0.8 } });
    sl.addText(s.title, { x: logo ? 1.35 : 0.5, y: 0.1, w: W - 3.6, h: 0.95, fontSize: 30, bold: true, color: "FFFFFF", fontFace: "Georgia", valign: "middle", fit: "shrink" });
    sl.addText(brand.name, { x: W - 3.3, y: 0.1, w: 3, h: 0.95, fontSize: 12, color: "FFFFFF", align: "right", valign: "middle", fontFace: "Calibri" });
    const noteH = s.note.length ? 1.0 : 0;
    if (s.bullets.length) {
      sl.addText(
        s.bullets.map((b) => ({ text: b.text, options: { bullet: true, indentLevel: b.level, fontSize: b.level ? 18 : 22, color: "222222", breakLine: true, paraSpaceAfter: 6 } })),
        { x: 0.6, y: 1.4, w: W - 1.2, h: H - 2.3 - noteH, valign: "top", fontFace: "Calibri", fit: "shrink" },
      );
    }
    if (noteH) {
      sl.addShape("rect", { x: 0.6, y: H - 0.85 - noteH, w: 0.12, h: noteH - 0.1, fill: { color: C }, line: { color: C } });
      sl.addText(s.note.join(" "), { x: 0.85, y: H - 0.85 - noteH, w: W - 1.45, h: noteH - 0.1, fontSize: 18, italic: true, color: C, fontFace: "Calibri", valign: "middle", fit: "shrink" });
    }
    sl.addShape("line", { x: 0.5, y: H - 0.6, w: W - 1, h: 0, line: { color: "DDDDDD", width: 1 } });
    if (footer) sl.addText(footer, { x: 0.5, y: H - 0.55, w: W - 2, h: 0.4, fontSize: 11, color: "666666", fontFace: "Calibri" });
    sl.addText(String(i + 2), { x: W - 1.3, y: H - 0.55, w: 0.8, h: 0.4, fontSize: 11, color: "666666", align: "right", fontFace: "Calibri" });
  });

  const name = (brand.chapter || brand.title).replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "slides";
  await pptx.writeFile({ fileName: `${name}.pptx` });
}
