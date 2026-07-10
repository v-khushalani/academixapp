// WhatsApp deep-link helpers. No API integration — opens wa.me link with a prefilled
// message so the sender can review before hitting send. Zero-cost by design.

export type WhatsAppTemplateKey = "fee_pending" | "fee_received" | "attendance_absent";

export type TemplateVars = {
  student_name?: string;
  parent_name?: string;
  batch_name?: string;
  amount?: string | number;
  amount_paid?: string | number;
  amount_due?: string | number;
  due_date?: string;
  paid_date?: string;
  receipt_no?: string;
  date?: string;
  academy_name?: string;
};

export const WA_TEMPLATES: Record<WhatsAppTemplateKey, string> = {
  fee_pending:
    "Hello {{parent_name}},\n\nThis is a friendly reminder that fees of ₹{{amount_due}} for {{student_name}} ({{batch_name}}) are pending. Kindly clear the dues by {{due_date}}.\n\nThank you,\n{{academy_name}}",
  fee_received:
    "Hello {{parent_name}},\n\nWe've received ₹{{amount_paid}} towards {{student_name}}'s fees on {{paid_date}}. Receipt #{{receipt_no}}.\n\nThank you,\n{{academy_name}}",
  attendance_absent:
    "Hello {{parent_name}},\n\n{{student_name}} was marked ABSENT for {{batch_name}} on {{date}}. Please share the reason at your earliest.\n\nRegards,\n{{academy_name}}",
};

export function renderTemplate(tpl: string, vars: TemplateVars): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: keyof TemplateVars) => {
    const v = vars[k];
    return v === undefined || v === null || v === "" ? "—" : String(v);
  });
}

// Normalise Indian phone numbers to international E.164-ish for wa.me.
// Strips spaces, dashes, parens, leading + or 0. Adds India country code 91 for 10-digit numbers.
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, "").replace(/^0+/, "");
  if (!digits) return null;
  if (digits.length === 10) return "91" + digits;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string | null {
  const p = normalisePhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string | null | undefined, message: string): boolean {
  const url = whatsappUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
