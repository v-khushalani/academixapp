import { QRCodeCanvas } from "qrcode.react";
import { useRef, forwardRef, useImperativeHandle } from "react";
import { getInstitute } from "@/lib/academy-settings";
import { inr } from "@/lib/payments";

interface BrandedQRProps {
  upiLink: string;
  amount: number;
  studentName: string;
  description?: string;
}

export interface BrandedQRHandle {
  toBlob: () => Promise<Blob | null>;
}

export const BrandedQR = forwardRef<BrandedQRHandle, BrandedQRProps>(
  ({ upiLink, amount, studentName, description }, ref) => {
    const inst = getInstitute();
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      toBlob: async () => {
        if (!containerRef.current) return null;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const width = 800;
        const height = 1000;
        canvas.width = width;
        canvas.height = height;

        // 1. Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // 2. Header Branding
        ctx.fillStyle = inst.primary_color || "#3b82f6";
        ctx.fillRect(0, 0, width, 180);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 52px Saira, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(inst.name.toUpperCase(), width / 2, 90);

        ctx.font = "28px Saira, sans-serif";
        ctx.fillText(inst.tagline || "Institute Excellence", width / 2, 135);

        // 3. Payment Details
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 36px Saira, sans-serif";
        ctx.fillText(`PAYMENT FOR ${studentName.toUpperCase()}`, width / 2, 260);

        ctx.font = "32px Saira, sans-serif";
        ctx.fillText(description || "Course Fees", width / 2, 310);

        ctx.fillStyle = inst.primary_color || "#3b82f6";
        ctx.font = "bold 84px Saira, sans-serif";
        ctx.fillText(inr(amount), width / 2, 420);

        // 4. QR Code
        const qrCanvas = containerRef.current.querySelector("canvas");
        if (qrCanvas) {
          const qrSize = 400;
          const qrX = (width - qrSize) / 2;
          const qrY = 480;

          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 2;
          ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

          ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        }

        // 5. Footer
        ctx.fillStyle = "#64748b";
        ctx.font = "24px Saira, sans-serif";
        ctx.fillText("Scan with any UPI app", width / 2, 920);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 22px Saira, sans-serif";
        ctx.fillText("POWERED BY ACADEMIX", width / 2, 960);

        return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1.0));
      },
    }));

    return (
      <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div className="text-center space-y-1">
          <h3 className="font-bold text-xl text-slate-900">{inst.name}</h3>
          <p className="text-sm text-muted-foreground">{inst.tagline}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg w-full text-center border border-slate-100">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
            Payment Amount
          </p>
          <p className="text-3xl font-bold text-primary">{inr(amount)}</p>
        </div>

        <div ref={containerRef} className="bg-white p-2 rounded-lg border shadow-sm">
          <QRCodeCanvas value={upiLink} size={200} includeMargin />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{studentName}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="pt-4 mt-2 border-t w-full text-center">
          <span className="text-[10px] font-bold text-slate-300 tracking-[0.3em]">
            POWERED BY ACADEMIX
          </span>
        </div>
      </div>
    );
  },
);

BrandedQR.displayName = "BrandedQR";
