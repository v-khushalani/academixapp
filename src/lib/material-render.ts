// Markdown + LaTeX → branded HTML for study material (preview and print share this).
import katex from "katex";
import { marked } from "marked";
import { paginateMaterial } from "./material-pages";

export function renderMaterial(md: string): string {
  const math: string[] = [];
  const keep = (tex: string, display: boolean) => {
    let html: string;
    try {
      html = katex.renderToString(tex.trim(), { displayMode: display, throwOnError: false, strict: "ignore", output: "html" });
    } catch {
      html = tex;
    }
    math.push(display ? `<div class="mx-eq">${html}</div>` : html);
    return `@@MATH${math.length - 1}@@`;
  };
  let src = normalizeMaterialLevels(md).replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i, "$1");
  src = src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keep(t, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => keep(t, false))
    .replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_, p, t) => p + keep(t, false));
  const html = marked.parse(src, { async: false, gfm: true, breaks: false }) as string;
  return html
    .replace(/<!--\s*pagebreak\s*-->/gi, '<div class="mx-pb"></div>')
    .replace(/@@MATH(\d+)@@/g, (_, i) => math[Number(i)]);
}

export type MaterialBrand = {
  name: string; logo: string; color: string; address: string; phone: string; email: string;
  subject?: string | null; chapter?: string | null; classLevel?: string | null; title: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function normalizeMaterialLevels(md: string): string {
  return md.replace(/^(#{1,6}\s+Level\s+\d+)([^\n]*)$/gim, (_, level: string, rest: string) =>
    level + rest
      .replace(/\s*\((?:tough|advanced|hard|difficult|easy|medium|challenging)\)/gi, "")
      .replace(/\b(?:tough|hard|difficult|easy|medium|challenging)\b/gi, "")
      .replace(/\s{2,}/g, " ").trimEnd());
}

export function materialCss(color: string) {
  // The paper palette is independent of the app's light/dark theme.
  const brandColor = /^(#[0-9a-f]{3,8}|(?:oklch|hsl|rgb)a?\([\d\s.,%/+-]+\))$/i.test(color) ? color : "var(--paper-brand)";
  return `
:root{--paper:oklch(1 0 0);--paper-ink:oklch(.22 0 0);--paper-muted:oklch(.45 0 0);--paper-line:oklch(.82 0 0);--paper-soft:oklch(.97 0 0);--paper-brand:oklch(.32 .11 258)}
*{box-sizing:border-box}body{margin:0;background:var(--paper-soft)}
.mx{--c:${brandColor};font-family:Saira,system-ui,sans-serif;color:var(--paper-ink);line-height:1.55;font-size:14px;letter-spacing:0}
.mx-page{width:210mm;height:297mm;padding:12mm 14mm 10mm;position:relative;display:flex;flex-direction:column;background:var(--paper);margin:0 auto 18px;overflow:visible}
.mx-content{flex:1;min-height:0;overflow:visible;position:relative;z-index:1;display:flow-root}
.mx h1,.mx h2,.mx h3,.mx h4{color:var(--c);line-height:1.3;margin:1em 0 .5em;break-after:avoid;letter-spacing:0}
.mx h1{font-size:22px}.mx h2{font-size:18px;border-bottom:2px solid var(--c);padding-bottom:4px}
.mx h3{font-size:15px}.mx p{margin:.5em 0}.mx ul,.mx ol{padding-left:1.4em}.mx li{margin:.25em 0}
.mx strong{color:var(--paper-ink)}.mx hr{border:0;border-top:1px dashed var(--paper-line);margin:1em 0}
.mx blockquote{margin:.8em 0;padding:.6em .9em;border-left:4px solid var(--c);background:color-mix(in srgb,var(--c) 7%,var(--paper));border-radius:4px}
.mx table{border-collapse:collapse;width:100%;margin:.8em 0;font-size:13px;table-layout:fixed}
.mx th{background:var(--c);color:var(--paper);text-align:left}.mx th,.mx td{border:1px solid var(--paper-line);padding:6px 8px;vertical-align:top;overflow-wrap:anywhere}
.mx tr:nth-child(even) td{background:var(--paper-soft)}
.mx code{background:var(--paper-soft);padding:1px 4px;border-radius:3px;font-size:12.5px}
.mx pre{background:var(--paper-soft);padding:10px;border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere}
.mx .mx-eq{margin:.7em 0;overflow-x:auto;overflow-y:hidden;text-align:center}
.mx .katex{font-size:1.08em}.mx img{max-width:100%;object-fit:contain}.mx .mx-pb{display:none}
.mx-wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}
.mx-wm img{width:55%;max-height:55%;opacity:.065}
.mx-head{position:relative;z-index:1;text-align:center;flex:none;border-bottom:3px solid var(--c);padding-bottom:10px;margin-bottom:14px;overflow-wrap:anywhere}
.mx-head img{height:42px;width:auto;margin:0 auto 5px;display:block}
.mx-head .n{font-size:21px;font-weight:700;color:var(--c);margin:0;line-height:1.25}
.mx-head .m{font-size:13px;color:var(--paper-muted);margin-top:3px}
.mx-tags{font-size:12px;color:var(--c);margin-top:5px;font-weight:600}
.mx-foot{position:relative;z-index:1;flex:none;border-top:2px solid var(--c);margin-top:12px;padding-top:6px;font-size:11px;line-height:1.4;color:var(--paper-muted);text-align:center;overflow-wrap:anywhere}
.mx-page-number{margin-top:3px;font-size:10px}.mx-long-page .mx-oversized{max-height:200mm;max-width:100%;overflow:auto}
#material-source{position:absolute;left:-10000px;width:182mm}#material-pages{padding:12px 0}
@page{size:A4;margin:0}
@media print{body{background:var(--paper);-webkit-print-color-adjust:exact;print-color-adjust:exact}#material-pages{padding:0;zoom:1!important}.mx-page{margin:0;break-after:page;break-inside:avoid}.mx-page:last-child{break-after:auto}}
`;
}

export function materialHeader(b: MaterialBrand) {
  const tags = [b.classLevel && `Class ${b.classLevel.replace(/^class\s*/i, "")}`, b.subject, b.chapter].filter(Boolean) as string[];
  return `<header class="mx-head">${b.logo ? `<img src="${esc(b.logo)}" alt=""/>` : ""}<p class="n">${esc(b.name)}</p><div class="m">${esc(b.title)}</div><div class="mx-tags">${tags.map(esc).join(" · ")}</div></header>`;
}

export function materialFooter(b: MaterialBrand) {
  const contact = [b.phone, b.email].filter(Boolean).join(" · ");
  return `<footer class="mx-foot">${b.address ? `<div>${esc(b.address)}</div>` : ""}${contact ? `<div>${esc(contact)}</div>` : ""}<div class="mx-page-number"></div></footer>`;
}

export function materialDocument(b: MaterialBrand, content: string) {
  return `<div class="mx"><div id="material-source">${renderMaterial(content)}</div><div id="material-pages"></div><template id="material-page"><section class="mx-page">${b.logo ? `<div class="mx-wm"><img src="${esc(b.logo)}" alt=""/></div>` : ""}${materialHeader(b)}<main class="mx-content"></main>${materialFooter(b)}</section></template></div>`;
}

/** Same measured A4 pages in the embedded preview and browser print/PDF. */
export function materialPrintHtml(b: MaterialBrand, content: string, katexCssHref: string, autoPrint = true) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(b.title)}</title>
<link rel="stylesheet" href="${esc(katexCssHref)}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@400;600;700&display=swap">
<style>${materialCss(b.color)}</style></head><body>
${materialDocument(b, content)}
<script>
window.addEventListener('load',async()=>{
await document.fonts.ready;
await Promise.all(Array.from(document.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve})));
(${paginateMaterial.toString()})();
${autoPrint ? "requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));" : ""}
});
</script></body></html>`;
}
