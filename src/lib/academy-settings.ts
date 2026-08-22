// Institute settings. Source of truth is the `institutes` table; localStorage is a
// synchronous cache so the whole UI can read settings without awaiting a query.

import { supabase } from "@/integrations/supabase/client";
import { WA_TEMPLATES, type WhatsAppTemplateKey } from "./whatsapp";
import { DEFAULT_PLAN, normalisePlan, type Installment } from "./installments";

export type Shift = { start: string; end: string; period: number };
export type Shifts = { morning: Shift; evening: Shift };

export type InstituteSettings = {
  name: string;
  slug: string; // used by the public admission link/QR so submissions land here
  tagline: string;
  address: string;
  phone: string;
  email: string;
  academic_year: string;
  primary_color: string; // hex like #4f46e5
  logo_url: string; // data URL of the institute logo (shown in app + receipts)
  upi_id: string; // e.g. institute@okhdfcbank — used for fee QR codes
  upi_name: string; // payee name shown in the UPI app
  shifts: Shifts; // timetable morning / evening windows
  installment_plan: Installment[]; // default fee installment schedule
  receipt_template: ReceiptTemplate; // layout used for fee receipts
  receipt_paper: ReceiptPaper; // physical paper used by downloaded/printed receipts
  plan: string; // plan key — decides whether institute branding is allowed
  custom_branding: boolean;
  attendance_devices: boolean;
};

export type ReceiptTemplate = "classic" | "compact" | "detailed";
export type ReceiptPaper = "a5" | "a4-two-up" | "thermal-80";
export const RECEIPT_TEMPLATES: { key: ReceiptTemplate; name: string; blurb: string }[] = [
  { key: "classic", name: "Classic", blurb: "A5 receipt with a coloured header band — the default." },
  { key: "compact", name: "Compact", blurb: "Half-page slip. Minimal ink, quick to print in bulk." },
  { key: "detailed", name: "Detailed", blurb: "A5 with fee summary, paid-so-far and balance lines." },
];

const KEY_INSTITUTE = "vk_institute";
const KEY_TEMPLATES = "vk_wa_templates";

export const DEFAULT_SHIFTS: Shifts = {
  morning: { start: "07:00", end: "11:00", period: 60 },
  evening: { start: "15:00", end: "19:00", period: 60 },
};

