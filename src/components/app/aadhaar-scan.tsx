import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  parseAadhaarQr,
  aadhaarFingerprint,
  SAMPLE_AADHAAR,
  type AadhaarProfile,
} from "@/lib/aadhaar";

async function waitForVideo(
  ref: React.MutableRefObject<HTMLVideoElement | null>,
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
  const [manual, setManual] = useState("");

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function accept(raw: string) {
    const profile = parseAadhaarQr(raw);
    if (!profile) {
      toast.error("That doesn't look like an Aadhaar QR. Try again in better light.");
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
  }

  async function startCamera() {
    setLive(true);
    try {
      const { default: QrScanner } = await import("qr-scanner");
      // Wait for React to actually mount the <video> element before wiring it up,
      // otherwise the scanner attaches to nothing and the box stays black.
      const video = await waitForVideo(videoRef);
      if (!video) throw new Error("no video element");
      const scanner = new QrScanner(video, (res) => void accept(res.data), {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 4,
        preferredCamera: "environment",
      });
      scannerRef.current = scanner as unknown as { stop: () => void; destroy: () => void };
      await scanner.start();
      // iOS/iPadOS sometimes leaves the stream paused after start().
      try {
        await video.play();
      } catch {
        /* autoplay policies — the stream is still attached */
      }
    } catch {
      stopCamera();
      toast.error(
        "Couldn't open the camera. Allow camera access for this site, or upload a photo of the card instead.",
      );
    }
  }

  async function onFile(file: File) {
    try {
      const { default: QrScanner } = await import("qr-scanner");
      const res = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      await accept(res.data);
    } catch {
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
        <div className="mt-3 overflow-hidden rounded-md bg-black">
          <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {live ? (
          <Button type="button" variant="secondary" size="sm" onClick={stopCamera}>
            Stop camera
          </Button>
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            void aadhaarFingerprint(`demo-${SAMPLE_AADHAAR.last4}`).then((hash) =>
              onVerified({ profile: SAMPLE_AADHAAR, hash }),
            )
          }
        >
          Simulate scan (demo)
        </Button>
        {onSkip && (
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            Fill manually
          </Button>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or paste the QR text from an e-Aadhaar PDF"
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!manual.trim()}
          onClick={() => void accept(manual)}
        >
          Read
        </Button>
      </div>
    </div>
  );
}
