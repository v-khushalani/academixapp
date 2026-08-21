// Composites the bare UPI QR into a branded, share-ready payment card.
// Fixed 1080x1350 canvas with generous margins so nothing crops on any phone.

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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight = "600",
) {
  let size = startPx;
  do {
    ctx.font = `${weight} ${size}px Saira, system-ui, sans-serif`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 18);
  return text;
}

/** Draws the branded card and returns it as a PNG File ready for share/download. */
export async function brandedQrFile(input: BrandedQrInput): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Header band
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, 210);

  let textX = 72;
  if (input.logoUrl) {
    const logo = await loadImage(input.logoUrl);
    if (logo) {
      const box = 110;
      ctx.save();
      ctx.beginPath();
      ctx.arc(72 + box / 2, 105, box / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(72, 50, box, box);
      const ratio = Math.max(box / logo.width, box / logo.height);
      const dw = logo.width * ratio;
      const dh = logo.height * ratio;
      ctx.drawImage(logo, 72 + (box - dw) / 2, 50 + (box - dh) / 2, dw, dh);
      ctx.restore();
      textX = 72 + box + 28;
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const name = fitText(ctx, input.instituteName || "Academy", W - textX - 72, 52, "700");
  ctx.fillText(name, textX, 92);
  ctx.font = "400 26px Saira, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Fee payment", textX, 138);

  // Student + purpose
  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  fitText(ctx, input.studentName, W - 160, 46, "600");
  ctx.fillText(input.studentName, W / 2, 292);
  ctx.font = "400 28px Saira, system-ui, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(input.description || "Fees", W / 2, 340);

  // Amount
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 84px Saira, system-ui, sans-serif";
  ctx.fillText(input.amountLabel, W / 2, 430);

  // QR panel
  const panelX = 150;
  const panelY = 500;
  const panelW = W - panelX * 2;
  const panelH = 620;
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  const r = 32;
  ctx.beginPath();
  ctx.moveTo(panelX + r, panelY);
  ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, r);
  ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, r);
  ctx.arcTo(panelX, panelY + panelH, panelX, panelY, r);
  ctx.arcTo(panelX, panelY, panelX + panelW, panelY, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const qrSize = 460;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(W / 2 - qrSize / 2 - 12, panelY + 40 - 12, qrSize + 24, qrSize + 24);
  ctx.drawImage(input.qrCanvas, W / 2 - qrSize / 2, panelY + 40, qrSize, qrSize);

  ctx.fillStyle = "#0f172a";
  ctx.font = "500 30px Saira, system-ui, sans-serif";
  ctx.fillText("Scan with any UPI app", W / 2, panelY + 40 + qrSize + 50);
  if (input.upiId) {
    ctx.fillStyle = "#64748b";
    ctx.font = "400 26px Saira, system-ui, sans-serif";
    ctx.fillText(input.upiId, W / 2, panelY + 40 + qrSize + 92);
  }

  // Footer strip
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, H - 96, W, 96);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 28px Saira, system-ui, sans-serif";
  ctx.fillText("Powered by Academix", W / 2, H - 48);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return null;
  const safe = input.studentName.replace(/\s+/g, "-").toLowerCase();
  return new File([blob], `payment-${safe}.png`, { type: "image/png" });
}