const DEFAULT_INSTITUTE: InstituteSettings = {
  name: "Your Institute",
  slug: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  academic_year: `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
  primary_color: "",
  logo_url: "",
  upi_id: "",
  upi_name: "",
  shifts: DEFAULT_SHIFTS,
  installment_plan: DEFAULT_PLAN,
  receipt_template: "classic",
  receipt_paper: "a5",
  plan: "free",
  custom_branding: false,
  attendance_devices: false,
};

const KEY_ACTIVE_UID = "vk_active_uid";

/** The cache is per signed-in account — never share branding across logins. */
function activeUid(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_ACTIVE_UID) ?? "";
}

function instituteKey(uid = activeUid()): string {
  return uid ? `${KEY_INSTITUTE}:${uid}` : KEY_INSTITUTE;
}

function safeRead<T>(key: string): Partial<T> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Partial<T>;
  } catch {
    return {};
  }
}

/** Drop every cached institute + branding (sign-out, account switch, superadmin). */
export function clearInstituteCache() {
  if (typeof window === "undefined") return;
  const drop: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && (k === KEY_INSTITUTE || k.startsWith(`${KEY_INSTITUTE}:`))) drop.push(k);
  }
  drop.forEach((k) => window.localStorage.removeItem(k));
  window.localStorage.removeItem(KEY_ACTIVE_UID);
  applyBranding("");
  window.dispatchEvent(new Event("vk-institute-changed"));
}

export function getInstitute(): InstituteSettings {
  const stored = safeRead<InstituteSettings>(instituteKey());
  return {
    ...DEFAULT_INSTITUTE,
    ...stored,
    shifts: {
      morning: { ...DEFAULT_SHIFTS.morning, ...(stored.shifts?.morning ?? {}) },
      evening: { ...DEFAULT_SHIFTS.evening, ...(stored.shifts?.evening ?? {}) },
    },
    installment_plan: normalisePlan(stored.installment_plan).length
      ? normalisePlan(stored.installment_plan)
      : DEFAULT_PLAN,
  };
}

function writeCache(s: InstituteSettings) {
  window.localStorage.setItem(instituteKey(), JSON.stringify(s));
  applyBranding(s.primary_color);
  window.dispatchEvent(new Event("vk-institute-changed"));
}

/** Persist to the caller's own institute row and refresh the local cache. */
export async function saveInstitute(s: InstituteSettings) {
  const { data: instituteId } = await supabase.rpc("current_institute_id");
  if (!instituteId) throw new Error("No institute is linked to this account.");
  writeCache(s);
  const { error } = await supabase
    .from("institutes")
    .update({
      name: s.name,
      tagline: s.tagline || null,
      address: s.address || null,
      phone: s.phone || null,
      email: s.email || null,
      academic_year: s.academic_year || null,
      primary_color: s.primary_color || null,
      logo_url: s.logo_url || null,
      upi_id: s.upi_id || null,
      upi_name: s.upi_name || null,
      shifts: s.shifts ?? DEFAULT_SHIFTS,
      installment_plan: (s.installment_plan?.length ? s.installment_plan : DEFAULT_PLAN) as unknown as never,
      receipt_template: s.receipt_template || "classic",
      receipt_paper: s.receipt_paper || "a5",
    })
    .eq("id", instituteId);
  if (error) throw error;
}

/**
 * Pull the signed-in user's own institute row into the local cache.
 * Team Academix (superadmin) has no institute — they keep the neutral theme.
 */
export async function hydrateInstitute() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) {
    clearInstituteCache();
    return;
  }
  if (activeUid() !== uid) {
    clearInstituteCache();
    window.localStorage.setItem(KEY_ACTIVE_UID, uid);
  }

  const { data: instituteId } = await supabase.rpc("current_institute_id");
  if (!instituteId) {
    // Superadmin or a not-yet-approved account: no institute branding at all.
    applyBranding("");
    window.dispatchEvent(new Event("vk-institute-changed"));
    return;
  }

  const { data } = await supabase
    .from("institutes")
    .select(
      "name, slug, tagline, address, phone, email, academic_year, primary_color, logo_url, upi_id, upi_name, shifts, installment_plan, receipt_template, receipt_paper, plan, custom_branding, attendance_devices",
    )
    .eq("id", instituteId)
    .maybeSingle();
  if (!data) return;
  writeCache({
    ...DEFAULT_INSTITUTE,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)),
  } as InstituteSettings);
}


export function getTemplates(): Record<WhatsAppTemplateKey, string> {
  const overrides = safeRead<Record<WhatsAppTemplateKey, string>>(KEY_TEMPLATES);
  return { ...WA_TEMPLATES, ...overrides };
}

export function saveTemplates(t: Record<WhatsAppTemplateKey, string>) {
  window.localStorage.setItem(KEY_TEMPLATES, JSON.stringify(t));
  window.dispatchEvent(new Event("vk-templates-changed"));
}

export function applyBranding(hex: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty("--primary");
    return;
  }
  root.style.setProperty("--primary", hex);
}

// Bootstrap branding on module load (client only)
if (typeof window !== "undefined") {
  applyBranding(getInstitute().primary_color);
}


/* ---------------- Branding entitlement ---------------------------------- */
// Own-brand receipts / payment QRs / portal marks are a paid feature. Free
// institutes get clean Academix branding instead.
const BRANDED_PLANS = new Set(["growth", "campus", "chain", "pro", "multi", "unlimited"]);

export function canUseOwnBranding(plan = getInstitute().plan): boolean {
  const inst = getInstitute();
  return inst.custom_branding || BRANDED_PLANS.has(String(plan || "free").toLowerCase());
}

/**
 * Institute settings with the brand fields collapsed to Academix when the
 * plan does not include white-labelling. Use this anywhere a logo or name is
 * printed on something a parent sees.
 */
export function getBrandedInstitute(): InstituteSettings {
  const inst = getInstitute();
  if (canUseOwnBranding(inst.plan)) return inst;
  return { ...inst, name: "Academix", logo_url: "", tagline: "Institute management, simplified" };
}
