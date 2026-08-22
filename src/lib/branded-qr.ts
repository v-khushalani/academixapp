// Composites the bare UPI QR into a branded, share-ready payment card.
// Minimal, elegant, monochrome — institute logo + name on top, Academix credit
// at the bottom. Fixed 1080x1350 canvas so nothing crops on any phone.

export type BrandedQrInput = {
  qrCanvas: HTMLCanvasElement;
  instituteName: string;
  logoUrl?: string | null;
  studentName: string;
  description?: string | null;
  amountLabel: string;
  upiId?: string | null;
};

const W = 1080;
const H = 1350;
const INK = "#0f172a";
const MUTED = "#8a94a6";
const LINE = "#e6e9ef";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function font(ctx: CanvasRenderingContext2D, weight: string, size: number) {
  ctx.font = `${weight} ${size}px Saira, system-ui, sans-serif`;
}

/** Shrinks the font until the text fits maxWidth. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight: string,
) {
  let size = startPx;
  font(ctx, weight, size);
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 2;
    font(ctx, weight, size);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the branded card and returns it as a PNG File ready for share/download. */
export async function brandedQrFile(input: BrandedQrInput): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "middle";

  // ---- Header: logo + institute name, centred, quiet ----
  let y = 120;
  if (input.logoUrl) {
    const logo = await loadImage(input.logoUrl);
    if (logo) {
      const box = 120;
      const cx = W / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, y, box / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - box / 2, y - box / 2, box, box);
      const ratio = Math.max(box / logo.width, box / logo.height);
      const dw = logo.width * ratio;
      const dh = logo.height * ratio;
      ctx.drawImage(logo, cx - dw / 2, y - dh / 2, dw, dh);
      ctx.restore();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, y, box / 2, 0, Math.PI * 2);
      ctx.stroke();
      y += 108;
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  fitFont(ctx, input.instituteName || "Academy", W - 200, 52, "600");
  ctx.fillText(input.instituteName || "Academy", W / 2, y);

  y += 46;
  font(ctx, "400", 26);
  ctx.fillStyle = MUTED;
  ctx.fillText("FEE PAYMENT", W / 2, y);

  // hairline
  y += 46;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(W - 140, y);
  ctx.stroke();

  // ---- Who + what ----
  y += 66;
  ctx.fillStyle = INK;
  fitFont(ctx, input.studentName, W - 200, 42, "500");
  ctx.fillText(input.studentName, W / 2, y);

  y += 42;
  font(ctx, "400", 26);
  ctx.fillStyle = MUTED;
  ctx.fillText(input.description || "Fees", W / 2, y);

  // ---- Amount ----
  y += 92;
  ctx.fillStyle = INK;
  fitFont(ctx, input.amountLabel, W - 240, 96, "700");
  ctx.fillText(input.amountLabel, W / 2, y);

  // ---- QR panel ----
  const qrSize = 420;
  const panelW = qrSize + 120;
  const panelH = qrSize + 190;
  const panelX = (W - panelW) / 2;
  const panelY = y + 70;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();
  ctx.stroke();

  ctx.drawImage(input.qrCanvas, W / 2 - qrSize / 2, panelY + 60, qrSize, qrSize);

  ctx.fillStyle = MUTED;
  font(ctx, "400", 24);
  ctx.fillText("Scan with any UPI app", W / 2, panelY + 34);
  if (input.upiId) {
    ctx.fillStyle = INK;
    font(ctx, "500", 26);
    ctx.fillText(input.upiId, W / 2, panelY + 60 + qrSize + 50);
  }

  // ---- Footer credit ----
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, H - 132);
  ctx.lineTo(W - 140, H - 132);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  font(ctx, "400", 24);
  ctx.fillText("Powered by Academix", W / 2, H - 84);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return null;
  const safe = input.studentName.replace(/\s+/g, "-").toLowerCase();
  return new File([blob], `payment-${safe}.png`, { type: "image/png" });
}
