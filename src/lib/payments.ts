// UPI deep links + QR payload. Zero-cost: no payment gateway, money lands directly
// in the institute's UPI account. We only generate the intent link.

import { getInstitute } from "./academy-settings";

export type UpiRequest = {
  amount: number;
  note?: string;
  refId?: string;
};

export function upiLink({ amount, note, refId }: UpiRequest): string | null {
  const inst = getInstitute();
  const pa = (inst.upi_id ?? "").trim();
  if (!pa) return null;
  const params = new URLSearchParams({
    pa,
    pn: (inst.upi_name || inst.name || "Institute").trim(),
    cu: "INR",
  });
  if (amount > 0) params.set("am", amount.toFixed(2));
  if (note) params.set("tn", note.slice(0, 50));
  if (refId) params.set("tr", refId.replace(/[^A-Za-z0-9]/g, "").slice(0, 35));
  return `upi://pay?${params.toString()}`;
}

export function receiptNo(seed?: string | null): string {
  if (seed) return seed;
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RCPT-${stamp}-${rand}`;
}

export const inr = (n: number) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
