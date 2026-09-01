import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, Keyboard, LoaderCircle, ShieldCheck, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  parseAadhaarQr,
  aadhaarFingerprint,
  isValidAadhaarNumber,
  formatAadhaar,
  type AadhaarProfile,
} from "@/lib/aadhaar";

async function waitForVideo(ref: {
  current: HTMLVideoElement | null;
}): Promise<HTMLVideoElement | null> {
  for (let i = 0; i < 30; i++) {
    if (ref.current) return ref.current;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  return ref.current;
}

export type AadhaarResult = {
  profile: AadhaarProfile;
  hash: string;
  /** how the identity was captured — QR scan, typed number, or no Aadhaar at all */
  source: "qr" | "number" | "manual";
};

type Props = {
  value: AadhaarResult | null;
  onVerified: (r: AadhaarResult) => void;
  /** called when the applicant has no Aadhaar and fills everything by hand */
  onSkip?: () => void;
};

const emptyProfile: AadhaarProfile = {
  name: "",
  dob: "",
  gender: "",
  address: "",
  last4: "",
  photo: "",
};

/**
 * Aadhaar capture with three paths, in order of confidence:
 *  1. Secure QR scan (camera or photo upload) — offline, free, auto-fills.
 *  2. Typed Aadhaar number — checksum-validated, we keep only the last 4 digits.
 *  3. No Aadhaar — everything is filled by hand.
 */
export function AadhaarScan({ value, onVerified, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const sweepRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "reading">("idle");
  const [cameraHint, setCameraHint] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [zoom, setZoom] = useState<{ min: number; max: number; step: number; value: number } | null>(
    null,
  );
  const [manual, setManual] = useState(false);
  const [number, setNumber] = useState("");

  useEffect(() => {
    return () => {
      if (sweepRef.current) window.clearInterval(sweepRef.current);
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function accept(raw: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus("reading");
    const profile = parseAadhaarQr(raw);
    if (!profile) {
      busyRef.current = false;
      setStatus(live ? "scanning" : "idle");
      toast.error("QR found, but it is not a supported Aadhaar Secure QR.");
      return;
    }
    const hash = await aadhaarFingerprint(raw);
    stopCamera();
    busyRef.current = false;
    onVerified({ profile, hash, source: "qr" });
    toast.success("Aadhaar read — please check the details below");
  }

  function stopCamera() {
    if (sweepRef.current) window.clearInterval(sweepRef.current);
    sweepRef.current = null;
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setLive(false);
    setTorchOn(false);
    setHasTorch(false);
    setZoom(null);
    setStatus("idle");
  }

  function track(): MediaStreamTrack | null {
    const video = videoRef.current;
    if (!video || !(video.srcObject instanceof MediaStream)) return null;
    return video.srcObject.getVideoTracks()[0] ?? null;
  }

  async function toggleTorch() {
    const t = track();
    if (!t) return;
    try {
      await t.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn((x) => !x);
    } catch {
      toast.message("This device does not allow torch control.");
    }
  }

  async function applyZoom(next: number) {
    const t = track();
    if (!t) return;
    try {
      await t.applyConstraints({ advanced: [{ zoom: next } as MediaTrackConstraintSet] });
      setZoom((z) => (z ? { ...z, value: next } : z));
    } catch {
      /* ignore */
    }
  }

  async function startCamera() {
    setManual(false);
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
        maxScansPerSecond: 10,
        preferredCamera: "environment",
        returnDetailedScanResult: true,
        // Aadhaar's secure QR is extremely dense. The library default crops to a
        // small centred square and downscales it to 400px, which destroys the
        // modules — we scan the full frame at native resolution instead.
        calculateScanRegion: (v) => {
          const width = v.videoWidth || 1920;
          const height = v.videoHeight || 1080;
          return {
            x: 0,
            y: 0,
            width,
            height,
            downScaledWidth: width,
            downScaledHeight: height,
          };
        },
      });
      scannerRef.current = scanner as unknown as { stop: () => void; destroy: () => void };
      await scanner.start();
      // Ask the camera for the sharpest stream it can give us.
      const t = track();
      try {
        await t?.applyConstraints({
          width: { ideal: 2560 },
          height: { ideal: 1440 },
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        });
      } catch {
        /* device doesn't support these hints — default stream is fine */
      }
      const caps = (
        t?.getCapabilities?.() as (MediaTrackCapabilities & {
          torch?: boolean;
          zoom?: { min: number; max: number; step: number };
        }) | undefined
      ) ?? undefined;
      setHasTorch(Boolean(caps?.torch));
      if (caps?.zoom && caps.zoom.max > caps.zoom.min) {
        const start = Math.min(caps.zoom.max, caps.zoom.min + (caps.zoom.max - caps.zoom.min) * 0.2);
        setZoom({
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step || 0.1,
          value: start,
        });
        void applyZoom(start);
      }
      const settings = t?.getSettings();
      if ((settings?.width ?? 0) < 1280) {
        setCameraHint(
          "Camera resolution is low. Use bright, even light — or type the Aadhaar number instead.",
        );
      }
      // iOS/iPadOS sometimes leaves the stream paused after start().
      try {
        await video.play();
      } catch {
        /* autoplay policies — the stream is still attached */
      }
      setStatus("scanning");
      // Belt and braces: the library's own loop downsizes frames on some
      // phones. Every second we also grab a full-resolution frame and run the
      // contrast-boosted decoder used for uploaded photos.
      sweepRef.current = window.setInterval(() => {
        if (busyRef.current) return;
        void sweepFrame();
      }, 1000);
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
      for (const threshold of [150, 185, 115, 205, 95]) {
        const adjusted = new ImageData(
          new Uint8ClampedArray(image.data),
          image.width,
          image.height,
        );
        for (let i = 0; i < adjusted.data.length; i += 4) {
          const lum =
            adjusted.data[i] * 0.299 + adjusted.data[i + 1] * 0.587 + adjusted.data[i + 2] * 0.114;
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

  function frameCanvas(): HTMLCanvasElement | null {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    return canvas;
  }

  /** Background pass — silent when it fails, so the live scan keeps running. */
  async function sweepFrame() {
    const canvas = frameCanvas();
    if (!canvas) return;
    busyRef.current = true;
    try {
      const res = await scanCanvas(canvas);
      busyRef.current = false;
      await accept(res.data);
    } catch {
      busyRef.current = false;
    }
  }

  /** Explicit capture — tells the user when the frame was unreadable. */
  async function captureFrame() {
    const canvas = frameCanvas();
    if (!canvas) return;
    setStatus("reading");
    busyRef.current = true;
    try {
      const res = await scanCanvas(canvas);
      busyRef.current = false;
      await accept(res.data);
    } catch {
      busyRef.current = false;
      setStatus("scanning");
      toast.error("Couldn't read the QR. Fill the frame with just the QR, avoid glare, try again.");
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

  async function submitNumber() {
    const digits = number.replace(/\D/g, "");
    if (!isValidAadhaarNumber(digits)) {
      toast.error("That does not look like a valid Aadhaar number. Please re-check the 12 digits.");
      return;
    }
    const hash = await aadhaarFingerprint(digits);
    onVerified({
      profile: { ...emptyProfile, last4: digits.slice(-4) },
      hash,
      source: "number",
    });
    toast.success("Aadhaar number recorded — please fill the details below");
  }

  if (value) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Check className="h-4 w-4" />
          {value.source === "manual"
            ? "Continuing without Aadhaar"
            : `Aadhaar ${value.source === "qr" ? "verified" : "recorded"} — XXXX XXXX ${value.profile.last4 || "••••"}`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {value.source === "qr"
            ? "Details below were filled from the card. Change anything that is out of date — we record what you edited."
            : "Please fill the details below yourself. The office will verify them at the counter."}
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
            <video
              ref={videoRef}
              className="aspect-[3/4] max-h-[70dvh] w-full object-cover sm:aspect-video"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="aspect-square w-[78%] max-w-sm rounded-lg border-2 border-primary-foreground/90 outline-[999px] outline-foreground/50" />
            </div>
            {hasTorch && (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                className={`absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full border border-border/60 backdrop-blur ${
                  torchOn ? "bg-primary text-primary-foreground" : "bg-background/70"
                }`}
                aria-label="Toggle torch"
              >
                <Zap className="h-4 w-4" />
              </button>
            )}
          </div>
          {zoom && (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              Zoom
              <input
                type="range"
                className="flex-1 accent-[var(--primary)]"
                min={zoom.min}
                max={zoom.max}
                step={zoom.step}
                value={zoom.value}
                onChange={(e) => void applyZoom(Number(e.target.value))}
              />
            </label>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            Fill the frame with the QR square only, hold steady 10–15 cm away, avoid glare.{" "}
            {status === "reading" ? "Reading…" : "Scanning automatically…"}
          </p>
          {cameraHint && <p className="text-center text-[11px] text-warning">{cameraHint}</p>}
        </div>
      )}

      {manual && !live && (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">
            Type the 12-digit Aadhaar number from the card. We check it locally and keep only the
            last 4 digits — the rest of the details you fill yourself.
          </p>
          <Input
            inputMode="numeric"
            autoComplete="off"
            placeholder="1234 5678 9012"
            value={number}
            onChange={(e) => setNumber(formatAadhaar(e.target.value))}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" onClick={() => void submitNumber()}>
              Use this number
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setManual(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {live ? (
          <>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => void captureFrame()}
              disabled={status === "reading"}
            >
              {status === "reading" ? (
                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-1.5 h-4 w-4" />
              )}{" "}
              Capture sharp frame
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

        {!manual && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              stopCamera();
              setManual(true);
            }}
          >
            <Keyboard className="mr-1.5 h-4 w-4" /> Type Aadhaar number
          </Button>
        )}

        {onSkip && (
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            No Aadhaar — fill manually
          </Button>
        )}
      </div>
    </div>
  );
}
