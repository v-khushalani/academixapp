import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, Download, MessageCircle, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inr, upiLink } from "@/lib/payments";
import { downloadReceipt, receiptFile, type ReceiptInput } from "@/lib/receipt";
import { getInstitute } from "@/lib/academy-settings";
import { formatDate } from "@/lib/dates";
import { openWhatsApp } from "@/lib/whatsapp";
import { brandedQrFile } from "@/lib/branded-qr";
import { logMessage } from "@/lib/api/messages";
import { feesApi } from "@/lib/api";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";

export type PaymentTarget = {
  id: string;
  student_name: string;
  admission_no?: string | null;
  class_name?: string | null;
  batch_name?: string | null;
  description?: string | null;
  amount: number;
  amount_paid: number;
  due_date?: string | null;
  paid_date?: string | null;
  receipt_no?: string | null;
  phone?: string | null;
};

const MODES = ["Cash", "UPI", "Bank transfer", "Cheque", "Card"] as const;

export function PaymentDialog({
  target,
  onOpenChange,
}: {
  target: PaymentTarget | null;
  onOpenChange: (v: boolean) => void;
}) {
  const dueDefault = target ? Math.max(Number(target.amount) - Number(target.amount_paid), 0) : 0;
  const [amount, setAmount] = useState<string>(dueDefault ? String(dueDefault) : "");
  const [mode, setMode] = useState<string>("Cash");
  const [collected, setCollected] = useState<number | null>(null);
  const value = Number(amount) || 0;
  const inst = getInstitute();
  const refresh = useRefreshLinked();
  const qrRef = useRef<HTMLDivElement>(null);

  // Pre-fill the pending amount whenever a new fee row is opened; after that the
  // field is fully the user's — they can clear it down to the last digit.
  useEffect(() => {
    setAmount(dueDefault ? String(dueDefault) : "");
    setMode("Cash");
    setCollected(null);
  }, [target?.id, dueDefault]);

  const collect = useMutation({
    mutationFn: (v: { id: string; received: number }) => feesApi.collect(v.id, v.received, mode),
    onSuccess: (_d, v) => {
      toast.success("Payment recorded");
      refresh();
      setCollected(v.received);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const link = useMemo(
    () =>
      target
        ? upiLink({
            amount: value,
            note: `${target.student_name} · ${target.description ?? "Fees"}`,
            refId: target.id,
          })
        : null,
    [target, value],
  );

  if (!target) return null;

  const receipt: ReceiptInput = {
    receipt_no: target.receipt_no,
    student_name: target.student_name,
    admission_no: target.admission_no,
    class_name: target.class_name,
    batch_name: target.batch_name,
    description: target.description,
    amount: Number(target.amount),
    amount_paid: Number(target.amount_paid) + (collected ?? 0),
    due_date: target.due_date,
    paid_date: new Date().toISOString().slice(0, 10),
    method: mode,
    received_now: collected ?? 0,
  };

  function close() {
    setAmount(dueDefault ? String(dueDefault) : "");
    setCollected(null);
    onOpenChange(false);
  }

  /** Branded payment card (logo, institute name, amount, QR, Academix footer). */
  async function qrImage(): Promise<File | null> {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return null;
    try {
      return await brandedQrFile({
        qrCanvas: canvas,
        instituteName: inst.name,
        logoUrl: inst.logo_url || null,
        studentName: target!.student_name,
        description: target!.description ?? "Fees",
        amountLabel: inr(value),
        upiId: inst.upi_id || null,
      });
    } catch {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return null;
      return new File([blob], `pay-${target!.student_name.replace(/\s+/g, "-")}.png`, {
        type: "image/png",
      });
    }
  }

  async function sendPaymentQr() {
    const caption = `Hello, please pay ${inr(value)} towards ${target!.student_name}'s fees.\n\nScan the attached QR with any UPI app.\nUPI ID: ${inst.upi_id}\n\n— ${inst.name}\n(Powered by Academix)`;
    const img = await qrImage();
    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean;
      share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void>;
    };
    if (img && nav.canShare?.({ files: [img] }) && nav.share) {
      try {
        await nav.share({ files: [img], text: caption, title: "Payment QR" });
        return;
      } catch {
        /* cancelled — fall through */
      }
    }
    if (img) {
      const url = URL.createObjectURL(img);
      const a = document.createElement("a");
      a.href = url;
      a.download = img.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("QR image saved — attach it in WhatsApp");
    }
    const okQr = openWhatsApp(target!.phone, caption);
    logMessage([
      {
        kind: "fee_reminder",
        title: "Payment QR",
        message: caption,
        status: okQr ? "sent" : "failed",
        recipient_name: target!.student_name,
        recipient_phone: target!.phone ?? null,
        fee_id: target!.id,
      },
    ]);
    if (!okQr) toast.error("No phone number on file.");
  }

  async function sendReceipt() {
    const { file, no } = await receiptFile(receipt);
    const text = `Receipt ${no} — ${inr(collected ?? 0)} received towards ${target!.student_name}'s fees. Thank you. — ${inst.name}`;
    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean;
      share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], text, title: `Receipt ${no}` });
        logMessage([
          {
            kind: "fee_receipt",
            title: `Receipt ${no}`,
            message: text,
            recipient_name: target!.student_name,
            recipient_phone: target!.phone ?? null,
            fee_id: target!.id,
          },
        ]);
        return;
      } catch {
        /* user cancelled — fall through to WhatsApp text */
      }
    }
    await downloadReceipt(receipt);
    const okReceipt = openWhatsApp(
      target!.phone,
      `${text}\n\n(Receipt PDF attached from your downloads.)`,
    );
    logMessage([
      {
        kind: "fee_receipt",
        title: `Receipt ${no}`,
        message: text,
        status: okReceipt ? "sent" : "failed",
        recipient_name: target!.student_name,
        recipient_phone: target!.phone ?? null,
        fee_id: target!.id,
      },
    ]);
    if (!okReceipt) toast.error("No phone number on file.");
  }

  // ---- phase 2: money is in, now the receipt ------------------------------
  if (collected !== null) {
    return (
      <Dialog open onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" /> {inr(collected)} received
            </DialogTitle>
            <DialogDescription>
              {target.student_name} · {formatDate(new Date())} · {mode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="secondary"
              className="w-full gap-1.5"
              onClick={async () => {
                const no = await downloadReceipt(receipt);
                toast.success(`Receipt ${no} downloaded`);
              }}
            >
              <Download className="h-4 w-4" /> Download receipt (PDF)
            </Button>
            <Button className="w-full gap-1.5" onClick={sendReceipt}>
              <MessageCircle className="h-4 w-4" /> Send receipt on WhatsApp
            </Button>
            <Button variant="ghost" className="w-full" onClick={close}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> Collect payment
          </DialogTitle>
          <DialogDescription>
            {target.student_name} · balance {inr(dueDefault)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Amount to collect</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onFocus={(e) => {
                  const el = e.currentTarget;
                  requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
                }}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {link ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div ref={qrRef}>
                <QRCodeCanvas value={link} size={168} includeMargin />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Scan with any UPI app · pays {inst.upi_id}
              </p>
              <div className="flex w-full flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast.success("UPI link copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy link
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={sendPaymentQr}>
                  <MessageCircle className="h-3.5 w-3.5" /> Send QR on WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Add your institute UPI ID in <strong>Settings → Institute</strong> to show a payment
              QR here.
            </p>
          )}

          <Button
            className="w-full gap-1.5"
            disabled={collect.isPending || value <= 0}
            onClick={() => collect.mutate({ id: target.id, received: value })}
          >
            <Check className="h-4 w-4" />
            {collect.isPending ? "Saving…" : `Mark ${inr(value)} received`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Receipt banega payment mark karne ke baad.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
