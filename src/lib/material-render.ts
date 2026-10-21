// Markdown + LaTeX → branded HTML for study material (preview and print share this).
import katex from "katex";
import { marked } from "marked";

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
  let src = md.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i, "$1");
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

export function materialCss(color: string) {
  return `
.mx{--c:${color};font-family:Saira,system-ui,sans-serif;color:#1a1a1a;line-height:1.65;font-size:14px;position:relative}
.mx h1,.mx h2,.mx h3,.mx h4{color:var(--c);line-height:1.3;margin:1.2em 0 .5em;break-after:avoid}
.mx h1{font-size:22px}.mx h2{font-size:18px;border-bottom:2px solid var(--c);padding-bottom:4px}
.mx h3{font-size:15px}.mx p{margin:.5em 0}.mx ul,.mx ol{padding-left:1.4em}.mx li{margin:.25em 0}
.mx strong{color:#000}.mx hr{border:0;border-top:1px dashed #bbb;margin:1.2em 0}
.mx blockquote{margin:.8em 0;padding:.6em .9em;border-left:4px solid var(--c);background:color-mix(in srgb,var(--c) 7%,#fff);border-radius:4px;break-inside:avoid}
.mx table{border-collapse:collapse;width:100%;margin:.8em 0;font-size:13px;break-inside:avoid}
.mx th{background:var(--c);color:#fff;text-align:left}.mx th,.mx td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}
.mx tr:nth-child(even) td{background:#f7f7f7}
.mx code{background:#f1f1f1;padding:1px 4px;border-radius:3px;font-size:12.5px}
.mx pre{background:#f6f6f6;padding:10px;border-radius:6px;overflow-x:auto;white-space:pre-wrap}
.mx .mx-eq{margin:.7em 0;overflow-x:auto;overflow-y:hidden;break-inside:avoid;text-align:center}
.mx .katex{font-size:1.08em}
.mx .mx-pb{break-after:page;border-top:2px dashed #ccc;margin:1.5em 0}
@media print{.mx .mx-pb{border:0;margin:0}}
.mx-wm{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;pointer-events:none;z-index:0}
.mx-wm img{position:sticky;top:30%;width:55%;max-width:380px;opacity:.06;margin-top:120px}
.mx-body{position:relative;z-index:1}
.mx-head{display:flex;align-items:center;gap:14px;border-bottom:3px solid var(--c);padding-bottom:10px;margin-bottom:14px}
.mx-head img{height:52px;width:auto;object-fit:contain}
.mx-head .n{font-size:20px;font-weight:700;color:var(--c);margin:0;line-height:1.2}
.mx-head .m{font-size:12px;color:#555;margin-top:2px}
.mx-tags{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.mx-tags span{font-size:11px;border:1px solid var(--c);color:var(--c);border-radius:999px;padding:2px 9px;white-space:nowrap}
.mx-foot{border-top:2px solid var(--c);margin-top:24px;padding-top:6px;font-size:11px;color:#555;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
`;
}

export function materialHeader(b: MaterialBrand) {
  const tags = [b.classLevel, b.subject, b.chapter].filter(Boolean) as string[];
  return `<div class="mx-head">${b.logo ? `<img src="${esc(b.logo)}" alt=""/>` : ""}<div><p class="n">${esc(b.name)}</p><div class="m">${esc(b.title)}</div></div><div class="mx-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div></div>`;
}

export function materialFooter(b: MaterialBrand) {
  const contact = [b.phone && `☎ ${b.phone}`, b.email].filter(Boolean).join(" · ");
  return `<div class="mx-foot"><span>${esc(b.address || b.name)}</span><span>${esc(contact)}</span></div>`;
}

export function materialDocument(b: MaterialBrand, content: string) {
  return `<div class="mx">${b.logo ? `<div class="mx-wm"><img src="${esc(b.logo)}" alt=""/></div>` : ""}<div class="mx-body">${materialHeader(b)}${renderMaterial(content)}${materialFooter(b)}</div></div>`;
}

export function materialPrintHtml(b: MaterialBrand, content: string, katexCssHref: string) {
  const css = materialCss(b.color);
  const doc = `<div class="mx"><div class="mx-body">${renderMaterial(content)}</div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(b.title)}</title>
<link rel="stylesheet" href="${katexCssHref}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@400;600;700&display=swap">
<style>${css}
@page{size:A4;margin:30mm 14mm 20mm}
body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ph,.pf{position:fixed;left:0;right:0;background:#fff;font-family:Saira,system-ui,sans-serif;--c:${b.color}}
.ph{top:-24mm}.pf{bottom:-14mm}
.pwm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:60%;opacity:.07;z-index:0}
@media screen{body{max-width:800px;margin:20px auto;padding:0 16px}.ph,.pf,.pwm{position:static;transform:none}.pwm{display:none}}
</style></head><body>
${b.logo ? `<img class="pwm" src="${esc(b.logo)}" alt=""/>` : ""}
<div class="ph">${materialHeader(b)}</div>
<div class="pf">${materialFooter(b)}</div>
${doc}
<script>window.onload=()=>setTimeout(()=>print(),500)</script></body></html>`;
}
