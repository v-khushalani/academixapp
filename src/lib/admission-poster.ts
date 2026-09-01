import jsPDF from "jspdf";

export type AdmissionPosterInput = {
  svg: SVGSVGElement;
  kind: "Enquiry" | "Admission";
  url: string;
  instituteName: string;
  logoUrl?: string | null;
};

const WIDTH = 1240;
const HEIGHT = 1754;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function downloadBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(href);
}

export async function buildAdmissionPoster(
  input: AdmissionPosterInput,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Poster canvas is unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#0f2742";
  ctx.fillRect(0, 0, WIDTH, 22);
  ctx.textAlign = "center";
  ctx.fillStyle = "#172033";
  ctx.font = "700 58px Saira, sans-serif";

  let titleY = 140;
  if (input.logoUrl) {
    const logo = await loadImage(input.logoUrl);
    if (logo) {
      const side = 116;
      ctx.drawImage(logo, WIDTH / 2 - side / 2, 68, side, side);
      titleY = 245;
    }
  }
  ctx.fillText(input.instituteName || "Academix", WIDTH / 2, titleY);
  ctx.fillStyle = "#64748b";
  ctx.font = "500 30px Saira, sans-serif";
  ctx.fillText("Powered by Academix", WIDTH / 2, titleY + 52);

  ctx.fillStyle = "#172033";
  ctx.font = "700 82px Saira, sans-serif";
  ctx.fillText(
    input.kind === "Admission" ? "Apply for admission" : "Send an enquiry",
    WIDTH / 2,
    430,
  );
  ctx.fillStyle = "#64748b";
  ctx.font = "400 34px Saira, sans-serif";
  ctx.fillText("Open your camera and scan the code", WIDTH / 2, 495);

  const xml = new XMLSerializer().serializeToString(input.svg);
  const qr = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
  if (!qr) throw new Error("Could not prepare the QR code");
  const qrSide = 680;
  const qrX = (WIDTH - qrSide) / 2;
  const qrY = 590;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#dce2ea";
  ctx.lineWidth = 4;
  ctx.fillRect(qrX - 38, qrY - 38, qrSide + 76, qrSide + 76);
  ctx.strokeRect(qrX - 38, qrY - 38, qrSide + 76, qrSide + 76);
  ctx.drawImage(qr, qrX, qrY, qrSide, qrSide);

  ctx.fillStyle = "#172033";
  ctx.font = "600 36px Saira, sans-serif";
  ctx.fillText(
    input.kind === "Admission" ? "Complete your admission form" : "Share five quick details",
    WIDTH / 2,
    1410,
  );
  ctx.fillStyle = "#64748b";
  ctx.font = "400 24px Saira, sans-serif";
  const shortUrl = input.url.replace(/^https?:\/\//, "");
  ctx.fillText(shortUrl.length > 74 ? `${shortUrl.slice(0, 71)}…` : shortUrl, WIDTH / 2, 1470);
  ctx.fillStyle = "#0f2742";
  ctx.fillRect(100, 1570, WIDTH - 200, 2);
  ctx.font = "500 26px Saira, sans-serif";
  ctx.fillText("Admissions powered securely by Academix", WIDTH / 2, 1635);
  return canvas;
}

export async function downloadAdmissionPoster(input: AdmissionPosterInput, format: "png" | "pdf") {
  const canvas = await buildAdmissionPoster(input);
  const name = `${input.kind.toLowerCase()}-counter-poster`;
  if (format === "png") {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not create poster image");
    downloadBlob(blob, `${name}.png`);
    return;
  }
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297, undefined, "FAST");
  pdf.save(`${name}.pdf`);
}

export async function printAdmissionPoster(input: AdmissionPosterInput) {
  const canvas = await buildAdmissionPoster(input);
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) throw new Error("Allow pop-ups to print the poster");
  popup.document.write(
    `<title>${input.kind} poster</title><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block}</style><img alt="${input.kind} poster" src="${canvas.toDataURL("image/png")}">`,
  );
  popup.document.close();
  popup.onload = () => popup.print();
}
