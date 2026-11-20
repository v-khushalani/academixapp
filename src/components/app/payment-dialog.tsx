import { useFeatures } from "@/hooks/use-features";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, Download, MessageCircle, Printer, QrCode } from "lucide-react";
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
import { downloadReceipt, printReceipt, receiptFile, type ReceiptInput } from "@/lib/receipt";
import { getInstitute, getBrandedInstitute, getTemplates } from "@/lib/academy-settings";
import { formatDate } from "@/lib/dates";
import { openWhatsApp, renderTemplate } from "@/lib/whatsapp";
import { brandedQrFile } from "@/lib/branded-qr";
import { logMessage } from "@/lib/api/messages";
import { feesApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { isOn } = useFeatures();
  const dueDefault = target ? Math.max(Number(target.amount) - Number(target.amount_paid), 0) : 0;
  const [amount, setAmount] = useState<string>(dueDefault ? String(dueDefault) : "");
  const [mode, setMode] = useState<string>("Cash");
  const [collected, setCollected] = useState<number | null>(null);
  const value = Number(amount) || 0;
  const inst = getInstitute();
  const brand = getBrandedInstitute();
  const refresh = useRefreshLinked();
  const qrRef = useRef<HTMLDivElement>(null);
  const paymentRequest = useRef<{ signature: string; id: string } | null>(null);

  // Pre-fill the pending amount whenever a new fee row is opened; after that the
  // field is fully the user's — they can clear it down to the last digit.
  useEffect(() => {
    setAmount(dueDefault ? String(dueDefault) : "");
    setMode("Cash");
    setCollected(null);
    setCarry(true);
    setSettled(false);
  }, [target?.id, dueDefault]);

  const [carry, setCarry] = useState(true);
  const [settled, setSettled] = useState(false);
  const [fullMode, setFullMode] = useState(false);
  const [discount, setDiscount] = useState("");
  const [fullDone, setFullDone] = useState<{ received: number; discount: number } | null>(null);
  useEffect(() => {
    setFullMode(false);
    setDiscount("");
    setFullDone(null);
  }, [target?.id]);

  // Student's other open bills: needed for over-payment spillover and full settlement.
  const { data: openBills = [] } = useQuery({
    queryKey: ["fees", "open-for", target?.id],
    enabled: !!target?.id,
    queryFn: async () => {
      const { data: me } = await supabase.from("fees").select("student_id").eq("id", target!.id).maybeSingle();
      if (!me) return [];
      const { data } = await supabase
        .from("fees")
        .select("id, amount, amount_paid, installment_no, status")
        .eq("student_id", me.student_id)
        .not("status", "in", "(paid,cancelled,waived)");
      return (data ?? []).map((f) => ({ ...f, student_id: me.student_id }));
    },
  });
  const studentId = openBills[0]?.student_id as string | undefined;
  const totalBalance = openBills.reduce(
    (s, f) => s + Math.max(Number(f.amount) - Number(f.amount_paid || 0), 0),
    0,
  );
  const otherBalance = Math.max(totalBalance - dueDefault, 0);
  const discountValue = Math.min(Number(discount) || 0, Math.max(totalBalance - 1, 0));
  const overpay = value > dueDefault ? value - dueDefault : 0;

  const settleFull = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Student not found");
      const { data, error } = await supabase.rpc("settle_student_full" as never, {
        _student_id: studentId,
        _discount: discountValue,
        _method: mode,
        _reason: discountValue ? "Full-payment discount" : null,
      } as never);
      if (error) throw new Error(error.message);
      return data as unknown as { received: number; discount: number };
    },
    onSuccess: (r) => {
      toast.success(`Full fee closed · ${inr(r.received)} received${r.discount ? ` · ${inr(r.discount)} discount` : ""}`);
      refresh();
      setFullDone(r);
      setSettled(true);
      setCollected(Number(r.received));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const collect = useMutation({
    mutationFn: async (v: { id: string; received: number; carry: boolean }) => {
      // Over-payment: grow this bill to the amount received; the extra comes off the next bill.
      if (v.received > dueDefault) {
        const { error } = await supabase.rpc("revise_installment", {
          _fee_id: v.id,
          _new_amount: Number(target!.amount_paid) + v.received,
          _carry_forward: true,
          _reason: "Extra paid — taken off the next installment",
          _mode: "next",
        });
        if (error) throw new Error(error.message);
      }
      const signature = `${v.id}:${v.received}:${mode}:${v.carry}`;
      if (paymentRequest.current?.signature !== signature) {
        paymentRequest.current = { signature, id: crypto.randomUUID() };
      }
      const request = paymentRequest.current;
      if (!request) throw new Error("Payment request unavailable.");
      const { recordFeePayment } = await import("@/lib/payments.functions");
      return recordFeePayment({ data: {
        requestId: request.id, feeId: v.id, received: v.received, method: mode, carry: v.carry,
      } });
    },
    onSuccess: (_d, v) => {
      toast.success(
        v.carry
          ? `Payment recorded · balance ${inr(dueDefault - v.received)} moved forward`
          : v.received > dueDefault
            ? `Payment recorded · extra ${inr(v.received - dueDefault)} taken off the next installment`
            : "Payment recorded",
      );
      refresh();
      setSettled(v.carry);
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
    description: fullDone
      ? `Full fee — all installments${fullDone.discount ? ` (discount ${inr(fullDone.discount)})` : ""}`
      : target.description,
    amount: settled || collected !== null && collected > dueDefault ? Number(target.amount_paid) + (collected ?? 0) : Number(target.amount),
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
        instituteName: brand.name,
        logoUrl: brand.logo_url || null,
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
    // Same wording as the fee reminder template (edited in Communication),
    // plus the UPI details so the QR photo and message travel together.
    const base = renderTemplate(getTemplates().fee_pending, {
      parent_name: "Parent",
      student_name: target!.student_name,
      batch_name: target!.batch_name ?? "—",
      amount_due: value.toLocaleString("en-IN"),
      due_date: target!.due_date ? formatDate(target!.due_date) : "the earliest",
      academy_name: brand.name,
    });
    const caption = `${base}\n\nScan the attached QR with any UPI app to pay ${inr(value)}.\nUPI ID: ${inst.upi_id}`;
    const img = await qrImage();

    // Open the monitoring parent's chat directly (no contact picker); QR is copied/saved to attach.
    if (img) {
      let copied = false;
      try {
        await navigator.clipboard?.write?.([new ClipboardItem({ [img.type]: img })]);
        copied = true;
      } catch {
        const url = URL.createObjectURL(img);
        const a = document.createElement("a");
        a.href = url;
        a.download = img.name;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(
        copied
          ? "QR copied — press Ctrl+V in the chat to attach it, then send"
          : "QR saved — attach it in the chat, then send",
      );
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
    const text = renderTemplate(getTemplates().fee_received, {
      parent_name: "Parent",
      student_name: target!.student_name,
      amount_paid: (collected ?? 0).toLocaleString("en-IN"),
      paid_date: formatDate(new Date().toISOString()),
      receipt_no: no,
      academy_name: brand.name,
    });
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
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={async () => {
                await printReceipt(receipt);
                toast.success("Print dialog opened");
              }}
            >
              <Printer className="h-4 w-4" /> Print receipt
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
                  requestAnimationFrame(() =>
                    el.setSelectionRange(el.value.length, el.value.length),
                  );
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

          {!isOn("upi_qr_collection") ? null : link ? (
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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={sendPaymentQr}
                >
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

          {otherBalance > 0 ? (
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <label className="flex items-start gap-2">
                <Checkbox checked={fullMode} onCheckedChange={(v) => setFullMode(v === true)} />
                <span>
                  Pay full fee in one go <strong>({inr(totalBalance)})</strong>
                  <span className="block text-xs text-muted-foreground">
                    Closes every installment with one receipt.
                  </span>
                </span>
              </label>
              {fullMode ? (
                <div className="space-y-1.5">
                  <Label>One-time payment discount (₹)</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Collect <strong>{inr(totalBalance - discountValue)}</strong>
                    {discountValue ? ` (${inr(discountValue)} off)` : ""}
                  </p>
                  <Button
                    className="w-full gap-1.5"
                    disabled={settleFull.isPending}
                    onClick={() => settleFull.mutate()}
                  >
                    <Check className="h-4 w-4" />
                    {settleFull.isPending ? "Saving…" : `Mark ${inr(totalBalance - discountValue)} received`}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!fullMode && overpay > 0 ? (
            overpay <= otherBalance ? (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                Extra <strong>{inr(overpay)}</strong> will be taken off the next installment.
              </p>
            ) : (
              <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                More than the total balance of {inr(totalBalance)}.
              </p>
            )
          ) : null}

          {!fullMode && value > 0 && value < dueDefault ? (
            <label className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <Checkbox checked={carry} onCheckedChange={(v) => setCarry(v === true)} />
              <span>
                Baaki <strong>{inr(dueDefault - value)}</strong> agli installment me jod do
                <span className="block text-xs text-muted-foreground">
                  Ye installment {inr(Number(target.amount_paid) + value)} par paid ho jayegi. Agar
                  aage koi installment nahi hai to nayi balance installment banegi.
                </span>
              </span>
            </label>
          ) : null}
          {fullMode ? null : <Button
            className="w-full gap-1.5"
            disabled={collect.isPending || value <= 0 || overpay > otherBalance}
            onClick={() =>
              collect.mutate({
                id: target.id,
                received: value,
                carry: carry && value > 0 && value < dueDefault,
              })
            }
          >
            <Check className="h-4 w-4" />
            {collect.isPending ? "Saving…" : `Mark ${inr(value)} received`}
          </Button>}
          <p className="text-center text-xs text-muted-foreground">
            Receipt banega payment mark karne ke baad.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
