import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
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
import { inr, upiLink } from "@/lib/payments";
import { downloadReceipt, type ReceiptInput } from "@/lib/receipt";
import { getInstitute } from "@/lib/academy-settings";
import { openWhatsApp } from "@/lib/whatsapp";
import { feesApi } from "@/lib/api";
import { useRefreshLinked } from "@/hooks/use-refresh-linked";

export type PaymentTarget = {
  id: string;
  student_name: string;
  admission_no?: string | null;
  batch_name?: string | null;
  description?: string | null;
  amount: number;
  amount_paid: number;
  due_date?: string | null;
  paid_date?: string | null;
  receipt_no?: string | null;
  phone?: string | null;
};

export function PaymentDialog({
  target,
  onOpenChange,
}: {
  target: PaymentTarget | null;
  onOpenChange: (v: boolean) => void;
}) {
  const dueDefault = target ? Math.max(Number(target.amount) - Number(target.amount_paid), 0) : 0;
  const [amount, setAmount] = useState<string>("");
  const value = amount === "" ? dueDefault : Number(amount);
  const inst = getInstitute();
  const refresh = useRefreshLinked();

  const collect = useMutation({
    mutationFn: (v: { id: string; received: number }) => feesApi.collect(v.id, v.received, "upi"),
    onSuccess: () => {
      toast.success("Payment recorded");
      refresh();
      onOpenChange(false);
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
    batch_name: target.batch_name,
    description: target.description,
    amount: Number(target.amount),
    amount_paid: Number(target.amount_paid),
    due_date: target.due_date,
    paid_date: target.paid_date,
    method: "UPI / Cash",
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> Collect payment
          </DialogTitle>
          <DialogDescription>
            {target.student_name} · balance {inr(dueDefault)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount to collect</Label>
            <Input
              type="number"
              min={1}
              value={amount === "" ? String(dueDefault) : amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {link ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
              <QRCodeSVG value={link} size={168} includeMargin />
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
                  onClick={() => {
                    const msg = `Hello, please pay ${inr(value)} towards ${target.student_name}'s fees.\n\nUPI ID: ${inst.upi_id}\nPay link: ${link}\n\n— ${inst.name}`;
                    if (!openWhatsApp(target.phone, msg)) toast.error("No phone number on file.");
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Send on WhatsApp
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
            variant="secondary"
            className="w-full gap-1.5"
            onClick={() => {
              const no = downloadReceipt(receipt);
              toast.success(`Receipt ${no} downloaded`);
            }}
          >
            <Download className="h-4 w-4" /> Download receipt (PDF)
          </Button>

          <Button
            className="w-full gap-1.5"
            disabled={collect.isPending || value <= 0}
            onClick={() => collect.mutate({ id: target.id, received: value })}
          >
            <Check className="h-4 w-4" />
            {collect.isPending ? "Saving…" : `Mark ${inr(value)} received`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
