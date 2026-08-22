import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, LoaderCircle, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  parseAadhaarQr,
  aadhaarFingerprint,
  type AadhaarProfile,
} from "@/lib/aadhaar";

async function waitForVideo(
  ref: { current: HTMLVideoElement | null },
): Promise<HTMLVideoElement | null> {
  for (let i = 0; i < 30; i++) {
    if (ref.current) return ref.current;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  return ref.current;
}

export type AadhaarResult = {
  profile: AadhaarProfile;
  hash: string;
};

type Props = {
  value: AadhaarResult | null;
  onVerified: (r: AadhaarResult) => void;
  onSkip?: () => void;
};

/**
 * Scans the QR printed on the Aadhaar card / e-Aadhaar PDF. Works fully offline
 * — no UIDAI API, no cost. The applicant can still edit anything we auto-fill.
 */
export function AadhaarScan({ value, onVerified, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "reading">("idle");
  const [cameraHint, setCameraHint] = useState("");

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function accept(raw: string) {
    setStatus("reading");
    const profile = parseAadhaarQr(raw);
    if (!profile) {
      setStatus(live ? "scanning" : "idle");
      toast.error("QR found, but it is not a supported Aadhaar Secure QR.");
      return;
    }
    const hash = await aadhaarFingerprint(raw);
    stopCamera();
    onVerified({ profile, hash });
    toast.success("Aadhaar read — please check the details below");
  }

  function stopCamera() {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setLive(false);
    setStatus("idle");
  }

  async function startCamera() {
    setLive(true);
    setStatus("starting");
    setCameraHint("");
    try {
      const { default: QrScanner } = await import("qr-scanner");
      // Wait for React to actually mount the <video> element before wiring it up,
      // otherwise the scanner attaches to nothing and the box stays black.
      const video = await waitForVideo(videoRef);
      if (!video) throw new Error("no video element");
      const scanner = new QrScanner(video, (res) => void accept(res.data), {
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 8,
        preferredCamera: "environment",
        returnDetailedScanResult: true,
        // Aadhaar's secure QR is extremely dense. The library default crops to a
        // small centred square and downscales it to 400px, which destroys the
        // modules — we scan the full frame at high resolution instead.
        calculateScanRegion: (v) => {
          const width = v.videoWidth || 1920;
          const height = v.videoHeight || 1080;
          const scale = Math.min(1, 1920 / width);
          return { x: 0, y: 0, width, height, downScaledWidth: Math.round(width * scale), downScaledHeight: Math.round(height * scale) };
        },
      });
      scannerRef.current = scanner as unknown as { stop: () => void; destroy: () => void };
      await scanner.start();
      // Ask the camera for the sharpest stream it can give us.
      try {
        const track = video.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks()[0] : null;
        await track?.applyConstraints({
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        });
      } catch {
        /* device doesn't support these hints — default stream is fine */
      }
      const track = video.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks()[0] : null;
      const settings = track?.getSettings();
      if ((settings?.width ?? 0) < 1000) {
        setCameraHint("Camera resolution is low. Use good light or upload a close, sharp photo for best results.");
      }
      // iOS/iPadOS sometimes leaves the stream paused after start().
      try {
        await video.play();
      } catch {
        /* autoplay policies — the stream is still attached */
      }
      setStatus("scanning");
    } catch {
      stopCamera();
      toast.error(
        "Couldn't open the camera. Allow camera access for this site, or upload a photo of the card instead.",
      );
    }
  }

  async function scanCanvas(canvas: HTMLCanvasElement) {
    const { default: QrScanner } = await import("qr-scanner");
    try {
      return await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
    } catch {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("No image context");
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (const threshold of [150, 185, 115]) {
        const adjusted = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
        for (let i = 0; i < adjusted.data.length; i += 4) {
          const lum = adjusted.data[i] * 0.299 + adjusted.data[i + 1] * 0.587 + adjusted.data[i + 2] * 0.114;
          const value = lum >= threshold ? 255 : 0;
          adjusted.data[i] = value;
          adjusted.data[i + 1] = value;
          adjusted.data[i + 2] = value;
        }
        ctx.putImageData(adjusted, 0, 0);
        try {
          return await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });
        } catch {
          // Try the next contrast threshold.
        }
      }
      ctx.putImageData(image, 0, 0);
      throw new Error("No QR found");
    }
  }

  /** Fallback: grab the current frame and decode it like an uploaded photo. */
  async function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setStatus("reading");
    try {
      const res = await scanCanvas(canvas);
      await accept(res.data);
    } catch {
      setStatus("scanning");
      toast.error("Couldn't read the QR. Hold the card steady, fill the frame, and try again.");
    }
  }


  async function onFile(file: File) {
    setStatus("reading");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const res = await scanCanvas(canvas);
      await accept(res.data);
    } catch {
      setStatus("idle");
      toast.error("No QR found in that image. Crop closer to the QR and retry.");
    }
  }

  if (value) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Check className="h-4 w-4" /> Aadhaar verified — XXXX XXXX {value.profile.last4 || "••••"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Details below were filled from the card. Change anything that is out of date — we record
          what you edited.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-primary" /> Scan Aadhaar to auto-fill
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Point the camera at the QR code on the Aadhaar card. We never store the Aadhaar number —
        only the last 4 digits.
      </p>

      {live && (
        <div className="mt-3 space-y-2">
          <div className="relative overflow-hidden rounded-md bg-foreground">
            <video ref={videoRef} className="aspect-[3/4] max-h-[70dvh] w-full object-contain sm:aspect-video" muted playsInline />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="aspect-square w-[78%] max-w-sm rounded-lg border-2 border-primary-foreground/90 outline-[999px] outline-foreground/50" />
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Hold the QR square inside the guide, keep still, and avoid glare. {status === "reading" ? "Reading…" : "Scanning automatically…"}
          </p>
          {cameraHint && <p className="text-center text-[11px] text-warning">{cameraHint}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {live ? (
          <>
             <Button type="button" size="sm" className="flex-1" onClick={() => void captureFrame()} disabled={status === "reading"}>
               {status === "reading" ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />} Capture sharp frame
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={stopCamera}>
              Stop camera
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" onClick={() => void startCamera()}>
            <Camera className="mr-1.5 h-4 w-4" /> Scan with camera
          </Button>
        )}

        <label>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <Button type="button" variant="outline" size="sm" asChild>
            <span>
              <Upload className="mr-1.5 h-4 w-4" /> Upload card photo
            </span>
          </Button>
        </label>
        {onSkip && (
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            Fill manually
          </Button>
        )}
      </div>

    </div>
  );
}
